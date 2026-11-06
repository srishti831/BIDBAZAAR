import "dotenv/config";
import { sendEmail } from "./utils/sendEmail.js";

try {
  await sendEmail({
    email: process.env.GOOGLE_SENDER_EMAIL,
    subject: "BidBazaar Email Test",
    message: "Hello! Gmail OAuth2 email integration is working.",
  });

  console.log("Test completed.");
} catch (error) {
  console.error("Test failed:", error.message);
}