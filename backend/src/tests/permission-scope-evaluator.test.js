import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy, buildPermissionGrantMap, buildPermissionSet } from "../authz/policyEngine.js";

const createAuthz = () => {
  const permissionGrants = [
    { key: "inventory.read", scopeType: "BRANCH", scopeId: "BRANCH_A" },
    { key: "inventory.write", scopeType: "BRANCH", scopeId: "BRANCH_A" },
  ];
  return {
    userId: "user-1",
    isGlobalAdmin: false,
    systemRoles: [],
    taskRoles: [],
    allowedBranchIds: ["BRANCH_A"],
    activeBranchId: "BRANCH_A",
    permissionGrants,
    permissionGrantMap: buildPermissionGrantMap(permissionGrants),
    permissions: new Set(["inventory.read", "inventory.write"]),
  };
};

test("allows branch-scoped action in matching branch", () => {
  const authz = createAuthz();
  const result = evaluatePolicy({
    action: "inventory.read",
    authz,
    mode: "branch",
    requireActiveBranch: true,
    resource: {
      branchId: "BRANCH_A",
    },
  });

  assert.equal(result.allowed, true);
});

test("denies branch-scoped action in different branch", () => {
  const authz = createAuthz();
  const result = evaluatePolicy({
    action: "inventory.read",
    authz,
    mode: "branch",
    requireActiveBranch: true,
    resource: {
      branchId: "BRANCH_B",
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.code, "AUTHZ_ACTION_DENIED");
});

test("explicit mode with no grants does not fall back to legacy role permissions", () => {
  const permissionGrants = [];
  const authz = {
    userId: "user-2",
    role: "BRANCH_ADMIN",
    permissionMode: "EXPLICIT",
    isGlobalAdmin: false,
    systemRoles: [],
    taskRoles: [],
    branchAssignments: [],
    allowedBranchIds: ["BRANCH_A"],
    activeBranchId: "BRANCH_A",
    permissionGrants,
    permissionGrantMap: buildPermissionGrantMap(permissionGrants),
  };
  authz.permissions = buildPermissionSet(authz);

  const result = evaluatePolicy({
    action: "inventory.read",
    authz,
    mode: "branch",
    requireActiveBranch: true,
    resource: { branchId: "BRANCH_A" },
  });

  assert.equal(authz.permissions.has("inventory.read"), false);
  assert.equal(result.allowed, false);
  assert.equal(result.code, "AUTHZ_ACTION_DENIED");
});
