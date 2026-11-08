import { Settings } from "../models/settingsSchema.js";
import { User } from "../models/userSchema.js";

const FIELDS = [
  "upiId",
  "upiName",
  "bankName",
  "bankAccountName",
  "bankAccountNumber",
  "ifscCode",
  "paypalEmail",
  "instructions",
];

// This project is a demo: unless real details are saved/configured, dummy
// ones are shown together with a "Demo" notice, so no real UPI id is needed.
// Set DEMO_MODE=false in .env for a real deployment.
export const isDemoMode = () => String(process.env.DEMO_MODE || "true").toLowerCase() !== "false";

const DEMO = {
  upiId: "bidbazaar@demo",
  upiName: "BidBazaar (Demo)",
  bankName: "Demo Bank",
  bankAccountName: "BidBazaar Demo Account",
  bankAccountNumber: "000011112222",
  ifscCode: "DEMO0000001",
  paypalEmail: "",
  instructions: "DEMO PROJECT - do not send real money. Upload any sample screenshot as proof.",
};

const fromEnv = () => {
  const env = {
    upiId: process.env.ADMIN_UPI_ID || "",
    upiName: process.env.ADMIN_UPI_NAME || "",
    bankName: process.env.ADMIN_BANK_NAME || "",
    bankAccountName: process.env.ADMIN_BANK_ACCOUNT_NAME || "",
    bankAccountNumber: process.env.ADMIN_BANK_ACCOUNT_NUMBER || "",
    ifscCode: process.env.ADMIN_BANK_IFSC || "",
    paypalEmail: process.env.ADMIN_PAYPAL_EMAIL || "",
    instructions: "",
  };
  return !hasCommissionPaymentDetails(env) && isDemoMode() ? { ...DEMO } : env;
};

export const hasCommissionPaymentDetails = (info = {}) =>
  !!(info.upiId || info.paypalEmail || (info.bankAccountNumber && info.bankName));

// What the admin saved in the dashboard wins; ADMIN_* env variables are only a
// starting point for brand-new installs.
export const getCommissionPaymentInfo = async () => {
  const doc = await Settings.findOne({ key: "platform" }).lean();
  const saved = doc?.commissionPayment || {};
  const env = fromEnv();
  const info = {};
  for (const field of FIELDS) info[field] = saved[field] || env[field] || "";
  return info;
};

export const saveCommissionPaymentInfo = async (input = {}) => {
  const clean = {};
  for (const field of FIELDS) {
    const raw = input[field];
    clean[field] = raw === undefined || raw === null ? "" : String(raw).trim();
  }
  clean.ifscCode = clean.ifscCode.toUpperCase();
  clean.paypalEmail = clean.paypalEmail.toLowerCase();
  clean.instructions = clean.instructions.slice(0, 500);
  await Settings.findOneAndUpdate(
    { key: "platform" },
    { $set: { commissionPayment: clean, updatedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return clean;
};

// Plain-text block that can be dropped into an email.
export const describeCommissionPayment = (info) => {
  const lines = [];
  if (info.upiId) lines.push(`UPI: ${info.upiId}${info.upiName ? ` (${info.upiName})` : ""}`);
  if (info.bankAccountNumber) {
    lines.push(
      `Bank transfer: ${info.bankAccountName || "BidBazaar"} | A/C ${info.bankAccountNumber} | IFSC ${
        info.ifscCode || "N/A"
      } | ${info.bankName || ""}`.trim()
    );
  }
  if (info.paypalEmail) lines.push(`PayPal: ${info.paypalEmail}`);
  if (info.instructions) lines.push(info.instructions);
  return lines.length
    ? lines.join("\n")
    : "Open BidBazaar > Commission to see where to pay.";
};

export const getAdminEmails = async () => {
  const admins = await User.find({ role: "Super Admin" }).select("email").lean();
  return admins.map((a) => a.email).filter(Boolean);
};
