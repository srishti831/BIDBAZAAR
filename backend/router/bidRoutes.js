import express from "express";
import { getMyBids, placeBid } from "../controllers/bidController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = express.Router();

router.post("/place/:id", isAuthenticated, isAuthorized("User"), placeBid);
router.get("/mine", isAuthenticated, isAuthorized("User"), getMyBids);

export default router;
