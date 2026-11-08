import mongoose from "mongoose";

const paymentProofSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  proof: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Approved", "Rejected", "Settled"],
  },
  amount: Number,
  comment: String,
  // Message from the admin (shown to the seller, e.g. why a proof was rejected).
  adminNote: { type: String, default: "" },
  reviewedAt: Date,
});

export const PaymentProof = mongoose.model("PaymentProof", paymentProofSchema);
