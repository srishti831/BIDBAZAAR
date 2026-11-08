
import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import { COMMISSION_DUE_DAYS, COMMISSION_DUE_MS } from "../utils/bidding.js";
import { calculateCommission } from "../controllers/commissionController.js";
import {
  describeCommissionPayment,
  getCommissionPaymentInfo,
} from "../utils/platformSettings.js";

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const buildWinnerMessage = (bidder, auction, auctioneer, amount) => {
  const bank = auctioneer.paymentMethods?.bankTransfer || {};
  const paypal = auctioneer.paymentMethods?.paypal || {};
  const upi = auctioneer.paymentMethods?.upi || {};

  const dueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  )
    .toString()
    .substring(0, 15);

  const methods = [];

  if (bank.bankAccountNumber) {
    methods.push(`Bank transfer:
- Account name: ${bank.bankAccountName || "N/A"}
- Account number: ${bank.bankAccountNumber}
- IFSC: ${bank.ifscCode || "N/A"}
- Bank: ${bank.bankName || "N/A"}`);
  }

  if (upi.upiId) {
    methods.push(`UPI:
- Pay to: ${upi.upiId}`);
  }

  if (paypal.paypalEmail) {
    methods.push(`PayPal:
- Send payment to: ${paypal.paypalEmail}`);
  }

  const methodText = methods
    .map((text, index) => `${index + 1}. ${text}`)
    .join("\n\n");

  return `Dear ${bidder.userName},

Congratulations! You won "${auction.title}" with a bid of ${money(amount)}.

Before paying, contact the seller: ${auctioneer.email}${
    auctioneer.phone ? ` / ${auctioneer.phone}` : ""
  }

Pay using one of these methods:

${methodText || "The seller will share payment details with you."}

Cash on Delivery: if you prefer COD, pay 20% of the total up front using any method above and the remaining 80% on delivery. To inspect the item first, email the seller at ${auctioneer.email}.

Please complete your payment by ${dueDate}. Once the seller confirms it, the item will be shipped to you. You can see all your wins under "My Bids" on BidBazaar.

Thank you for bidding!

Best regards,
BidBazaar Team`;
};

const buildSellerMessage = (bidder, auction, auctioneer, amount, commission, adminPayment) =>
  `Dear ${auctioneer.userName},

Your auction "${auction.title}" has ended and sold for ${money(amount)}.

Winner: ${bidder.userName}
Email: ${bidder.email}
Phone: ${bidder.phone || "N/A"}
Address: ${bidder.address || "N/A"}

The winner has been emailed your payment details. Once you are paid, please pay the platform commission of ${money(commission)} (5%) within ${COMMISSION_DUE_DAYS} days to:

${adminPayment}

Then upload the payment screenshot under "Commission" on BidBazaar. New listings stay paused until the commission is paid and approved.

If the winner doesn't pay, you can republish the item for free from "My Listings".

Best regards,
BidBazaar Team`;

const buildNoBidsMessage = (auction, auctioneer) =>
  `Dear ${auctioneer.userName},

Your auction "${auction.title}" has ended without any bids.

You can republish it for free from "My Listings" on BidBazaar - try a lower starting price or a longer duration.

Best regards,
BidBazaar Team`;

// How long after the end time we keep retrying failed emails.
const RETRY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_NOTIFY_ATTEMPTS = 12;

const highestBid = async (auction) => {
  // The auction document is the source of truth for bids ...
  const fromAuction = (auction.bids || []).reduce(
    (best, bid) => (!best || bid.amount > best.amount ? bid : best),
    null
  );
  if (fromAuction) return { userId: fromAuction.userId, amount: fromAuction.amount };
  // ... the Bid collection is only a fallback for old data.
  const fromCollection = await Bid.findOne({ auctionItem: auction._id }).sort({ amount: -1 });
  if (fromCollection) {
    return { userId: fromCollection.bidder.id, amount: fromCollection.amount };
  }
  return null;
};

