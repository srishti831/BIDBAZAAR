// One-time migration for databases created with the OLD schema, where
// startTime/endTime were stored as strings. Converts them to real Dates.
// Usage (from /backend): npm run migrate-dates
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.DB_NAME || "AUCTION_APP",
});

const collection = mongoose.connection.collection("auctions");
const docs = await collection
  .find({ $or: [{ startTime: { $type: "string" } }, { endTime: { $type: "string" } }] })
  .toArray();

let converted = 0;
for (const doc of docs) {
  const update = {};
  for (const key of ["startTime", "endTime"]) {
    if (typeof doc[key] === "string") {
      const date = new Date(doc[key]);
      if (!Number.isNaN(date.getTime())) update[key] = date;
    }
  }
  if (Object.keys(update).length) {
    await collection.updateOne({ _id: doc._id }, { $set: update });
    converted += 1;
  }
}

console.log(`Converted ${converted} auction(s) out of ${docs.length} found.`);
await mongoose.disconnect();
