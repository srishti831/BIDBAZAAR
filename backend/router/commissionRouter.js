import express from "express";
import {
  getMyCommission,
  getPaymentInfo,
  proofOfCommission,
} from "../controllers/commissionController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = express.Router();

router.post("/proof", isAuthenticated, isAuthorized("User"), proofOfCommission);
router.get("/payment-info", isAuthenticated, isAuthorized("User"), getPaymentInfo);
router.get("/mine", isAuthenticated, isAuthorized("User"), getMyCommission);

export default router;
