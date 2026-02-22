import mongoose from "mongoose";
import User from "../modules/auth/User.js";
import Order from "../modules/order/Order.js";
import Store from "../modules/store/Store.js";
import StoreInventory from "../modules/inventory/StoreInventory.js";

const RESOURCE_CONFIG = Object.freeze({
  User: {
    model: User,
    branchField: "branchAssignments.storeId",
  },
  Order: {
    model: Order,
    branchField: "assignedStore.storeId",
    taskField: "shipperInfo.shipperId",
  },
  Store: {
    model: Store,
    branchField: "_id",
  },
  StoreInventory: {
    model: StoreInventory,
    branchField: "storeId",
  },
});

const mergeQuery = (query, scopedQuery) => {
  if (!query || Object.keys(query).length === 0) {
    return scopedQuery;
  }
  if (!scopedQuery || Object.keys(scopedQuery).length === 0) {
    return query;
  }
  return { $and: [query, scopedQuery] };
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return null;
};

const toObjectIdList = (values = []) =>
  values
    .map((value) => toObjectId(value))
    .filter(Boolean);

const throwScopedError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  throw error;
};

const buildScopeQuery = ({ authz, config, mode = "branch" }) => {
  if (!authz) {
    throwScopedError("AUTHZ_CONTEXT_MISSING", "Authorization context is required");
  }

  const isGlobalAdmin = Boolean(authz.isGlobalAdmin || authz.systemRoles?.includes("GLOBAL_ADMIN"));

  if (mode === "global") {
    if (!isGlobalAdmin) {
      throwScopedError("AUTHZ_GLOBAL_SCOPE_DENIED", "Global scope is not allowed");
    }
    return {};
  }

  if (mode === "task") {
    if (!config.taskField) {
      throwScopedError("AUTHZ_TASK_SCOPE_UNSUPPORTED", "Task scope is not supported for resource");
    }
    const userObjectId = toObjectId(authz.userId);
    if (!userObjectId) {
      throwScopedError("AUTHZ_ACTOR_INVALID", "Actor id is invalid for task scope");
    }
    return { [config.taskField]: userObjectId };
  }

  if (!config.branchField) {
    return {};
  }

  if (mode === "assigned" && !isGlobalAdmin) {
    const branchObjectIds = toObjectIdList(authz.allowedBranchIds || []);
    if (branchObjectIds.length === 0) {
      throwScopedError("AUTHZ_NO_BRANCH_ASSIGNED", "No assigned branches available");
    }
    return { [config.branchField]: { $in: branchObjectIds } };
  }

  if (!authz.activeBranchId) {
    throwScopedError("AUTHZ_ACTIVE_BRANCH_REQUIRED", "Active branch is required");
  }

  const activeBranchObjectId = toObjectId(authz.activeBranchId);
  if (!activeBranchObjectId) {
    throwScopedError("AUTHZ_ACTIVE_BRANCH_INVALID", "Active branch is invalid");
  }

  return { [config.branchField]: activeBranchObjectId };
};

const injectAggregateScope = (pipeline = [], scopeQuery = {}) => {
  if (!scopeQuery || Object.keys(scopeQuery).length === 0) {
    return [...pipeline];
  }

  if (pipeline.length === 0) {
    return [{ $match: scopeQuery }];
  }

  if (pipeline[0]?.$match) {
    return [{ $match: mergeQuery(pipeline[0].$match, scopeQuery) }, ...pipeline.slice(1)];
  }

  return [{ $match: scopeQuery }, ...pipeline];
};

export const createScopedRepository = (resourceName, authz, defaults = {}) => {
  const config = RESOURCE_CONFIG[resourceName];
  if (!config) {
    throw new Error(`Unknown scoped resource: ${resourceName}`);
  }

  const resolveMode = (options = {}) =>
    options.mode || defaults.mode || authz?.scopeMode || "branch";

  const resolveScopeQuery = (options = {}) =>
    buildScopeQuery({ authz, config, mode: resolveMode(options) });

  return {
    model: config.model,

    scopeQuery(options = {}) {
      return resolveScopeQuery(options);
    },

    find(query = {}, options = {}) {
      const scoped = mergeQuery(query, resolveScopeQuery(options));
      return config.model.find(scoped);
    },

    findOne(query = {}, options = {}) {
      const scoped = mergeQuery(query, resolveScopeQuery(options));
      return config.model.findOne(scoped);
    },

    countDocuments(query = {}, options = {}) {
      const scoped = mergeQuery(query, resolveScopeQuery(options));
      return config.model.countDocuments(scoped);
    },

    exists(query = {}, options = {}) {
      const scoped = mergeQuery(query, resolveScopeQuery(options));
      return config.model.exists(scoped);
    },

    aggregate(pipeline = [], options = {}) {
      const scopedPipeline = injectAggregateScope(pipeline, resolveScopeQuery(options));
      return config.model.aggregate(scopedPipeline);
    },
  };
};

export default {
  createScopedRepository,
};
