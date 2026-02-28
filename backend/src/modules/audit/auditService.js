import mongoose from "mongoose";
import AuditLog from "./AuditLog.js";
import { maskSensitiveData } from "./auditMasking.js";
import { omniLog } from "../../utils/logger.js";

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
};

const toOptionalObjectId = (value) => {
  if (!value) {
    return undefined;
  }

  const raw = typeof value === "string" ? value.trim() : String(value);
  if (!raw) {
    return undefined;
  }

  if (!mongoose.Types.ObjectId.isValid(raw)) {
    return undefined;
  }

  return new mongoose.Types.ObjectId(raw);
};

const toEntityId = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (value?._id) {
    return String(value._id).trim();
  }
  return String(value).trim();
};

export const isAuditEnabled = () => {
  return String(process.env.ORDER_AUDIT_ENABLED ?? "true").toLowerCase() !== "false";
};

export const extractRequestContext = (req) => {
  if (!req) {
    return {};
  }

  const requestId =
    req.headers?.["x-request-id"] || req.headers?.["x-correlation-id"] || "";

  return {
    requestId: normalizeString(requestId),
    method: normalizeString(req.method),
    path: normalizeString(req.originalUrl || req.path),
    ip: normalizeString(req.ip),
    userAgent: normalizeString(req.headers?.["user-agent"]),
  };
};

const normalizeAuditPayload = (payload = {}) => {
  const entityType = normalizeString(payload.entityType).toUpperCase();
  const entityId = toEntityId(payload.entityId);
  const outcome = normalizeString(payload.outcome).toUpperCase() || "SUCCESS";
  const actionType = normalizeString(payload.actionType).toUpperCase();

  if (!entityType) {
    throw new Error("entityType is required");
  }
  if (!entityId) {
    throw new Error("entityId is required");
  }
  if (!actionType) {
    throw new Error("actionType is required");
  }
  if (!["SUCCESS", "FAILED"].includes(outcome)) {
    throw new Error(`Invalid outcome: ${outcome}`);
  }

  const actor = payload.actor || {};
  const actorType = normalizeString(actor.actorType).toUpperCase() || "SYSTEM";
  const actorUserId = toOptionalObjectId(actor.userId);

  return {
    entityType,
    entityId,
    orderId: toOptionalObjectId(payload.orderId),
    branchId: toOptionalObjectId(payload.branchId) ?? null,
    actionType,
    outcome,
    actor: {
      actorType: actorType === "USER" ? "USER" : "SYSTEM",
      userId: actorUserId || null,
      role: normalizeString(actor.role),
      source: normalizeString(actor.source),
    },
    oldValues: maskSensitiveData(payload.oldValues || {}),
    newValues: maskSensitiveData(payload.newValues || {}),
    changedPaths: Array.isArray(payload.changedPaths)
      ? payload.changedPaths
          .map((item) => normalizeString(item))
          .filter(Boolean)
      : [],
    note: normalizeString(payload.note),
    reason: normalizeString(payload.reason),
    requestContext: payload.requestContext || {},
    failureContext: payload.failureContext || {},
    metadata: payload.metadata || {},
  };
};

export const writeAuditEntry = async (payload = {}) => {
  if (!isAuditEnabled()) {
    return null;
  }

  const normalized = normalizeAuditPayload(payload);
  return AuditLog.create(normalized);
};

export const safeWriteAuditEntry = async (payload = {}, context = {}) => {
  if (!isAuditEnabled()) {
    return null;
  }

  try {
    return await writeAuditEntry(payload);
  } catch (error) {
    omniLog.warn("order audit logging failed", {
      actionType: payload?.actionType,
      entityType: payload?.entityType,
      entityId: payload?.entityId,
      orderId: payload?.orderId,
      error: error.message,
      ...context,
    });
    return null;
  }
};

export default {
  isAuditEnabled,
  extractRequestContext,
  writeAuditEntry,
  safeWriteAuditEntry,
};
