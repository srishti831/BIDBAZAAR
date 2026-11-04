import mongoose from "mongoose";

export const connection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "AUCTION_APP",
    });
    console.log("Connected to database.");
  } catch (err) {
    console.error(`Could not connect to database: ${err.message}`);
    process.exit(1);
  }
};
