import cron from "node-cron";
import { PaymentProof } from "../models/commissionProofSchema.js";
import { settleApprovedProof } from "../utils/commissionSettlement.js";

// Safety net only. Approving a proof in the admin dashboard settles it
// immediately; this job just catches anything left in "Approved".
export const verifyCommissionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const approved = await PaymentProof.find({ status: "Approved" }).select("_id");
      for (const { _id } of approved) {
        try {
          await settleApprovedProof(_id);
        } catch (error) {
          console.error(`Error settling commission proof ${_id}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Verify commission cron failed:", error);
    }
  });
};
