import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { hasPayoutDetails } from "../utils/bidding.js";

// "Bidder" and "Auctioneer" are legacy roles from the old two-account model.
// Every regular member is now simply a "User" who can both bid and sell.
export const LEGACY_ROLES = ["Bidder", "Auctioneer"];

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, "Username is required."],
    trim: true,
    minLength: [3, "Username must contain at least 3 characters."],
    maxLength: [40, "Username cannot exceed 40 characters."],
  },
  password: {
    type: String,
    required: [true, "Password is required."],
    select: false,
    minLength: [8, "Password must contain at least 8 characters."],
  },
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
  },
  address: String,
  phone: {
    type: String,
    match: [/^\d{10}$/, "Phone number must contain exactly 10 digits."],
  },
  profileImage: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  // Only needed when the member wants to SELL (so winners know where to pay).
  paymentMethods: {
    bankTransfer: {
      bankAccountNumber: String,
      bankAccountName: String,
      bankName: String,
      ifscCode: String,
    },
    paypal: {
      paypalEmail: String,
    },
    upi: {
      upiId: String,
    },
  },
  role: {
    type: String,
    enum: ["User", "Super Admin", ...LEGACY_ROLES],
    default: "User",
  },
  watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Auction" }],
  unpaidCommission: {
    type: Number,
    default: 0,
  },
  auctionsWon: {
    type: Number,
    default: 0,
  },
  moneySpent: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Old accounts are treated as plain Users the moment they are loaded.
// (`npm run migrate-roles` makes this permanent in the database.)
userSchema.post("init", function (doc) {
  if (LEGACY_ROLES.includes(doc.role)) doc.role = "User";
});

// Never leak the password hash in API responses.
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    ret.payoutReady = hasPayoutDetails(ret);
    return ret;
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export const User = mongoose.model("User", userSchema);
