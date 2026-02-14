import express from "express";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";
import * as monitoringController from "./monitoringController.js";

const router = express.Router();

router.use(protect);

// Used by checkout to evaluate per-user rollout eligibility.
router.get("/omnichannel/rollout", monitoringController.getOmnichannelRolloutDecision);

router.use(restrictTo("ADMIN", "ORDER_MANAGER"));

router.get("/omnichannel/summary", monitoringController.getOmnichannelSummary);
router.get("/omnichannel/events", monitoringController.listOmnichannelEvents);

export default router;
