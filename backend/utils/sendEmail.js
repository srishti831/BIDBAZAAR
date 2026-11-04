import nodeMailer from "nodemailer";

export const sendEmail = async ({ email, subject, message }) => {
  const port = Number(process.env.SMTP_PORT) || 465;
  const transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  await transporter.sendMail({
    from: `"BidBazaar" <${process.env.SMTP_MAIL}>`,
    to: email,
    subject,
    text: message,
  });
};