// Step 1: close every auction whose time is up (money + stats), exactly once.
export const settleEndedAuctions = async () => {
  const ended = await Auction.find({
    endTime: { $lt: new Date() },
    commissionCalculated: false,
  });

  for (const candidate of ended) {
    try {
      const top = await highestBid(candidate);

      // Claim atomically so the auction is never settled twice.
      const claimed = await Auction.findOneAndUpdate(
        { _id: candidate._id, commissionCalculated: false },
        {
          $set: {
            commissionCalculated: true,
            highestBidder: top ? top.userId : null,
            currentBid: top ? top.amount : 0,
            notify: {
              pending: true,
              winnerSent: !top, // nothing to send to a winner when nobody bid
              sellerSent: false,
              attempts: 0,
              lastError: "",
            },
          },
        },
        { new: true }
      );
      if (!claimed) continue;

      if (!top) {
        console.log("Auction ended with no bids:", claimed.title);
        continue;
      }

      await User.findByIdAndUpdate(top.userId, {
        $inc: { moneySpent: top.amount, auctionsWon: 1 },
      });
      const seller = await User.findByIdAndUpdate(
        claimed.createdBy,
        { $inc: { unpaidCommission: calculateCommission(top.amount) } },
        { new: true }
      );
      // The 7-day payment window starts with the first unpaid sale.
      if (seller && !seller.commissionDueAt) {
        await User.findByIdAndUpdate(seller._id, {
          $set: { commissionDueAt: new Date(Date.now() + COMMISSION_DUE_MS) },
        });
      }
      console.log("Auction settled:", claimed.title, "winning bid", top.amount);
    } catch (error) {
      console.error("Error settling auction", candidate._id.toString(), error);
    }
  }
};

// Step 2: send (and retry) the winner / seller emails of settled auctions.
// Each email is tracked on its own, so one failing never blocks the other.
export const sendPendingNotifications = async () => {
  const auctions = await Auction.find({
    "notify.pending": true,
    endTime: { $gt: new Date(Date.now() - RETRY_WINDOW_MS) },
  });

  for (const auction of auctions) {
    const state = auction.notify || {};
    const errors = [];
    let winnerSent = !!state.winnerSent;
    let sellerSent = !!state.sellerSent;

    try {
      const auctioneer = await User.findById(auction.createdBy);
      const hasWinner = !!auction.highestBidder && auction.currentBid > 0;
      const bidder = hasWinner ? await User.findById(auction.highestBidder) : null;
      const amount = auction.currentBid;

      if (!auctioneer) {
        errors.push("seller account not found");
        sellerSent = true;
      }
      if (hasWinner && !bidder) {
        errors.push("winner account not found");
        winnerSent = true;
      }

      if (!winnerSent && bidder && auctioneer) {
        try {
          await sendEmail({
            email: bidder.email,
            subject: `Congratulations! You won the auction for ${auction.title}`,
            message: buildWinnerMessage(bidder, auction, auctioneer, amount),
          });
          winnerSent = true;
        } catch (error) {
          errors.push(`winner email: ${error.message}`);
        }
      }

      if (!sellerSent && auctioneer) {
        try {
          if (bidder) {
            const adminPayment = describeCommissionPayment(await getCommissionPaymentInfo());
            await sendEmail({
              email: auctioneer.email,
              subject: `Your auction "${auction.title}" sold for ${money(amount)}`,
              message: buildSellerMessage(
                bidder,
                auction,
                auctioneer,
                amount,
                calculateCommission(amount),
                adminPayment
              ),
            });
          } else {
            await sendEmail({
              email: auctioneer.email,
              subject: `Your auction "${auction.title}" ended with no bids`,
              message: buildNoBidsMessage(auction, auctioneer),
            });
          }
          sellerSent = true;
        } catch (error) {
          errors.push(`seller email: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(error.message);
    }

    const attempts = (state.attempts || 0) + 1;
    const done = (winnerSent && sellerSent) || attempts >= MAX_NOTIFY_ATTEMPTS;
    await Auction.updateOne(
      { _id: auction._id },
      {
        $set: {
          "notify.winnerSent": winnerSent,
          "notify.sellerSent": sellerSent,
          "notify.attempts": attempts,
          "notify.lastError": errors.join(" | ").slice(0, 500),
          "notify.pending": !done,
        },
      }
    );
    if (errors.length) {
      console.error(
        `Notification problem for "${auction.title}" (attempt ${attempts}):`,
        errors.join(" | ")
      );
    }
  }
};

let running = false;
export const runSettlement = async () => {
  // Never let two runs overlap (a slow email must not cause double processing).
  if (running) return;
  running = true;
  try {
    await settleEndedAuctions();
    await sendPendingNotifications();
  } catch (error) {
    console.error("Ended auction settlement failed:", error);
  } finally {
    running = false;
  }
};

// Called when people browse auctions: if the server was asleep and missed the
// cron, the first visitor still triggers settlement (at most every 30 seconds).
let lastLazyRun = 0;
export const runSettlementThrottled = () => {
  if (Date.now() - lastLazyRun < 30000) return;
  lastLazyRun = Date.now();
  runSettlement();
};

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", runSettlement);
};
