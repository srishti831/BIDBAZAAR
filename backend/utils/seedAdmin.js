import { User } from "../models/userSchema.js";

// Creates the Super Admin automatically on startup when ADMIN_EMAIL and
// ADMIN_PASSWORD are set and the account does not exist yet. That way the
// admin can always log in (also on Render, where there is no shell on the free
// plan). The password is only used when the account is first created.
export const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must have at least 8 characters - admin not created.");
    return;
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== "Super Admin") {
        existing.role = "Super Admin";
        await existing.save();
        console.log(`Existing user ${email} promoted to Super Admin.`);
      }
      return;
    }
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
    console.log(`Super Admin ${email} created. Log in with it to open the Dashboard.`);
  } catch (error) {
    console.error("Could not create the Super Admin:", error.message);
  }
};
