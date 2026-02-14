import crypto from "crypto";

const DEFAULT_INTERNAL_ROLES = [
  "ADMIN",
  "ORDER_MANAGER",
  "POS_STAFF",
  "CASHIER",
  "WAREHOUSE_STAFF",
  "SHIPPER",
];

const normalizeMode = (mode) => {
  const value = String(mode || "full").trim().toLowerCase();
  if (["off", "internal", "percentage", "full"].includes(value)) {
    return value;
  }
  return "full";
};

const parseCsv = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toPercent = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return Math.floor(parsed);
};

const getBucket = (userId, salt) => {
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${userId}`)
    .digest("hex");

  const first32Bits = Number.parseInt(hash.slice(0, 8), 16);
  return first32Bits % 100;
};

export const getRolloutConfig = () => {
  const mode = normalizeMode(process.env.OMNICHANNEL_ROLLOUT_MODE);
  const percent = toPercent(process.env.OMNICHANNEL_ROLLOUT_PERCENT, 100);
  const internalRoles = (
    parseCsv(process.env.OMNICHANNEL_INTERNAL_ROLES).length > 0
      ? parseCsv(process.env.OMNICHANNEL_INTERNAL_ROLES)
      : DEFAULT_INTERNAL_ROLES
  ).map((role) => role.toUpperCase());
  const internalUserIds = parseCsv(process.env.OMNICHANNEL_INTERNAL_USER_IDS);
  const salt = process.env.OMNICHANNEL_ROLLOUT_SALT || "omnichannel-rollout-v1";

  return {
    mode,
    percent,
    internalRoles,
    internalUserIds,
    salt,
  };
};

export const evaluateOmnichannelRolloutForUser = (user = {}) => {
  const config = getRolloutConfig();
  const userId = user?._id ? String(user._id) : "";
  const userRole = user?.role ? String(user.role).toUpperCase() : "";
  const isInternalByRole = userRole && config.internalRoles.includes(userRole);
  const isInternalById = userId && config.internalUserIds.includes(userId);
  const isInternal = Boolean(isInternalByRole || isInternalById);

  const baseResult = {
    mode: config.mode,
    percent: config.percent,
    userId,
    userRole,
    isInternal,
    enabled: false,
    reason: "disabled",
    bucket: null,
  };

  if (!userId) {
    return {
      ...baseResult,
      reason: "missing_user",
      mode: "off",
    };
  }

  if (config.mode === "off") {
    return {
      ...baseResult,
      reason: "mode_off",
    };
  }

  if (config.mode === "full") {
    return {
      ...baseResult,
      enabled: true,
      reason: "mode_full",
    };
  }

  if (config.mode === "internal") {
    return {
      ...baseResult,
      enabled: isInternal,
      reason: isInternal ? "internal_user" : "not_internal_user",
    };
  }

  const bucket = getBucket(userId, config.salt);
  if (isInternal) {
    return {
      ...baseResult,
      enabled: true,
      reason: "internal_user",
      bucket,
    };
  }

  const enabled = bucket < config.percent;
  return {
    ...baseResult,
    enabled,
    reason: enabled ? "bucket_in_percentage" : "bucket_outside_percentage",
    bucket,
  };
};

export default {
  getRolloutConfig,
  evaluateOmnichannelRolloutForUser,
};
