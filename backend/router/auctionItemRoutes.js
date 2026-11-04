import {
  addNewAuctionItem,
  getAllItems,
  getAuctionDetails,
  getMyAuctionItems,
  removeFromAuction,
  republishItem,
} from "../controllers/auctionItemController.js";
import { isAuthenticated, isAuthorized, optionalAuth } from "../middlewares/auth.js";
import express from "express";
import { trackCommissionStatus } from "../middlewares/trackCommissionStatus.js";

const router = express.Router();

router.post(
  "/create",
  isAuthenticated,
  isAuthorized("User"),
  trackCommissionStatus,
  addNewAuctionItem
);

router.get("/allitems", getAllItems);

// Public: anyone with the link can look; only logged-in members can bid.
router.get("/auction/:id", optionalAuth, getAuctionDetails);

router.get("/myitems", isAuthenticated, isAuthorized("User"), getMyAuctionItems);

router.delete("/delete/:id", isAuthenticated, isAuthorized("User"), removeFromAuction);

router.put(
  "/item/republish/:id",
  isAuthenticated,
  isAuthorized("User"),
  republishItem
);

export default router;
