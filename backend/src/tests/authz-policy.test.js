import test from "node:test";
import assert from "node:assert/strict";
import { AUTHZ_ACTIONS } from "../authz/actions.js";
import { buildPermissionSet, evaluatePolicy } from "../authz/policyEngine.js";

const buildContext = (overrides = {}) => {
  const base = {
    userId: "67af5df0f70d57d0a18f4b17",
    role: "ADMIN",
    systemRoles: [],
    taskRoles: [],
    branchAssignments: [
      {
        storeId: "67af5df0f70d57d0a18f4b18",
        roles: ["BRANCH_ADMIN"],
        status: "ACTIVE",
      },
    ],
    allowedBranchIds: ["67af5df0f70d57d0a18f4b18"],
    activeBranchId: "67af5df0f70d57d0a18f4b18",
    isGlobalAdmin: false,
  };

  const context = { ...base, ...overrides };
  context.permissions = buildPermissionSet(context);
  return context;
};

test("allows branch analytics in active branch scope", () => {
  const authz = buildContext();
  const result = evaluatePolicy({
    action: AUTHZ_ACTIONS.ANALYTICS_READ_BRANCH,
    authz,
    mode: "branch",
    requireActiveBranch: true,
    resource: {
      branchId: "67af5df0f70d57d0a18f4b18",
    },
  });

  assert.equal(result.allowed, true);
});

test("denies branch analytics when active branch is missing", () => {
  const authz = buildContext({
    activeBranchId: "",
  });
  const result = evaluatePolicy({
    action: AUTHZ_ACTIONS.ANALYTICS_READ_BRANCH,
    authz,
    mode: "branch",
    requireActiveBranch: true,
  });

  assert.equal(result.allowed, false);
  // Kill-switch fix: empty activeBranchId → no branch roles loaded → action denied
  assert.equal(result.code, "AUTHZ_ACTION_DENIED");
});

test("denies global scope for non-global admin", () => {
  const authz = buildContext();
  const result = evaluatePolicy({
    action: AUTHZ_ACTIONS.ANALYTICS_READ_BRANCH,
    authz,
    mode: "global",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, "AUTHZ_GLOBAL_SCOPE_DENIED");
});

test("allows global scope for global admin", () => {
  const authz = buildContext({
    role: "GLOBAL_ADMIN",
    systemRoles: ["GLOBAL_ADMIN"],
    isGlobalAdmin: true,
  });
  authz.permissions = buildPermissionSet(authz);

  const result = evaluatePolicy({
    action: AUTHZ_ACTIONS.ANALYTICS_READ_GLOBAL,
    authz,
    mode: "global",
  });

  assert.equal(result.allowed, true);
});
