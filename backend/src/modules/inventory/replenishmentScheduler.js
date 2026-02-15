import ReplenishmentSnapshot from "./ReplenishmentSnapshot.js";
import { analyzeReplenishmentNeeds } from "./replenishmentService.js";
import {
  markSnapshotNotifications,
  saveReplenishmentSnapshot,
} from "./replenishmentSnapshotService.js";
import { sendReplenishmentSummaryNotification } from "../notification/notificationService.js";
import { omniLog } from "../../utils/logger.js";

const DEFAULT_SCHEDULE_HOUR = 2;
const DEFAULT_SCHEDULE_MINUTE = 0;
const DEFAULT_ANALYSIS_LIMIT = 300;
const DEFAULT_SURPLUS_THRESHOLD = 20;

let schedulerTimer = null;
let schedulerStarted = false;
let jobInProgress = false;

const toDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toIntegerInRange = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const isSchedulerEnabled = () =>
  String(process.env.REPLENISHMENT_SCHEDULER_ENABLED ?? "true").toLowerCase() !==
  "false";

const isStartupCatchupEnabled = () =>
  String(process.env.REPLENISHMENT_SCHEDULER_STARTUP_CATCHUP ?? "true").toLowerCase() !==
  "false";

const readScheduleConfig = () => {
  const hour = toIntegerInRange(
    process.env.REPLENISHMENT_SCHEDULER_HOUR,
    DEFAULT_SCHEDULE_HOUR,
    0,
    23
  );
  const minute = toIntegerInRange(
    process.env.REPLENISHMENT_SCHEDULER_MINUTE,
    DEFAULT_SCHEDULE_MINUTE,
    0,
    59
  );
  return { hour, minute };
};

const getDailyRunAt = (date, { hour, minute }) => {
  const runAt = new Date(date);
  runAt.setHours(hour, minute, 0, 0);
  return runAt;
};

const getNextRunAt = (now, scheduleConfig) => {
  const next = getDailyRunAt(now, scheduleConfig);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const getAnalysisOptions = () => ({
  limit: toIntegerInRange(
    process.env.REPLENISHMENT_ANALYSIS_LIMIT,
    DEFAULT_ANALYSIS_LIMIT,
    1,
    500
  ),
  surplusThreshold: toIntegerInRange(
    process.env.REPLENISHMENT_SURPLUS_THRESHOLD,
    DEFAULT_SURPLUS_THRESHOLD,
    0,
    100000
  ),
  criticalOnly: false,
});

const shouldRunCatchupNow = async (scheduleConfig) => {
  if (!isStartupCatchupEnabled()) {
    return false;
  }

  const now = new Date();
  const scheduledTimeToday = getDailyRunAt(now, scheduleConfig);
  if (now < scheduledTimeToday) {
    return false;
  }

  const snapshotDateKey = toDateKey(now);
  const todaySnapshot = await ReplenishmentSnapshot.findOne({ snapshotDateKey })
    .select("_id")
    .lean();
  return !todaySnapshot;
};

const scheduleNextExecution = () => {
  if (!isSchedulerEnabled()) {
    return;
  }

  const now = new Date();
  const scheduleConfig = readScheduleConfig();
  const nextRunAt = getNextRunAt(now, scheduleConfig);
  const delay = Math.max(1000, nextRunAt.getTime() - now.getTime());

  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
  }

  schedulerTimer = setTimeout(async () => {
    await runReplenishmentSnapshotJob({ source: "SCHEDULED" });
    scheduleNextExecution();
  }, delay);

  omniLog.info("replenishment scheduler armed", {
    nextRunAt: nextRunAt.toISOString(),
    inMs: delay,
  });
};

export const runReplenishmentSnapshotJob = async ({
  source = "MANUAL",
  initiatedBy = "SYSTEM",
} = {}) => {
  if (jobInProgress) {
    return {
      success: false,
      skipped: true,
      reason: "job_in_progress",
    };
  }

  jobInProgress = true;
  const generatedAt = new Date();
  const snapshotDateKey = toDateKey(generatedAt);
  const analysisOptions = getAnalysisOptions();

  try {
    const analysisResult = await analyzeReplenishmentNeeds(analysisOptions);
    const { snapshot, recommendationsCount } = await saveReplenishmentSnapshot({
      recommendations: analysisResult.recommendations || [],
      summary: analysisResult.summary || {},
      generatedAt,
      source,
      options: analysisOptions,
      metadata: {
        initiatedBy,
      },
    });

    const notificationResult = await sendReplenishmentSummaryNotification({
      snapshotDateKey,
      summary: analysisResult.summary || {},
      recommendations: analysisResult.recommendations || [],
      source: "replenishment_scheduler",
      triggeredBy: initiatedBy,
    });

    if (notificationResult) {
      await markSnapshotNotifications({
        snapshotDateKey,
        sent:
          notificationResult.createdCount > 0 ||
          notificationResult.reason === "already_sent",
        count: notificationResult.createdCount || 0,
        eventType: notificationResult.eventType || "",
      });
    }

    omniLog.info("replenishment snapshot job completed", {
      source,
      snapshotDateKey,
      recommendationsCount,
      criticalCount: analysisResult?.summary?.criticalCount || 0,
      notificationCreated: notificationResult?.createdCount || 0,
      notificationSkipped: notificationResult?.skipped || false,
      snapshotId: snapshot?._id,
    });

    return {
      success: true,
      skipped: false,
      snapshotDateKey,
      recommendationsCount,
      summary: analysisResult.summary,
      notificationResult,
    };
  } catch (error) {
    omniLog.error("replenishment snapshot job failed", {
      source,
      snapshotDateKey,
      error: error.message,
    });

    return {
      success: false,
      skipped: false,
      snapshotDateKey,
      error: error.message,
    };
  } finally {
    jobInProgress = false;
  }
};

export const startReplenishmentScheduler = () => {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;

  if (!isSchedulerEnabled()) {
    omniLog.info("replenishment scheduler disabled", {});
    return;
  }

  scheduleNextExecution();

  // Startup catch-up: if server starts after scheduled time and there is no snapshot
  // for today, create one once to avoid waiting until next day.
  setTimeout(async () => {
    try {
      const scheduleConfig = readScheduleConfig();
      const shouldRun = await shouldRunCatchupNow(scheduleConfig);
      if (!shouldRun) {
        return;
      }

      await runReplenishmentSnapshotJob({
        source: "STARTUP_CATCHUP",
      });
    } catch (error) {
      omniLog.warn("replenishment startup catchup failed", {
        error: error.message,
      });
    }
  }, 10 * 1000);
};

export const stopReplenishmentScheduler = () => {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  schedulerStarted = false;
};

export default {
  startReplenishmentScheduler,
  stopReplenishmentScheduler,
  runReplenishmentSnapshotJob,
};
