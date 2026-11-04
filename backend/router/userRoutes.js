import express from "express";
import {
  changePassword,
  fetchLeaderboard,
  getProfile,
  getWatchlist,
  login,
  logout,
  register,
  toggleWatchlist,
  updatePayout,
  updateProfile,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", isAuthenticated, getProfile);
router.put("/me/update", isAuthenticated, updateProfile);
router.put("/me/payout", isAuthenticated, updatePayout);
router.put("/me/password", isAuthenticated, changePassword);
router.get("/logout", isAuthenticated, logout);
router.get("/leaderboard", fetchLeaderboard);
router.get("/watchlist", isAuthenticated, getWatchlist);
router.post("/watchlist/:id", isAuthenticated, toggleWatchlist);

export default router;
