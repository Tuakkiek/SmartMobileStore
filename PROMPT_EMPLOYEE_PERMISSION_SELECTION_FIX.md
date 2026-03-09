# Developer PromptFix Employee Permission Selection Feature

## Issue Description

Currently, the admin cannot create employee accounts that allow users to click and select the functions/permissions I want them to have. When creating a new employee, the admin should be able to see and select specific permissions from a list.

## Current Behavior

- The admin can access the "Employees" page and click "Them nhan vien" (Add employee)
- The dialog shows a 3-step wizard: Basic → Branch → Permissions
- However, in Step 3 (Permissions), the admin only sees a message: "Granular permission flow is disabled."
- The checkbox list of permissions is not displayed, preventing the admin from selecting specific functions

## Expected Behavior

- In Step 3 of the employee creation wizard, the admin should see:
  1. A "Template quick-start" dropdown to select a permission template
  2. A scrollable list of permissions grouped by module (e.g., order, product, warehouse)
  3. Each permission should have a checkbox that the admin can click to enable/disable
  4. The admin should be able to select multiple permissions by clicking on them

## Root Cause

The granular permission feature is controlled by a feature flag that is disabled by default:

- `VITE_FEATURE_PERMISSION_USER_MANAGEMENT` environment variable is set to "false" (or not set)
- The frontend checks this flag via the `isGranularFeatureEnabled()` function in EmployeesPage.jsx

## Files to Modify

### Frontend Configuration

**File**: `SmartMobileStore/frontend/.env` (create if not exists)

Add the following environment variable to enable the feature:

```
VITE_FEATURE_PERMISSION_USER_MANAGEMENT=true
```

### Frontend Code (if additional fixes needed)

**File**: `SmartMobileStore/frontend/src/pages/admin/EmployeesPage.jsx`

Key areas to verify:

- Line ~62: `isGranularFeatureEnabled` function checks the feature flag
- Line ~310: The permission selection UI is rendered when `granularEnabled` is true
- Line ~350-380: Template selection dropdown
- Line ~380-420: Permission checkboxes grouped by module

### Backend (if API changes needed)

**File**: `SmartMobileStore/backend/src/modules/auth/userController.js`

Verify:

- `createEmployee` function (line ~260) handles granular permissions
- `syncExplicitPermissionsForUser` properly saves permission assignments

## Testing Checklist

After implementing the fix:

1. [ ] Restart the frontend development server
2. [ ] Log in as admin
3. [ ] Navigate to "Quan ly nhan vien" (Employee Management)
4. [ ] Click "Them nhan vien" (Add employee)
5. [ ] Complete Step 1 (Basic Info) with required fields
6. [ ] Click "Next" to go to Step 2 (Branch)
7. [ ] Select a branch and click "Next"
8. [ ] **Verify Step 3 shows**: Template dropdown + scrollable list of permission checkboxes
9. [ ] Click on several permissions to select them (checkboxes should be checkable)
10. [ ] Click "Tao nhan vien" to create the employee
11. [ ] Verify the employee is created with the selected permissions

## Additional Notes

- The permission list should be grouped by module (e.g., order, product, warehouse, etc.)
- Each permission item should show: permission key, description, scope type (GLOBAL/BRANCH/SELF), and whether it's sensitive
- The admin should be able to see which permissions are "Sensitive" (highlighted in red)
- A preview of effective grants should be visible before finalizing
