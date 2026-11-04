import { User } from "../models/userSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import { Commission } from "../models/commissionSchema.js";
import cron from "node-cron";
import { sendEmail } from "../utils/sendEmail.js";

export const verifyCommissionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const approvedProofs = await PaymentProof.find({ status: "Approved" });
      for (const candidate of approvedProofs) {
        try {
          // Claim atomically so a proof can only settle once.
          const proof = await PaymentProof.findOneAndUpdate(
            { _id: candidate._id, status: "Approved" },
            { $set: { status: "Settled" } },
            { new: true }
          );
          if (!proof) continue;

          // Subtract the paid amount, never going below zero.
          const user = await User.findByIdAndUpdate(
            proof.userId,
            [
              {
                $set: {
                  unpaidCommission: {
                    $max: [0, { $subtract: ["$unpaidCommission", proof.amount] }],
                  },
                },
              },
            ],
            { new: true }
          );
          if (!user) continue;

          await Commission.create({ amount: proof.amount, user: user._id });

          const settlementDate = new Date().toString().substring(0, 15);
          try {
            await sendEmail({
              email: user.email,
              subject: "Your Payment Has Been Successfully Verified And Settled",
              message: `Dear ${user.userName},

We are pleased to inform you that your recent payment has been successfully verified and settled. Thank you for promptly providing the necessary proof of payment. Your account has been updated, and you can now proceed with your activities on our platform without any restrictions.

Payment Details:
Amount Settled: ${proof.amount}
Unpaid Amount: ${user.unpaidCommission}
Date of Settlement: ${settlementDate}

Best regards,
BidBazaar Team`,
            });
          } catch (emailError) {
            console.error("Failed to send settlement email:", emailError.message);
          }
        } catch (error) {
          console.error(
            `Error processing commission proof ${candidate._id}: ${error.message}`
          );
        }
      }
    } catch (error) {
      console.error("Verify commission cron failed:", error);
    }
  });
};
