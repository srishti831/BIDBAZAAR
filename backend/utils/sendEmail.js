import { google } from "googleapis";

export const sendEmail = async ({ email, subject, message }) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const senderEmail = process.env.GOOGLE_SENDER_EMAIL;

    const emailContent = [
      `From: BidBazaar <${senderEmail}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      message,
    ].join("\r\n");

    const encodedMessage = Buffer.from(emailContent).toString("base64url");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log("Email sent successfully:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Email sending failed:", error.response?.data || error.message);
    throw error;
  }
};