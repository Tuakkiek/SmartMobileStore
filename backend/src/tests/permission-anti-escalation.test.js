import test from "node:test";
import assert from "node:assert/strict";
import { validateGrantAntiEscalation } from "../authz/userPermissionService.js";

test("branch admin cannot grant global scoped permission", () => {
  const actorAuthz = {
    userId: "actor-1",
    isGlobalAdmin: false,
    permissions: new Set(["users.manage.branch"]),
    allowedBranchIds: ["BRANCH_A"],
  };

  const result = validateGrantAntiEscalation({
    actorAuthz,
    targetUserId: "target-1",
    assignments: [
      {
        key: "users.manage.global",
        scopeType: "GLOBAL",
        scopeId: "",
      },
    ],
  });

  assert.equal(result.allowed, false);
  assert.ok(result.violations.some((item) => item.includes("Global scope")));
});

test("branch admin cannot grant permission outside owned branch", () => {
  const actorAuthz = {
    userId: "actor-1",
    isGlobalAdmin: false,
    permissions: new Set(["inventory.read", "inventory.write"]),
    allowedBranchIds: ["BRANCH_A"],
  };

  const result = validateGrantAntiEscalation({
    actorAuthz,
    targetUserId: "target-1",
    assignments: [
      {
        key: "inventory.write",
        scopeType: "BRANCH",
        scopeId: "BRANCH_B",
      },
    ],
  });

  assert.equal(result.allowed, false);
  assert.ok(result.violations.some((item) => item.includes("outside actor branch scope")));
});

test("branch admin can grant owned branch permission within assigned branch", () => {
  const actorAuthz = {
    userId: "actor-1",
    isGlobalAdmin: false,
    permissions: new Set(["inventory.read", "inventory.write"]),
    allowedBranchIds: ["BRANCH_A"],
  };

  const result = validateGrantAntiEscalation({
    actorAuthz,
    targetUserId: "target-1",
    assignments: [
      {
        key: "inventory.read",
        scopeType: "BRANCH",
        scopeId: "BRANCH_A",
      },
    ],
  });

  assert.equal(result.allowed, true);
  assert.equal(result.violations.length, 0);
});
