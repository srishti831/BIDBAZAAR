import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { runSettlementThrottled } from "../automation/endedAuctionCron.js";
import { isRealImage } from "../utils/imageCheck.js";
import {
  AUCTION_CATEGORIES,
  MAX_ACTIVE_LISTINGS,
  getAuctionStatus,
  getMinIncrement,
  getMinNextBid,
  hasPayoutDetails,
  isCommissionOverdue,
  resolveSchedule,
} from "../utils/bidding.js";

// List views never need the full bid array (it also holds user ids).
export const toListItem = ({ bids = [], ...rest }, viewerId = null) => ({
  ...rest,
  // Only reveal "you are leading" to the leader themselves.
  highestBidder:
    viewerId && rest.highestBidder && String(rest.highestBidder) === String(viewerId)
      ? rest.highestBidder
      : null,
  notify: undefined,
  bidCount: bids.length,
  minNextBid: getMinNextBid(rest),
});

const assertCanList = async (user) => {
  if (!hasPayoutDetails(user)) {
    return new ErrorHandler(
      "Add your payout details (bank, UPI or PayPal) in your profile before listing an item, so winners know where to pay.",
      403
    );
  }
  if (Number(user.unpaidCommission) > 0) {
    return new ErrorHandler(
      isCommissionOverdue(user)
        ? "Your commission is overdue. Pay it from the Commission page before posting a new auction."
        : "You have unpaid commissions. Pay them from the Commission page before posting a new auction.",
      403
    );
  }
  // An auction that just ended is still being settled: its commission is not
  // on the account yet, so wait for it instead of slipping a new listing in.
  const unsettled = await Auction.countDocuments({
    createdBy: user._id,
    endTime: { $lte: new Date() },
    commissionCalculated: false,
    "bids.0": { $exists: true },
  });
  if (unsettled > 0) {
    return new ErrorHandler(
      "One of your auctions has just ended and is being settled. Try again in a minute.",
      400
    );
  }
  const active = await Auction.countDocuments({
    createdBy: user._id,
    endTime: { $gt: new Date() },
  });
  if (active >= MAX_ACTIVE_LISTINGS) {
    return new ErrorHandler(
      `You can have up to ${MAX_ACTIVE_LISTINGS} upcoming or live auctions at a time.`,
      400
    );
  }
  return null;
};

export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next(new ErrorHandler("Auction item image required.", 400));
  }
  const { image } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(image.mimetype) || !(await isRealImage(image))) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const { title, description, category, condition, startingBid, startTime, endTime, startNow } =
    req.body || {};
  if (!title || !description || !category || !condition || !startingBid) {
    return next(new ErrorHandler("Please provide all details.", 400));
  }
  if (String(title).length > 120) {
    return next(new ErrorHandler("Title is too long (max 120 characters).", 400));
  }
  if (String(description).length > 3000) {
    return next(new ErrorHandler("Description is too long (max 3000 characters).", 400));
  }
  if (!AUCTION_CATEGORIES.includes(category)) {
    return next(new ErrorHandler("Invalid category.", 400));
  }
  if (!["New", "Used"].includes(condition)) {
    return next(new ErrorHandler("Invalid condition.", 400));
  }
  const startingBidNumber = Number(startingBid);
  if (!Number.isFinite(startingBidNumber) || startingBidNumber <= 0) {
    return next(new ErrorHandler("Starting bid must be a positive number.", 400));
  }
  const schedule = resolveSchedule({ startTime, endTime, startNow });
  if (schedule.error) {
    return next(new ErrorHandler(schedule.error, 400));
  }
  const listingError = await assertCanList(req.user);
  if (listingError) return next(listingError);

  const cloudinaryResponse = await cloudinary.uploader.upload(image.tempFilePath, {
    folder: "AUCTION_APP/auctions",
  });
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse?.error || "Unknown cloudinary error."
    );
    return next(new ErrorHandler("Failed to upload auction image to cloudinary.", 500));
  }
  const auctionItem = await Auction.create({
    title: String(title).trim(),
    description: String(description).trim(),
    category,
    condition,
    startingBid: startingBidNumber,
    startTime: schedule.start,
    endTime: schedule.end,
    image: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    createdBy: req.user._id,
  });
  const startsNow = schedule.start <= new Date();
  return res.status(201).json({
    success: true,
    message: startsNow
      ? "Your auction is live!"
      : `Auction scheduled. It goes live on ${schedule.start.toLocaleString()}.`,
    auctionItem,
  });
});

export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  // Settle anything that ended even if the cron could not run (e.g. a sleeping server).
  runSettlementThrottled();
  const items = await Auction.find().sort({ createdAt: -1 }).limit(300).lean();
  res.status(200).json({
    success: true,
    items: items.map((item) => toListItem(item, req.user?._id)),
    serverTime: new Date(),
  });
});

