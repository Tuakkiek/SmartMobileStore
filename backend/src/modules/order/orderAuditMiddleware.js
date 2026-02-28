import mongoose from "mongoose";
import Order from "./Order.js";
import {
  buildOrderAuditPayload,
  resolveOrderIdFromRequest,
  resolveOrderIdFromResponseBody,
} from "./orderAuditAdapter.js";
import { extractRequestContext, isAuditEnabled, safeWriteAuditEntry } from "../audit/auditService.js";
import { omniLog } from "../../utils/logger.js";

const toOrderId = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
    return "";
  }
  return raw;
};

const tryParseJson = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const orderAuditMiddleware = (options = {}) => {
  const actionType = String(options.actionType || "").trim();
  const source = String(options.source || "").trim();
  const metadataFactory =
    typeof options.metadataFactory === "function" ? options.metadataFactory : null;
  const resolveOrderIdOption =
    typeof options.resolveOrderId === "function" ? options.resolveOrderId : null;

  return async (req, res, next) => {
    if (!isAuditEnabled() || !actionType) {
      return next();
    }

    const startedAt = Date.now();
    let responseBody = null;
    let preOrder = null;
    let initialOrderId = "";

    const requestContext = extractRequestContext(req);

    try {
      if (resolveOrderIdOption) {
        initialOrderId = toOrderId(await resolveOrderIdOption(req));
      }
      if (!initialOrderId) {
        initialOrderId = toOrderId(resolveOrderIdFromRequest(req));
      }

      if (initialOrderId) {
        preOrder = await Order.findById(initialOrderId).lean();
      }
    } catch (error) {
      omniLog.warn("order audit pre-state capture failed", {
        actionType,
        path: req.originalUrl || req.path,
        error: error.message,
      });
    }

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      responseBody = payload;
      return originalJson(payload);
    };

    const originalSend = res.send.bind(res);
    res.send = (payload) => {
      if (!responseBody) {
        if (typeof payload === "object" && payload !== null) {
          responseBody = payload;
        } else {
          const parsed = tryParseJson(payload);
          if (parsed && typeof parsed === "object") {
            responseBody = parsed;
          }
        }
      }
      return originalSend(payload);
    };

    res.once("finish", () => {
      void (async () => {
        const outcome = res.statusCode >= 400 ? "FAILED" : "SUCCESS";

        let finalOrderId =
          toOrderId(preOrder?._id) ||
          toOrderId(initialOrderId) ||
          toOrderId(resolveOrderIdFromResponseBody(responseBody));

        if (!finalOrderId && resolveOrderIdOption) {
          try {
            finalOrderId = toOrderId(await resolveOrderIdOption(req, responseBody));
          } catch (error) {
            omniLog.warn("order audit post-state resolver failed", {
              actionType,
              path: req.originalUrl || req.path,
              error: error.message,
            });
          }
        }

        if (!finalOrderId) {
          return;
        }

        let postOrder = null;
        try {
          postOrder = await Order.findById(finalOrderId).lean();
        } catch (error) {
          omniLog.warn("order audit post-state capture failed", {
            actionType,
            orderId: finalOrderId,
            error: error.message,
          });
        }

        const metadata = {
          ...(metadataFactory ? metadataFactory(req, responseBody) : {}),
          durationMs: Date.now() - startedAt,
        };

        const payload = buildOrderAuditPayload({
          req,
          actionType,
          outcome,
          source,
          orderId: finalOrderId,
          beforeOrder: preOrder,
          afterOrder: postOrder,
          statusCode: res.statusCode,
          resBody: responseBody,
          requestContext,
          metadata,
        });

        if (!payload) {
          return;
        }

        await safeWriteAuditEntry(payload, {
          actionType,
          orderId: finalOrderId,
          path: req.originalUrl || req.path,
          outcome,
        });
      })();
    });

    return next();
  };
};

export default orderAuditMiddleware;
