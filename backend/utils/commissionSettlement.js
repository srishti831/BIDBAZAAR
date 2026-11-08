import { PaymentProof } from "../models/commissionProofSchema.js";
import { Commission } from "../models/commissionSchema.js";
import { User } from "../models/userSchema.js";
import { sendEmail } from "./sendEmail.js";

const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Applies one approved proof to the seller's balance. Safe to call twice: the
// proof is claimed atomically (Approved -> Settled) so it is only ever applied
// once, whether the admin's click or the background job gets there first.
export const settleApprovedProof = async (proofId) => {
  const proof = await PaymentProof.findOneAndUpdate(
    { _id: proofId, status: "Approved" },
    { $set: { status: "Settled" } },
    { new: true }
  );
  if (!proof) return null;

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
  if (!user) return proof;
  if (user.unpaidCommission <= 0 && user.commissionDueAt) {
    await User.findByIdAndUpdate(user._id, { $unset: { commissionDueAt: 1 } });
  }

  await Commission.create({ amount: proof.amount, user: user._id });

  try {
    await sendEmail({
      email: user.email,
      subject: "Your commission payment has been approved",
      message: `Dear ${user.userName},

Your commission payment of ${money(proof.amount)} has been verified and settled.

Remaining commission to pay: ${money(user.unpaidCommission)}
Date: ${new Date().toDateString()}
${
  user.unpaidCommission > 0
    ? "\nYou still owe some commission. New listings stay paused until it is fully paid."
    : "\nYour balance is clear - you can list new auctions again."
}

Best regards,
BidBazaar Team`,
    });
  } catch (error) {
    console.error("Failed to send settlement email:", error.message);
  }
  return proof;
};

export const notifyProofRejected = async (proof) => {
  try {
    const user = await User.findById(proof.userId).select("email userName");
    if (!user) return;
    await sendEmail({
      email: user.email,
      subject: "Your commission payment proof was not accepted",
      message: `Dear ${user.userName},

We could not verify your commission payment proof of ${money(proof.amount)}.
${proof.adminNote ? `\nReason from the admin: ${proof.adminNote}\n` : ""}
Please check the payment details on BidBazaar > Commission and upload a clear screenshot of the payment again.

Best regards,
BidBazaar Team`,
    });
  } catch (error) {
    console.error("Failed to send rejection email:", error.message);
  }
};
