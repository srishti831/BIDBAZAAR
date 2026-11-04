// Usage (from /backend):
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass123' npm run create-admin
// Optional: ADMIN_NAME, ADMIN_PHONE (10 digits)
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/userSchema.js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password || password.length < 8) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters).");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.DB_NAME || "AUCTION_APP",
});

const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
  existing.role = "Super Admin";
  await existing.save();
  console.log(`Existing user ${email} promoted to Super Admin.`);
} else {
  await User.create({
    userName: process.env.ADMIN_NAME || "Super Admin",
    email,
    password,
    phone: process.env.ADMIN_PHONE || "0000000000",
    address: "BidBazaar HQ",
    role: "Super Admin",
    profileImage: {
      public_id: "admin-default",
      url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    },
  });
  console.log(`Super Admin ${email} created.`);
}

await mongoose.disconnect();