export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const auction = await Auction.findById(id);
  if (!auction) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  const viewer = req.user || null;
  const isOwner = !!viewer && auction.createdBy.toString() === viewer._id.toString();
  const isAdmin = viewer?.role === "Super Admin";
  const status = getAuctionStatus(auction);

  const plain = auction.toObject();
  // Public page: show who bid and how much, never account ids.
  const bidders = [...plain.bids]
    .sort((a, b) => b.amount - a.amount)
    .map(({ userId, ...bid }) => ({
      ...bid,
      mine: !!viewer && !!userId && String(userId) === viewer._id.toString(),
    }));
  delete plain.bids;
  // The page only needs to know whether the viewer is the leader.
  plain.highestBidder =
    viewer && auction.highestBidder && String(auction.highestBidder) === viewer._id.toString()
      ? viewer._id
      : null;
  delete plain.notify;
  runSettlementThrottled();

  const seller = await User.findById(auction.createdBy).select("userName profileImage");

  // Once it is over, only the seller (and admins) see who won and how to reach them.
  let winner = null;
  if (status === "ended" && auction.highestBidder && (isOwner || isAdmin)) {
    winner = await User.findById(auction.highestBidder).select(
      "userName email phone address profileImage"
    );
  }

  res.status(200).json({
    success: true,
    auctionItem: { ...plain, bidCount: bidders.length },
    bidders,
    seller,
    winner,
    isOwner,
    status,
    minNextBid: getMinNextBid(auction),
    minIncrement: getMinIncrement(auction.currentBid),
    serverTime: new Date(),
  });
});

export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({ createdBy: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  const withStats = items.map((item) => {
    const top = (item.bids || []).reduce(
      (best, bid) => (!best || bid.amount > best.amount ? bid : best),
      null
    );
    return { ...toListItem(item, req.user._id), leadingBidder: top?.userName || null };
  });
  res.status(200).json({
    success: true,
    items: withStats,
    serverTime: new Date(),
  });
});

export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  if (auctionItem.createdBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You can only delete your own auctions.", 403));
  }
  const status = getAuctionStatus(auctionItem);
  if (status === "live" && auctionItem.bids.length > 0) {
    return next(new ErrorHandler("You cannot delete a running auction that has bids.", 400));
  }
  if (status === "ended" && auctionItem.bids.length > 0) {
    return next(
      new ErrorHandler(
        "A sold auction can't be deleted - the winner needs its details and the commission record stays.",
        400
      )
    );
  }
  await Bid.deleteMany({ auctionItem: auctionItem._id });
  await User.updateMany({ watchlist: auctionItem._id }, { $pull: { watchlist: auctionItem._id } });
  if (auctionItem.image?.public_id) {
    cloudinary.uploader
      .destroy(auctionItem.image.public_id)
      .catch((err) => console.error("Cloudinary cleanup failed:", err.message));
  }
  await auctionItem.deleteOne();
  res.status(200).json({
    success: true,
    message: "Auction item deleted successfully.",
  });
});

export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  let auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  if (auctionItem.createdBy.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You can only republish your own auctions.", 403));
  }
  if (new Date(auctionItem.endTime) > new Date()) {
    return next(
      new ErrorHandler(
        "This auction hasn't ended yet. You can republish it once it is over.",
        400
      )
    );
  }
  // Only items that did NOT sell can be republished. Re-opening a sold item
  // would let a seller take the buyer's money off-platform and erase the commission.
  if (auctionItem.bids.length > 0 || auctionItem.currentBid > 0) {
    return next(
      new ErrorHandler(
        "This item received bids, so it counts as sold and can't be republished. Create a new listing instead.",
        400
      )
    );
  }

  const body = req.body || {};
  const schedule = resolveSchedule({
    startTime: body.startTime,
    endTime: body.endTime,
    startNow: body.startNow,
  });
  if (schedule.error) {
    return next(new ErrorHandler(schedule.error, 400));
  }
  let newStartingBid = auctionItem.startingBid;
  if (body.startingBid !== undefined && body.startingBid !== "") {
    newStartingBid = Number(body.startingBid);
    if (!Number.isFinite(newStartingBid) || newStartingBid <= 0) {
      return next(new ErrorHandler("Starting bid must be a positive number.", 400));
    }
  }
  const listingError = await assertCanList(req.user);
  if (listingError) return next(listingError);

  await Bid.deleteMany({ auctionItem: auctionItem._id });
  auctionItem = await Auction.findByIdAndUpdate(
    id,
    {
      $set: {
        startTime: schedule.start,
        endTime: schedule.end,
        startingBid: newStartingBid,
        bids: [],
        commissionCalculated: false,
        currentBid: 0,
        highestBidder: null,
        extensions: 0,
        notify: { pending: false, winnerSent: false, sellerSent: false, attempts: 0, lastError: "" },
      },
    },
    { new: true, runValidators: true }
  );
  const startsNow = schedule.start <= new Date();
  res.status(200).json({
    success: true,
    auctionItem,
    message: startsNow
      ? "Auction republished and live now!"
      : `Auction republished. It goes live on ${schedule.start.toLocaleString()}.`,
  });
});
