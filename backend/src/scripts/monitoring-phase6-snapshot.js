import dotenv from "dotenv";
import mongoose from "mongoose";

import Order from "../modules/order/Order.js";
import { getOmnichannelMonitoringSummary } from "../modules/monitoring/omnichannelMonitoringService.js";

dotenv.config();

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_CONNECTIONSTRING ||
  process.env.MONGO_URL;
const MONGO_URI = rawMongoUri?.trim().replace(/^"|"$/g, "");

if (!MONGO_URI) {
  console.error("[PHASE6][MONITOR] Missing MONGO_URI/MONGODB_URI");
  process.exit(1);
}

const log = (...args) => console.log("[PHASE6][MONITOR]", ...args);

const WINDOW_MINUTES = Math.max(1, Number(process.env.PHASE6_MONITOR_WINDOW_MINUTES || 15));
const LATENCY_WINDOW_HOURS = Math.max(
  1,
  Number(process.env.PHASE6_LATENCY_WINDOW_HOURS || 24)
);

const percentile = (values = [], p = 50) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return Number(sorted[index].toFixed(2));
};

const calcTransitionLatencyStats = (orders, fromStage, toStage) => {
  const durations = [];

  for (const order of orders) {
    const history = Array.isArray(order?.statusStageHistory)
      ? [...order.statusStageHistory]
          .filter((entry) => entry?.stage && entry?.updatedAt)
          .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
      : [];

    if (history.length < 2) {
      continue;
    }

    let fromAt = null;
    for (const entry of history) {
      if (!fromAt && entry.stage === fromStage) {
        fromAt = new Date(entry.updatedAt);
        continue;
      }

      if (fromAt && entry.stage === toStage) {
        const toAt = new Date(entry.updatedAt);
        const deltaMinutes = (toAt.getTime() - fromAt.getTime()) / (60 * 1000);
        if (Number.isFinite(deltaMinutes) && deltaMinutes >= 0) {
          durations.push(deltaMinutes);
        }
        break;
      }
    }
  }

  if (!durations.length) {
    return {
      count: 0,
      avgMinutes: 0,
      p50Minutes: 0,
      p95Minutes: 0,
      maxMinutes: 0,
    };
  }

  const sum = durations.reduce((acc, value) => acc + value, 0);
  const max = Math.max(...durations);

  return {
    count: durations.length,
    avgMinutes: Number((sum / durations.length).toFixed(2)),
    p50Minutes: percentile(durations, 50),
    p95Minutes: percentile(durations, 95),
    maxMinutes: Number(max.toFixed(2)),
  };
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    log("Mongo connected");

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sinceLatencyWindow = new Date(now.getTime() - LATENCY_WINDOW_HOURS * 60 * 60 * 1000);

    const [summary, paymentFailures24h, latencyOrders] = await Promise.all([
      getOmnichannelMonitoringSummary({ windowMinutes: WINDOW_MINUTES }),
      Order.countDocuments({
        $and: [
          {
            $or: [{ paymentStatus: "FAILED" }, { statusStage: "PAYMENT_FAILED" }],
          },
          {
            $or: [{ paymentFailureAt: { $gte: since24h } }, { updatedAt: { $gte: since24h } }],
          },
        ],
      }),
      Order.find({ updatedAt: { $gte: sinceLatencyWindow } })
        .select("orderNumber statusStageHistory")
        .lean(),
    ]);

    const transitionLatency = {
      pendingToConfirmed: calcTransitionLatencyStats(latencyOrders, "PENDING", "CONFIRMED"),
      confirmedToPicking: calcTransitionLatencyStats(latencyOrders, "CONFIRMED", "PICKING"),
      inTransitToDelivered: calcTransitionLatencyStats(latencyOrders, "IN_TRANSIT", "DELIVERED"),
    };

    const report = {
      generatedAt: now.toISOString(),
      monitoringWindowMinutes: WINDOW_MINUTES,
      latencyWindowHours: LATENCY_WINDOW_HOURS,
      kpis: summary.kpis,
      alerts: summary.alerts,
      paymentFailuresLast24h: paymentFailures24h,
      transitionLatencyMinutes: transitionLatency,
    };

    log("Snapshot report");
    console.log(JSON.stringify(report, null, 2));

    const criticalAlerts = (summary.alerts || []).filter(
      (item) => item?.triggered && item?.severity === "critical"
    );
    const highAlerts = (summary.alerts || []).filter(
      (item) => item?.triggered && item?.severity === "high"
    );

    if (criticalAlerts.length || highAlerts.length) {
      log(
        `Attention: triggered alerts critical=${criticalAlerts.length} high=${highAlerts.length}`
      );
    } else {
      log("No critical/high alerts triggered");
    }
  } finally {
    await mongoose.disconnect();
    log("Done");
  }
};

run().catch((error) => {
  console.error("[PHASE6][MONITOR] FAILED", error.message);
  process.exit(1);
});
