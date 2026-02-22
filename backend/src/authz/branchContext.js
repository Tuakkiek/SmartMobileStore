// ============================================
// AsyncLocalStorage-based branch context
// Stores authz context per-request so ORM plugins can read it
// ============================================

import { AsyncLocalStorage } from "node:async_hooks";

const branchContextStorage = new AsyncLocalStorage();

/**
 * Run a function within a branch context.
 * The ORM isolation plugin reads from this context.
 */
export const runWithBranchContext = (context, fn) => {
  return branchContextStorage.run(context, fn);
};

/**
 * Get the current branch context from AsyncLocalStorage.
 * Returns null if not inside a request context.
 */
export const getBranchContext = () => {
  return branchContextStorage.getStore() || null;
};

export default branchContextStorage;
