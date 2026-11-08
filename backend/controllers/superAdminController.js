import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Commission } from "../models/commissionSchema.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import {
  getCommissionPaymentInfo,
  hasCommissionPaymentDetails,
  saveCommissionPaymentInfo,
} from "../utils/platformSettings.js";
import { notifyProofRejected, settleApprovedProof } from "../utils/commissionSettlement.js";

export const deleteAuctionItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  const liveNow =
    new Date(auctionItem.startTime) <= new Date() && new Date(auctionItem.endTime) > new Date();
  if (liveNow && auctionItem.bids.length > 0) {
    return next(
      new ErrorHandler("This auction is live and has bids. Wait until it ends before deleting it.", 400)
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

export const getAllPaymentProofs = catchAsyncErrors(async (req, res, next) => {
  const paymentProofs = await PaymentProof.find()
    .sort({ uploadedAt: -1 })
    .populate("userId", "userName email")
    .lean();
  // Keep `userId` a plain id for the existing UI, and add readable owner info.
  const shaped = paymentProofs.map((proof) => ({
    ...proof,
    userId: proof.userId?._id || proof.userId,
    user: proof.userId?.userName
      ? { userName: proof.userId.userName, email: proof.userId.email }
      : null,
  }));
  res.status(200).json({
    success: true,
    paymentProofs: shaped,
  });
});

export const getPaymentProofDetail = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid ID format.", 400));
    }
    const paymentProofDetail = await PaymentProof.findById(id);
    if (!paymentProofDetail) {
      return next(new ErrorHandler("Payment proof not found.", 404));
    }
    res.status(200).json({
      success: true,
      paymentProofDetail,
    });
  }
);

export const updateProofStatus = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const amount = Number(req.body?.amount);
  const adminNote = String(req.body?.adminNote || "").trim().slice(0, 300);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID format.", 400));
  }
  if (!["Pending", "Approved", "Rejected"].includes(status)) {
    return next(
      new ErrorHandler("Choose Pending, Approved or Rejected. Settling happens automatically.", 400)
    );
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return next(new ErrorHandler("Invalid amount.", 400));
  }
  let proof = await PaymentProof.findById(id);
  if (!proof) {
    return next(new ErrorHandler("Payment proof not found.", 404));
  }
  if (proof.status === "Settled") {
    return next(new ErrorHandler("This payment proof is already settled.", 400));
  }
  if (status === "Approved") {
    if (amount <= 0) {
      return next(new ErrorHandler("Enter the amount you received to approve.", 400));
    }
    const owner = await User.findById(proof.userId).select("unpaidCommission");
    if (!owner) {
      return next(new ErrorHandler("The member who sent this proof no longer exists.", 404));
    }
    if (amount > owner.unpaidCommission + 0.009) {
      return next(
        new ErrorHandler(
          `This member only owes ₹${owner.unpaidCommission}. Lower the amount to approve.`,
          400
        )
      );
    }
  }

  proof = await PaymentProof.findByIdAndUpdate(
    id,
    { status, amount, adminNote, reviewedAt: new Date() },
    { new: true, runValidators: true }
  );

  let message = "Payment proof updated.";
  if (status === "Approved") {
    // Apply it right now: balance reduced, member emailed, revenue recorded.
    await settleApprovedProof(proof._id);
    proof = await PaymentProof.findById(id);
    message = "Payment approved and applied to the seller's balance. They can list again if fully paid.";
  } else if (status === "Rejected") {
    await notifyProofRejected(proof);
    message = "Payment proof rejected. The seller has been emailed.";
  }
  res.status(200).json({ success: true, message, proof });
});

export const deletePaymentProof = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID format.", 400));
  }
  const proof = await PaymentProof.findById(id);
  if (!proof) {
    return next(new ErrorHandler("Payment proof not found.", 404));
  }
  await proof.deleteOne();
  res.status(200).json({
    success: true,
    message: "Payment proof deleted.",
  });
});

