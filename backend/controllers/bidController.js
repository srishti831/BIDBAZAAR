import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  SNIPE_WINDOW_MS,
  getAuctionStatus,
  getMinIncrement,
  getMinNextBid,
} from "../utils/bidding.js";

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Fire-and-forget: a failing mailbox must never fail a bid.
const notifyOutbid = async (previousLeaderId, auction, newAmount) => {
  try {
    const previous = await User.findById(previousLeaderId).select("email userName");
    if (!previous) return;
    await sendEmail({
      email: previous.email,
      subject: `You've been outbid on "${auction.title}"`,
      message: `Hi ${previous.userName},

Someone just bid ${money(newAmount)} on "${auction.title}", which is more than your bid.

The auction ends ${new Date(auction.endTime).toString().substring(0, 24)}. Open BidBazaar and bid again to get back in front.

Good luck!
BidBazaar Team`,
    });
  } catch (error) {
    console.error("Outbid email failed:", error.message);
  }
};

export const placeBid = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction Item not found.", 404));
  }
  const bidder = req.user;

  if (auctionItem.createdBy.toString() === bidder._id.toString()) {
    return next(new ErrorHandler("You can't bid on your own auction.", 403));
  }
  const now = new Date();
  const status = getAuctionStatus(auctionItem, now);
  if (status === "upcoming") {
    return next(new ErrorHandler("This auction hasn't started yet.", 400));
  }
  if (status === "ended") {
    return next(new ErrorHandler("This auction has ended.", 400));
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return next(new ErrorHandler("Please place a valid bid amount.", 400));
  }
  if (
    auctionItem.highestBidder &&
    auctionItem.highestBidder.toString() === bidder._id.toString()
  ) {
    return next(new ErrorHandler("You already have the highest bid.", 400));
  }
  const minNextBid = getMinNextBid(auctionItem);
  if (amount < minNextBid) {
    return next(
      new ErrorHandler(`Your bid must be at least ${money(minNextBid)}.`, 400)
    );
  }

  const previousLeader = auctionItem.highestBidder;
  const entry = {
    userId: bidder._id,
    userName: bidder.userName,
    profileImage: bidder.profileImage?.url,
    amount,
    at: now,
  };

  // Optimistic concurrency: the write only succeeds if nobody bid since we
  // read the auction (currentBid is unchanged) and it is still running.
  const guard = {
    _id: id,
    currentBid: auctionItem.currentBid ? auctionItem.currentBid : { $in: [0, null] },
    startTime: { $lte: now },
    endTime: { $gt: now },
  };
  let updated = await Auction.findOneAndUpdate(
    { ...guard, "bids.userId": bidder._id },
    {
      $set: {
        currentBid: amount,
        highestBidder: bidder._id,
        "bids.$.amount": amount,
        "bids.$.at": now,
      },
    },
    { new: true }
  );
  if (!updated) {
    updated = await Auction.findOneAndUpdate(
      { ...guard, "bids.userId": { $ne: bidder._id } },
      {
        $set: { currentBid: amount, highestBidder: bidder._id },
        $push: { bids: entry },
      },
      { new: true }
    );
  }
  if (!updated) {
    return next(
      new ErrorHandler(
        "The price just changed — someone else bid first. Review the new minimum and bid again.",
        409
      )
    );
  }

  // Anti-sniping: a bid in the closing minutes pushes the end time back.
  const extended = await Auction.findOneAndUpdate(
    {
      _id: id,
      endTime: { $gt: now, $lt: new Date(now.getTime() + SNIPE_WINDOW_MS) },
    },
    {
      $set: { endTime: new Date(now.getTime() + SNIPE_WINDOW_MS) },
      $inc: { extensions: 1 },
    },
    { new: true }
  );
  if (extended) updated = extended;

  // Keep the Bid collection in sync (the settlement job reads it).
  await Bid.findOneAndUpdate(
    { "bidder.id": bidder._id, auctionItem: updated._id },
    {
      amount,
      bidder: {
        id: bidder._id,
        userName: bidder.userName,
        profileImage: bidder.profileImage?.url,
      },
      auctionItem: updated._id,
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  if (previousLeader && previousLeader.toString() !== bidder._id.toString()) {
    notifyOutbid(previousLeader, updated, amount);
  }

  res.status(201).json({
    success: true,
    message: extended
      ? "Bid placed — you're in front! The auction was extended by 2 minutes."
      : "Bid placed — you're in front!",
    currentBid: updated.currentBid,
    endTime: updated.endTime,
    minNextBid: getMinNextBid(updated),
    minIncrement: getMinIncrement(updated.currentBid),
    extended: !!extended,
  });
});

// Every auction the member has bid on, with where they currently stand.
export const getMyBids = catchAsyncErrors(async (req, res, next) => {
  const me = req.user._id.toString();
  const auctions = await Auction.find({ "bids.userId": req.user._id }).lean();
  const sellerIds = [...new Set(auctions.map((a) => a.createdBy.toString()))];
  const sellers = await User.find({ _id: { $in: sellerIds } })
    .select("userName email phone profileImage paymentMethods")
    .lean();
  const sellerById = Object.fromEntries(sellers.map((s) => [s._id.toString(), s]));

  const items = auctions.map(({ bids = [], ...rest }) => {
    const mine = bids.find((b) => b.userId.toString() === me);
    const status = getAuctionStatus(rest);
    const leading = rest.highestBidder && rest.highestBidder.toString() === me;
    let standing;
    if (status === "ended") standing = leading ? "won" : "lost";
    else standing = leading ? "leading" : "outbid";
    const seller = sellerById[rest.createdBy.toString()];
    return {
      ...rest,
      bidCount: bids.length,
      minNextBid: getMinNextBid(rest),
      myBid: mine?.amount || 0,
      standing,
      // The seller's contact + payout details are only revealed to the winner.
      seller:
        standing === "won" && seller
          ? {
              userName: seller.userName,
              email: seller.email,
              phone: seller.phone,
              paymentMethods: seller.paymentMethods,
            }
          : undefined,
    };
  });
  items.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  res.status(200).json({ success: true, items, serverTime: new Date() });
});
