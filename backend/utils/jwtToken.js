const isProd = process.env.NODE_ENV === "production";

// Frontend and API usually live on different domains in production, so the
// cookie must be SameSite=None; Secure to be sent on cross-site requests.
export const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
});

export const generateToken = (user, message, statusCode, res) => {
  const token = user.generateJsonWebToken();
  const days = Number(process.env.COOKIE_EXPIRE) || 7;
  res
    .status(statusCode)
    .cookie("token", token, {
      ...cookieOptions(),
      expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    })
    .json({
      success: true,
      message,
      user,
      token,
    });
};
