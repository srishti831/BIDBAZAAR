import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import {
  getAdminEmails,
  getCommissionPaymentInfo,
  hasCommissionPaymentDetails,
  isDemoMode,
} from "../utils/platformSettings.js";
import { sendEmail } from "../utils/sendEmail.js";
import { isRealImage } from "../utils/imageCheck.js";

export const COMMISSION_RATE = 0.05;

// Commission owed to the platform for a sale at `amount`.
export const calculateCommission = (amount) => {
  return Math.round(Number(amount) * COMMISSION_RATE * 100) / 100;
};

export const proofOfCommission = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || !req.files.proof) {
    return next(new ErrorHandler("Payment Proof Screenshot required.", 400));
  }
  const { proof } = req.files;
  const { comment } = req.body || {};
  const amount = Number(req.body?.amount);
  const user = await User.findById(req.user._id);

  if (!Number.isFinite(amount) || amount <= 0 || !comment) {
    return next(
      new ErrorHandler("A valid amount & comment are required fields.", 400)
    );
  }

  if (user.unpaidCommission === 0) {
    return res.status(200).json({
      success: true,
      message: "You don't have any unpaid commissions.",
    });
  }

  // Money already submitted and waiting for review must not be counted twice.
  const waiting = await PaymentProof.aggregate([
    { $match: { userId: user._id, status: { $in: ["Pending", "Approved"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const awaitingReview = waiting[0]?.total || 0;
  if (awaitingReview + amount > user.unpaidCommission + 0.009) {
    const left = Math.max(0, user.unpaidCommission - awaitingReview);
    return next(
      new ErrorHandler(
        left > 0
          ? `You already have payments awaiting review. You can submit proof for at most ₹${left} more.`
          : "Your earlier payment proof is still awaiting admin review. Please wait for it to be approved.",
        400
      )
    );
  }

  if (user.unpaidCommission < amount) {
    return next(
      new ErrorHandler(
        `The amount exceeds your unpaid commission balance. Please enter an amount up to ${user.unpaidCommission}`,
        403
      )
    );
  }

  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(proof.mimetype) || !(await isRealImage(proof))) {
    return next(new ErrorHandler("ScreenShot format not supported.", 400));
  }

  const cloudinaryResponse = await cloudinary.uploader.upload(
    proof.tempFilePath,
    {
      folder: "AUCTION_APP/payment-proofs",
    }
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse?.error || "Unknown cloudinary error."
    );
    return next(new ErrorHandler("Failed to upload payment proof.", 500));
  }
  const commissionProof = await PaymentProof.create({
    userId: req.user._id,
    proof: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
    amount,
    comment,
  });
  // Tell the admin(s) a proof is waiting (never fail the upload because of mail).
  getAdminEmails()
    .then((emails) =>
      Promise.all(
        emails.map((email) =>
          sendEmail({
            email,
            subject: `New commission proof from ${user.userName} (₹${amount})`,
            message: `${user.userName} (${user.email}) submitted a commission payment proof of ₹${amount}.\n\nNote: ${comment}\n\nOpen the BidBazaar dashboard > Payment proofs to review it.`,
          }).catch((err) => console.error("Admin notification failed:", err.message))
        )
      )
    )
    .catch((err) => console.error("Admin notification failed:", err.message));

  res.status(201).json({
    success: true,
    message:
      "Your proof has been submitted successfully. We will review it and respond to you within 24 hours.",
    commissionProof,
  });
});

// The seller's own commission picture: what they owe and every proof they sent.
export const getMyCommission = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const proofs = await PaymentProof.find({ userId: req.user._id }).sort({
    uploadedAt: -1,
  });
  res.status(200).json({
    success: true,
    unpaidCommission: user.unpaidCommission,
    commissionRate: COMMISSION_RATE,
    proofs,
  });
});

// Where sellers must send the platform commission (set by the admin).
export const getPaymentInfo = catchAsyncErrors(async (req, res, next) => {
  const paymentInfo = await getCommissionPaymentInfo();
  res.status(200).json({
    success: true,
    paymentInfo,
    configured: hasCommissionPaymentDetails(paymentInfo),
    demo: isDemoMode(),
    dueDays: 7,
  });
});
