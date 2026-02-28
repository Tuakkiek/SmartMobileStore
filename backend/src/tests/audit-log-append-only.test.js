import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import AuditLog, {
  AUDIT_LOG_APPEND_ONLY_ERROR_CODE,
} from "../modules/audit/AuditLog.js";

let mongoServer;

const buildBaseAuditDoc = () => ({
  entityType: "ORDER",
  entityId: new mongoose.Types.ObjectId().toString(),
  actionType: "UPDATE_STATUS",
  outcome: "SUCCESS",
  actor: {
    actorType: "USER",
    userId: new mongoose.Types.ObjectId(),
    role: "ORDER_MANAGER",
    source: "TEST",
  },
});

before(
  async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "audit-log-append-only-test",
    });
  },
  { timeout: 120000 }
);

beforeEach(async () => {
  // deleteMany is append-only blocked by schema hooks; clear using collection directly.
  await AuditLog.collection.deleteMany({});
});

after(
  async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  },
  { timeout: 120000 }
);

test("AuditLog blocks update operations", async () => {
  const doc = await AuditLog.create(buildBaseAuditDoc());

  await assert.rejects(
    AuditLog.updateOne({ _id: doc._id }, { $set: { note: "edited" } }),
    (error) => {
      assert.equal(error?.code, AUDIT_LOG_APPEND_ONLY_ERROR_CODE);
      return true;
    }
  );
});

test("AuditLog blocks delete operations", async () => {
  const doc = await AuditLog.create(buildBaseAuditDoc());

  await assert.rejects(
    AuditLog.deleteOne({ _id: doc._id }),
    (error) => {
      assert.equal(error?.code, AUDIT_LOG_APPEND_ONLY_ERROR_CODE);
      return true;
    }
  );
});

test("AuditLog blocks updates through document save", async () => {
  const doc = await AuditLog.create(buildBaseAuditDoc());
  doc.note = "edited-note";

  await assert.rejects(
    doc.save(),
    (error) => {
      assert.equal(error?.code, AUDIT_LOG_APPEND_ONLY_ERROR_CODE);
      return true;
    }
  );
});
