import "dotenv/config";
import cloudinary from "cloudinary";
import app from "./app.js";
import { connection } from "./database/connection.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { verifyCommissionCron } from "./automation/verifyCommissionCron.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import { isEmailConfigured } from "./utils/sendEmail.js";

const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_SECRET_KEY",
  "FRONTEND_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Never let a stray rejection take the whole API down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connection();
  await seedAdmin();
  if (!isEmailConfigured()) {
    console.warn(
      "WARNING: email is not configured - winners and sellers will NOT get emails. Set GOOGLE_* or SMTP_MAIL/SMTP_PASSWORD."
    );
  }
  endedAuctionCron();
  verifyCommissionCron();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

start();
