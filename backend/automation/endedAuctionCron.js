import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateCommission } from "../controllers/commissionController.js";

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const buildWinnerMessage = (bidder, auction, auctioneer, amount) => {
  const bank = auctioneer.paymentMethods?.bankTransfer || {};
  const paypal = auctioneer.paymentMethods?.paypal || {};
  const upi = auctioneer.paymentMethods?.upi || {};
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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
  if (upi.upiId) methods.push(`UPI:\n- Pay to: ${upi.upiId}`);
  if (paypal.paypalEmail) methods.push(`PayPal:\n- Send payment to: ${paypal.paypalEmail}`);
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

const buildSellerMessage = (bidder, auction, auctioneer, amount, commission) =>
  `Dear ${auctioneer.userName},

Your auction "${auction.title}" has ended and sold for ${money(amount)}.

Winner: ${bidder.userName}
Email: ${bidder.email}
Phone: ${bidder.phone || "N/A"}
Address: ${bidder.address || "N/A"}

The winner has been emailed your payment details. Once you are paid, please pay the platform commission of ${money(commission)} (5%) and upload the proof under "Commission" on BidBazaar.

If the winner doesn't pay, you can republish the item for free from "My Listings".

Best regards,
BidBazaar Team`;

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const endedAuctions = await Auction.find({
        endTime: { $lt: new Date() },
        commissionCalculated: false,
      });

      for (const candidate of endedAuctions) {
        try {
          // Claim the auction atomically so it is never processed twice.
          const auction = await Auction.findOneAndUpdate(
            { _id: candidate._id, commissionCalculated: false },
            { $set: { commissionCalculated: true } },
            { new: true }
          );
          if (!auction) continue;

          const topBid = await Bid.findOne({ auctionItem: auction._id }).sort({
            amount: -1,
          });
          if (!topBid) continue; // nobody bid, nothing to charge

          const commissionAmount = calculateCommission(topBid.amount);
          auction.highestBidder = topBid.bidder.id;
          await auction.save();

          const bidder = await User.findByIdAndUpdate(
            topBid.bidder.id,
            { $inc: { moneySpent: topBid.amount, auctionsWon: 1 } },
            { new: true }
          );
          const auctioneer = await User.findByIdAndUpdate(
            auction.createdBy,
            { $inc: { unpaidCommission: commissionAmount } },
            { new: true }
          );
          if (!bidder || !auctioneer) continue;

          try {
            await sendEmail({
              email: bidder.email,
              subject: `Congratulations! You won the auction for ${auction.title}`,
              message: buildWinnerMessage(bidder, auction, auctioneer, topBid.amount),
            });
          } catch (emailError) {
            console.error("Failed to email auction winner:", emailError.message);
          }
          try {
            await sendEmail({
              email: auctioneer.email,
              subject: `Your auction "${auction.title}" sold for ${money(topBid.amount)}`,
              message: buildSellerMessage(
                bidder,
                auction,
                auctioneer,
                topBid.amount,
                commissionAmount
              ),
            });
          } catch (emailError) {
            console.error("Failed to email seller:", emailError.message);
          }
        } catch (error) {
          console.error("Error processing ended auction:", error);
        }
      }
    } catch (error) {
      console.error("Ended auction cron failed:", error);
    }
  });
};
