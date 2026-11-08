import { google } from "googleapis";
import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Email delivery
//   1. Gmail API (OAuth2)               - used when GOOGLE_* variables are set
//   2. SMTP (nodemailer, Gmail app pwd) - automatic fallback when (1) fails
// Every message is retried a few times before giving up, and the real reason
// for a failure is always logged so it can be fixed.
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Header values must be 7-bit ASCII. Anything else (the rupee sign, accents,
// emoji in an auction title...) has to be encoded as an RFC 2047 "encoded word",
// otherwise Gmail shows garbage or silently drops the message.
export const encodeHeader = (value) => {
  const clean = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
};

const wrap76 = (text) => text.match(/.{1,76}/g)?.join("\r\n") || "";

export const buildRawMessage = ({ from, to, subject, message }) =>
  [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(String(message ?? ""), "utf8").toString("base64")),
  ].join("\r\n");

const gmailConfigured = () =>
  !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_SENDER_EMAIL
  );

const smtpConfigured = () => !!(process.env.SMTP_MAIL && process.env.SMTP_PASSWORD);

export const isEmailConfigured = () => gmailConfigured() || smtpConfigured();

const describeError = (error) =>
  error?.response?.data?.error_description ||
  error?.response?.data?.error?.message ||
  (typeof error?.response?.data?.error === "string" ? error.response.data.error : null) ||
  error?.message ||
  String(error);

const sendViaGmailApi = async ({ email, subject, message }) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const sender = process.env.GOOGLE_SENDER_EMAIL;
  const raw = buildRawMessage({
    from: `BidBazaar <${sender}>`,
    to: email,
    subject,
    message,
  });
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: Buffer.from(raw).toString("base64url") },
  });
  return { via: "gmail-api", id: response.data.id };
};

let smtpTransport;
const getSmtpTransport = () => {
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      service: process.env.SMTP_SERVICE || undefined,
      auth: { user: process.env.SMTP_MAIL, pass: process.env.SMTP_PASSWORD },
    });
  }
  return smtpTransport;
};

const sendViaSmtp = async ({ email, subject, message }) => {
  const info = await getSmtpTransport().sendMail({
    from: `BidBazaar <${process.env.SMTP_MAIL}>`,
    to: email,
    subject,
    text: message,
  });
  return { via: "smtp", id: info.messageId };
};

// Sends one email. Throws only after every method and every retry has failed,
// so callers can decide to try again later.
export const sendEmail = async ({ email, subject, message }) => {
  if (!email) throw new Error("No recipient email address.");
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured. Set the GOOGLE_* variables (Gmail API) or SMTP_MAIL / SMTP_PASSWORD."
    );
  }

  const methods = [];
  if (gmailConfigured()) methods.push(sendViaGmailApi);
  if (smtpConfigured()) methods.push(sendViaSmtp);

  const attempts = 3;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    for (const method of methods) {
      try {
        const result = await method({ email, subject, message });
        console.log(`Email sent via ${result.via}:`, { to: email, subject, id: result.id });
        return result;
      } catch (error) {
        lastError = error;
        console.error(
          `Email attempt ${attempt}/${attempts} failed (${method.name}) to ${email}: ${describeError(error)}`
        );
      }
    }
    if (attempt < attempts) await sleep(attempt * 1500);
  }
  throw new Error(`Email to ${email} failed: ${describeError(lastError)}`);
};
