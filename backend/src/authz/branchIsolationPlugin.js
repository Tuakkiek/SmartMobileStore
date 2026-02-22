// ============================================
// Mongoose Branch Isolation Plugin
// Auto-injects branch scoping into every query.
// Developer mistakes fail CLOSED — not open.
// ============================================

import { getBranchContext } from "./branchContext.js";

const HOOKABLE_QUERIES = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "countDocuments",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
];

/**
 * @param {import("mongoose").Schema} schema
 * @param {object} options
 * @param {string} options.branchField - The field name to scope by (default: "storeId")
 */
export const branchIsolationPlugin = (schema, options = {}) => {
  const branchField = options.branchField || "storeId";

  // ── Hook: find / findOne / countDocuments / etc ──
  for (const hook of HOOKABLE_QUERIES) {
    schema.pre(hook, function () {
      // Allow explicit opt-out for system-level jobs
      if (this.getOptions?.()?.skipBranchIsolation === true) {
        return;
      }

      const ctx = getBranchContext();
      if (!ctx) {
        // No context means we're in a background job or test.
        // If skipBranchIsolation was not set, this is a bug — fail closed.
        throw new Error(
          `BRANCH_CONTEXT_REQUIRED: Cannot execute ${hook}() on branch-scoped model without branch context. ` +
          `Use { skipBranchIsolation: true } for system-level operations.`
        );
      }

      // GLOBAL_ADMIN in simulated mode OR global scope can skip
      if (ctx.isGlobalAdmin && ctx.scopeMode === "global") {
        return;
      }

      const activeBranchId = ctx.activeBranchId;
      if (!activeBranchId) {
        throw new Error(
          `BRANCH_CONTEXT_REQUIRED: activeBranchId is empty. Cannot execute ${hook}() without branch context.`
        );
      }

      // Auto-inject the branch filter
      this.where({ [branchField]: activeBranchId });
    });
  }

  // ── Hook: aggregate ──
  schema.pre("aggregate", function () {
    const pipelineOptions = this.options || {};
    if (pipelineOptions.skipBranchIsolation === true) {
      return;
    }

    const ctx = getBranchContext();
    if (!ctx) {
      throw new Error(
        "BRANCH_CONTEXT_REQUIRED: Cannot execute aggregate() on branch-scoped model without branch context."
      );
    }

    if (ctx.isGlobalAdmin && ctx.scopeMode === "global") {
      return;
    }

    const activeBranchId = ctx.activeBranchId;
    if (!activeBranchId) {
      throw new Error(
        "BRANCH_CONTEXT_REQUIRED: activeBranchId is empty. Cannot execute aggregate() without branch context."
      );
    }

    // Prepend a $match stage to the pipeline
    this.pipeline().unshift({
      $match: { [branchField]: activeBranchId },
    });
  });
};

export default branchIsolationPlugin;
