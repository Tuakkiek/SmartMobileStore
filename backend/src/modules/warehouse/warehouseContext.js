import Store from "../store/Store.js";

const normalizeBranchId = (value) => String(value || "").trim();

const buildContextError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

export const getActiveWarehouseBranchId = (req) =>
  normalizeBranchId(req?.authz?.activeBranchId);

export const resolveWarehouseScopeMode = (req) => {
  if (req?.authz?.isGlobalAdmin && req?.authz?.contextMode !== "SIMULATED") {
    return "global";
  }
  return "branch";
};

export const ensureWarehouseWriteBranchId = (req) => {
  if (req?.authz?.isGlobalAdmin && req?.authz?.contextMode !== "SIMULATED") {
    throw buildContextError(
      403,
      "AUTHZ_WAREHOUSE_SIMULATION_REQUIRED",
      "Global admin must enable branch simulation before warehouse write operations"
    );
  }

  const activeBranchId = getActiveWarehouseBranchId(req);
  if (!activeBranchId) {
    throw buildContextError(
      403,
      "AUTHZ_ACTIVE_BRANCH_REQUIRED",
      "Active branch context is required for warehouse write operations"
    );
  }

  return activeBranchId;
};

export const requireGlobalSimulationForWarehouseWrite = (req, res, next) => {
  try {
    ensureWarehouseWriteBranchId(req);
    return next();
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "WAREHOUSE_CONTEXT_ERROR",
      message: error.message,
    });
  }
};

export const resolveWarehouseStore = async (
  req,
  {
    branchId = "",
    session = null,
    requireWarehouseType = false,
  } = {}
) => {
  const targetBranchId = normalizeBranchId(branchId) || getActiveWarehouseBranchId(req);
  if (!targetBranchId) {
    throw buildContextError(
      403,
      "AUTHZ_ACTIVE_BRANCH_REQUIRED",
      "Active branch context is required"
    );
  }

  const query = Store.findById(targetBranchId).select("_id code name type status");
  if (session) {
    query.session(session);
  }

  const store = await query;
  if (!store) {
    throw buildContextError(404, "STORE_NOT_FOUND", "Branch store not found");
  }

  if (store.status !== "ACTIVE") {
    throw buildContextError(
      400,
      "STORE_INACTIVE",
      `Store ${store.code || store._id} is not ACTIVE`
    );
  }

  if (requireWarehouseType && store.type !== "WAREHOUSE") {
    throw buildContextError(
      400,
      "STORE_NOT_WAREHOUSE",
      `Store ${store.code || store._id} is not a warehouse`
    );
  }

  return store;
};

export default {
  getActiveWarehouseBranchId,
  resolveWarehouseScopeMode,
  ensureWarehouseWriteBranchId,
  requireGlobalSimulationForWarehouseWrite,
  resolveWarehouseStore,
};
