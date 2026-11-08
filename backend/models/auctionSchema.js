import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema({
  title: { type: String, trim: true, required: [true, "Title is required."], maxLength: 120 },
  description: { type: String, required: [true, "Description is required."], maxLength: 3000 },
  startingBid: { type: Number, required: true, min: [1, "Starting bid must be positive."] },
  category: { type: String, required: true },
  condition: {
    type: String,
    enum: ["New", "Used"],
  },
  currentBid: { type: Number, default: 0 },
  // Stored as real Dates so range queries (cron, "active auction" check) work.
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true, index: true },
  image: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bids: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      userName: String,
      profileImage: String,
      amount: Number,
      at: { type: Date, default: Date.now },
    },
  ],
  // How many times anti-sniping pushed the end time back.
  extensions: { type: Number, default: 0 },
  highestBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  commissionCalculated: {
    type: Boolean,
    default: false,
  },
  // Tracks the "auction ended" emails so a failed email is retried instead of
  // being lost. Set when the auction is settled; cleared again on republish.
  notify: {
    pending: { type: Boolean, default: false },
    winnerSent: { type: Boolean, default: false },
    sellerSent: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Auction = mongoose.model("Auction", auctionSchema);
