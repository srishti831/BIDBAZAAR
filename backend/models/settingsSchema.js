import mongoose from "mongoose";

// One document that holds platform-wide settings. Right now it stores where
// sellers must send the platform commission (the admin's payment details).
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: "platform", unique: true },
  commissionPayment: {
    upiId: { type: String, default: "" },
    upiName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccountName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    paypalEmail: { type: String, default: "" },
    instructions: { type: String, default: "" },
  },
  updatedAt: { type: Date, default: Date.now },
});

export const Settings = mongoose.model("Settings", settingsSchema);
