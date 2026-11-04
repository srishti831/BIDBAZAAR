// One-time migration: the old "Bidder" and "Auctioneer" roles become "User"
// (everyone can now bid AND sell with a single account).
// Usage (from /backend): npm run migrate-roles
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.DB_NAME || "AUCTION_APP",
});

const result = await mongoose.connection
  .collection("users")
  .updateMany({ role: { $in: ["Bidder", "Auctioneer"] } }, { $set: { role: "User" } });

console.log(`Updated ${result.modifiedCount} account(s) to the unified "User" role.`);
await mongoose.disconnect();
