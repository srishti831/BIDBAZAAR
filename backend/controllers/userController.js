import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { generateToken, cookieOptions } from "../utils/jwtToken.js";
import { hasPayoutDetails } from "../utils/bidding.js";

const ALLOWED_IMAGES = ["image/png", "image/jpeg", "image/webp"];

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || !req.files.profileImage) {
    return next(new ErrorHandler("Profile Image Required.", 400));
  }
  const { profileImage } = req.files;
  if (!ALLOWED_IMAGES.includes(profileImage.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const { userName, email, password, phone, address } = req.body || {};
  if (!userName || !email || !phone || !password || !address) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }
  const isRegistered = await User.findOne({ email: email.toLowerCase().trim() });
  if (isRegistered) {
    return next(new ErrorHandler("User already registered.", 400));
  }
  const cloudinaryResponse = await cloudinary.uploader.upload(
    profileImage.tempFilePath,
    { folder: "AUCTION_APP/users" }
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary error:",
      cloudinaryResponse?.error || "Unknown cloudinary error."
    );
    return next(
      new ErrorHandler("Failed to upload profile image to cloudinary.", 500)
    );
  }
  // Everyone registers the same way; payout details are only asked for later,
  // when (and if) the member decides to sell something.
  const user = await User.create({
    userName,
    email,
    password,
    phone,
    address,
    role: "User",
    profileImage: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
  });
  generateToken(user, "Welcome to BidBazaar! Your account is ready.", 201, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );
  if (!user) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }
  generateToken(user, "Login successfully.", 200, res);
});

export const getProfile = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      ...cookieOptions(),
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Logout Successfully.",
    });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { userName, phone, address } = req.body || {};
  const user = await User.findById(req.user._id);

  if (userName !== undefined) user.userName = String(userName).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  if (address !== undefined) user.address = String(address).trim();
  if (!user.userName || !user.address) {
    return next(new ErrorHandler("Name and address cannot be empty.", 400));
  }

  const newImage = req.files?.profileImage;
  if (newImage) {
    if (!ALLOWED_IMAGES.includes(newImage.mimetype)) {
      return next(new ErrorHandler("File format not supported.", 400));
    }
    const uploaded = await cloudinary.uploader.upload(newImage.tempFilePath, {
      folder: "AUCTION_APP/users",
    });
    const oldId = user.profileImage?.public_id;
    user.profileImage = {
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    };
    if (oldId && oldId !== "admin-default") {
      cloudinary.uploader
        .destroy(oldId)
        .catch((err) => console.error("Cloudinary cleanup failed:", err.message));
    }
  }
  await user.save(); // runs the schema validators (e.g. 10-digit phone)
  res.status(200).json({
    success: true,
    message: "Profile updated.",
    user,
  });
});

// Where winners should send money. Required only before listing an item.
export const updatePayout = catchAsyncErrors(async (req, res, next) => {
  const clean = (value) => (value ? String(value).trim() : "");
  const body = req.body || {};
  const bankName = clean(body.bankName);
  const bankAccountName = clean(body.bankAccountName);
  const bankAccountNumber = clean(body.bankAccountNumber);
  const ifscCode = clean(body.ifscCode).toUpperCase();
  const paypalEmail = clean(body.paypalEmail).toLowerCase();
  const upiId = clean(body.upiId);

  const anyBankField = bankName || bankAccountName || bankAccountNumber || ifscCode;
  if (anyBankField && !(bankName && bankAccountName && bankAccountNumber)) {
    return next(
      new ErrorHandler(
        "For bank transfer please fill the bank name, account holder and account number.",
        400
      )
    );
  }
  if (paypalEmail && !/^\S+@\S+\.\S+$/.test(paypalEmail)) {
    return next(new ErrorHandler("Please enter a valid PayPal email.", 400));
  }
  if (upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
    return next(new ErrorHandler("Please enter a valid UPI ID (name@bank).", 400));
  }

  const paymentMethods = {
    bankTransfer: { bankName, bankAccountName, bankAccountNumber, ifscCode },
    paypal: { paypalEmail },
    upi: { upiId },
  };
  if (!hasPayoutDetails({ paymentMethods })) {
    return next(
      new ErrorHandler(
        "Add at least one way to get paid: bank account, UPI or PayPal.",
        400
      )
    );
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { paymentMethods } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: "Payout details saved. You can now list items.",
    user,
  });
});

export const changePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }
  if (String(newPassword).length < 8) {
    return next(
      new ErrorHandler("New password must contain at least 8 characters.", 400)
    );
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    return next(new ErrorHandler("Current password is incorrect.", 400));
  }
  user.password = newPassword;
  await user.save();
  res.status(200).json({ success: true, message: "Password changed." });
});

export const toggleWatchlist = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const exists = await Auction.exists({ _id: id });
  if (!exists) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  const alreadyWatching = req.user.watchlist?.some((w) => w.toString() === id);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    alreadyWatching ? { $pull: { watchlist: id } } : { $addToSet: { watchlist: id } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    watching: !alreadyWatching,
    watchlist: user.watchlist,
    message: alreadyWatching ? "Removed from watchlist." : "Added to watchlist.",
  });
});

export const getWatchlist = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({ _id: { $in: req.user.watchlist || [] } })
    .select("-bids")
    .lean();
  res.status(200).json({ success: true, items, serverTime: new Date() });
});

export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
  // Public endpoint: only expose what the leaderboard actually shows.
  const leaderboard = await User.find({ moneySpent: { $gt: 0 } })
    .select("userName profileImage moneySpent auctionsWon")
    .sort({ moneySpent: -1 })
    .limit(100);
  res.status(200).json({
    success: true,
    leaderboard,
  });
});