const toMonthlyArray = (items, valueKey, totalMonths = 12) => {
  const result = Array(totalMonths).fill(0);
  items.forEach((item) => {
    result[item.month - 1] = item[valueKey];
  });
  return result;
};

const currentYearRange = () => {
  const year = new Date().getUTCFullYear();
  return {
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year + 1, 0, 1)),
  };
};

export const fetchAllUsers = catchAsyncErrors(async (req, res, next) => {
  const { from, to } = currentYearRange();
  const users = await User.aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, role: "$role" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        month: "$_id.month",
        role: "$_id.role",
        count: 1,
        _id: 0,
      },
    },
    { $sort: { month: 1 } },
  ]);

  // Everyone is a "User" now; legacy Bidder/Auctioneer accounts count too.
  const members = users.filter((user) => user.role !== "Super Admin");
  const perMonth = Array(12).fill(0);
  members.forEach((row) => {
    perMonth[row.month - 1] += row.count;
  });

  res.status(200).json({
    success: true,
    usersArray: perMonth,
  });
});

export const monthlyRevenue = catchAsyncErrors(async (req, res, next) => {
  const { from, to } = currentYearRange();
  const payments = await Commission.aggregate([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $project: { month: "$_id.month", totalAmount: 1, _id: 0 } },
    { $sort: { month: 1 } },
  ]);

  res.status(200).json({
    success: true,
    totalMonthlyRevenue: toMonthlyArray(payments, "totalAmount"),
  });
});

export const platformStats = catchAsyncErrors(async (req, res, next) => {
  const now = new Date();
  const [users, auctions, live, upcoming, pendingProofs, owed] = await Promise.all([
    User.countDocuments({ role: { $ne: "Super Admin" } }),
    Auction.countDocuments(),
    Auction.countDocuments({ startTime: { $lte: now }, endTime: { $gt: now } }),
    Auction.countDocuments({ startTime: { $gt: now } }),
    PaymentProof.countDocuments({ status: "Pending" }),
    User.aggregate([{ $group: { _id: null, total: { $sum: "$unpaidCommission" } } }]),
  ]);
  res.status(200).json({
    success: true,
    stats: {
      users,
      auctions,
      live,
      upcoming,
      pendingProofs,
      unpaidCommission: owed[0]?.total || 0,
    },
  });
});

// ----- Where sellers pay the platform commission -----
export const getPaymentSettings = catchAsyncErrors(async (req, res, next) => {
  const paymentInfo = await getCommissionPaymentInfo();
  res.status(200).json({
    success: true,
    paymentInfo,
    configured: hasCommissionPaymentDetails(paymentInfo),
  });
});

export const updatePaymentSettings = catchAsyncErrors(async (req, res, next) => {
  const body = req.body || {};
  const upiId = String(body.upiId || "").trim();
  const paypalEmail = String(body.paypalEmail || "").trim();
  const bankAccountNumber = String(body.bankAccountNumber || "").trim();
  const bankName = String(body.bankName || "").trim();
  if (upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
    return next(new ErrorHandler("Please enter a valid UPI ID (name@bank).", 400));
  }
  if (paypalEmail && !/^\S+@\S+\.\S+$/.test(paypalEmail)) {
    return next(new ErrorHandler("Please enter a valid PayPal email.", 400));
  }
  if (bankAccountNumber && !/^\d{6,20}$/.test(bankAccountNumber)) {
    return next(new ErrorHandler("Bank account number must be 6-20 digits.", 400));
  }
  if (bankAccountNumber && (!bankName || !String(body.bankAccountName || "").trim())) {
    return next(new ErrorHandler("For bank transfer add the bank name and account holder too.", 400));
  }
  const paymentInfo = await saveCommissionPaymentInfo(body);
  if (!hasCommissionPaymentDetails(paymentInfo)) {
    return next(
      new ErrorHandler("Add at least one way for sellers to pay you: UPI, bank account or PayPal.", 400)
    );
  }
  res.status(200).json({
    success: true,
    message: "Payment details saved. Sellers can now see them on the Commission page.",
    paymentInfo,
  });
});
