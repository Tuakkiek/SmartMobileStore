import test from "node:test";
import assert from "node:assert/strict";
import { getPOSStaffStats } from "../modules/analytics/employeeAnalyticsService.js";

test("employee analytics uses scoped repository mode", async () => {
  const calls = [];
  const fakeRepo = {
    aggregate(pipeline, options) {
      calls.push({ pipeline, options });
      return Promise.resolve([
        {
          _id: {
            staffId: "staff-1",
            staffName: "POS One",
          },
          orderCount: 12,
          revenue: 1230000,
          cancelledCount: 1,
        },
      ]);
    },
  };

  const result = await getPOSStaffStats({
    startDate: "2026-02-01T00:00:00.000Z",
    endDate: "2026-02-16T23:59:59.999Z",
    scopeMode: "assigned",
    orderRepo: fakeRepo,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "POS One");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.mode, "assigned");
  assert.ok(calls[0].pipeline[0].$match.createdAt);
  assert.equal(calls[0].pipeline[0].$match.orderSource, "IN_STORE");
});
