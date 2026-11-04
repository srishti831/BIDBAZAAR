import { User } from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";

const extractToken = (req) => {
  if (req.cookies?.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return null;
};

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next(new ErrorHandler("User not authenticated.", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ErrorHandler("User no longer exists.", 401));
  }
  req.user = user;
  next();
});

// Attaches req.user when a valid token is present but never blocks the request,
// so public pages (e.g. a shared auction link) work for logged-out visitors too.
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch {
    /* invalid/expired token -> treat as a guest */
  }
  next();
};

export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `${req.user.role} not allowed to access this resource.`,
          403
        )
      );
    }
    next();
  };
};
