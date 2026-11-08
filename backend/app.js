import express from "express";
import cors from "cors";
import os from "os";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { errorMiddleware } from "./middlewares/error.js";
import { rateLimit } from "./middlewares/rateLimit.js";
import userRouter from "./router/userRoutes.js";
import auctionItemRouter from "./router/auctionItemRoutes.js";
import bidRouter from "./router/bidRoutes.js";
import commissionRouter from "./router/commissionRouter.js";
import superAdminRouter from "./router/superAdminRoutes.js";

const app = express();

// Render / Railway / Heroku sit behind a proxy; needed for secure cookies & correct IPs.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// FRONTEND_URL may hold several comma-separated origins.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, health checks) that send no Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// CSRF guard: a browser always sends Origin on cross-site POST/PUT/DELETE.
// Reject state-changing requests that come from a site we do not trust, even
// if the login cookie would have been attached.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    return res.status(403).json({ success: false, message: "Origin not allowed." });
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    abortOnLimit: true,
    limitHandler: (req, res) => {
      res
        .status(413)
        .json({ success: false, message: "File too large. Max size is 5 MB." });
    },
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "BidBazaar API is running." });
});
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

// Brute-force protection on auth endpoints (20 attempts / 15 min / IP).
app.use("/api/v1/user/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use("/api/v1/user/register", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// Spam protection for the actions that cost money or storage.
app.use("/api/v1/bid/place", rateLimit({ windowMs: 60 * 1000, max: 30 }));
app.use("/api/v1/auctionitem/create", rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }));
app.use("/api/v1/commission/proof", rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));
app.use("/api/v1/user/watchlist", rateLimit({ windowMs: 60 * 1000, max: 60 }));
app.use("/api/v1/user/me", rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorMiddleware);

export default app;
