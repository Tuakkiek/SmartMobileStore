import test from "node:test";
import assert from "node:assert/strict";
import User from "../modules/auth/User.js";
import { setActiveBranchContext } from "../modules/auth/authController.js";

const createMockRes = () => {
  const res = {
    statusCode: 200,
    payload: null,
    cookieCalls: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
    cookie(name, value, options) {
      this.cookieCalls.push({ name, value, options });
      return this;
    },
  };
  return res;
};

test("setActiveBranchContext denies non-global staff branch switching", async () => {
  const req = {
    user: { _id: "staff-user-1" },
    body: { branchId: "BRANCH_B" },
    authz: {
      isGlobalAdmin: false,
      requiresBranchAssignment: true,
      allowedBranchIds: ["BRANCH_A"],
    },
  };
  const res = createMockRes();

  await setActiveBranchContext(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload?.code, "AUTHZ_BRANCH_SWITCH_FORBIDDEN");
});

test("setActiveBranchContext allows global admin branch switching", async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;

  User.findByIdAndUpdate = async () => ({
    _id: "global-admin-1",
    role: "GLOBAL_ADMIN",
    authzVersion: 2,
    authzState: "ACTIVE",
    systemRoles: ["GLOBAL_ADMIN"],
    taskRoles: [],
    branchAssignments: [],
    permissionsVersion: 1,
    preferences: {
      defaultBranchId: "BRANCH_X",
    },
  });

  const req = {
    user: { _id: "global-admin-1" },
    body: { branchId: "BRANCH_X" },
    authz: {
      authzVersion: 2,
      authzState: "ACTIVE",
      role: "GLOBAL_ADMIN",
      systemRoles: ["GLOBAL_ADMIN"],
      taskRoles: [],
      branchAssignments: [],
      allowedBranchIds: [],
      activeBranchId: "",
      isGlobalAdmin: true,
      requiresBranchAssignment: false,
    },
  };
  const res = createMockRes();

  try {
    await setActiveBranchContext(req, res);
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
  assert.equal(res.cookieCalls.length, 1);
  assert.equal(res.cookieCalls[0].name, "activeBranchId");
  assert.equal(res.cookieCalls[0].value, "BRANCH_X");
});
