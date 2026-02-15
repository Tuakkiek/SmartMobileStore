# Warehouse Dashboard Operations Runbook

## 1. Scheduler Env Vars and Behavior

The replenishment scheduler is controlled by backend environment variables in
`backend/src/modules/inventory/replenishmentScheduler.js`.

### Core scheduler flags

- `REPLENISHMENT_SCHEDULER_ENABLED`
  - Default: `true`
  - If `false`, no automatic daily snapshot is scheduled.
- `REPLENISHMENT_SCHEDULER_STARTUP_CATCHUP`
  - Default: `true`
  - If `true`, server startup triggers a one-time catch-up run when:
    - current time is after scheduled run time
    - no snapshot exists for today

### Daily schedule

- `REPLENISHMENT_SCHEDULER_HOUR`
  - Default: `2` (02:00)
  - Range: `0-23`
- `REPLENISHMENT_SCHEDULER_MINUTE`
  - Default: `0`
  - Range: `0-59`

### Analysis tuning

- `REPLENISHMENT_ANALYSIS_LIMIT`
  - Default: `300`
  - Range: `1-500`
- `REPLENISHMENT_SURPLUS_THRESHOLD`
  - Default: `20`
  - Range: `0-100000`

### Notification/monitoring

- `REPLENISHMENT_NOTIFICATIONS_ENABLED`
  - Default: `true`
  - Controls WAREHOUSE_MANAGER critical-summary notifications.
- `OMNICHANNEL_MONITORING_ENABLED`
  - Default: `true`
  - Controls monitoring event inserts for notification outcomes.

## 2. Manual Snapshot Run Procedure

Use this when validating data, performing incident recovery, or running
parallel verification before enabling full automation.

### Step 1: Call manual snapshot API

`ADMIN` and `WAREHOUSE_MANAGER` can trigger it:

```bash
curl -X POST "http://<host>:5000/api/inventory/dashboard/replenishment/run-snapshot" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

Expected successful response fields:

- `success: true`
- `message: "Da tao replenishment snapshot"`
- `result.success: true`
- `result.snapshotDateKey: "YYYY-MM-DD"`

### Step 2: Verify snapshot is used by dashboard

```bash
curl "http://<host>:5000/api/inventory/dashboard/replenishment" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Confirm:

- `dataSource: "SNAPSHOT"`
- `snapshot.snapshotDateKey` is current run date
- `recommendations` is non-empty when low stock exists

### Step 3: Optional live-vs-snapshot comparison

```bash
curl "http://<host>:5000/api/inventory/dashboard/replenishment?source=live" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Use this for validation only; no automatic transfer execution is done by this
endpoint.

## 3. Rollback and Parallel-Run Notes

### Rollback switches (fastest safe fallback)

1. Set `REPLENISHMENT_SCHEDULER_ENABLED=false`
2. Set `REPLENISHMENT_NOTIFICATIONS_ENABLED=false` (optional but recommended)
3. Restart backend service
4. Continue store operations with manual transfer workflow
5. Use `source=live` query if recommendations are still needed without snapshot writes

### Parallel-run recommendation

Run legacy/manual replenishment process and new dashboard in parallel for a
controlled window (for example 2-4 weeks):

1. Keep transfer approval manual (`/transfers/:id/approve`, `/ship`, `/receive`)
2. Trigger one manual snapshot daily
3. Compare:
   - snapshot output (`source=snapshot`)
   - live output (`source=live`)
4. Track discrepancy trends before switching to full scheduler automation
5. Keep auditability by reviewing transfer `StockMovement` records per transfer number

### Production caution

The replenishment engine generates recommendations only. Physical stock changes
still require explicit transfer lifecycle API actions, so rollback risk is low
if scheduler output appears incorrect.
