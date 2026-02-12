# 🚀 QUICK START - TÍCH HỢP NGAY

## 📦 COPY FILES VÀO PROJECT

### Backend (3 files)

```bash
# 1. Model
cp warehouse-config/backend/WarehouseConfiguration.js \
   your-project/backend/src/modules/warehouse/

# 2. Controller
cp warehouse-config/backend/warehouseConfigController.js \
   your-project/backend/src/modules/warehouse/

# 3. Routes
cp warehouse-config/backend/warehouseConfigRoutes.js \
   your-project/backend/src/modules/warehouse/
```

### Frontend (2 files)

```bash
# 1. Main Page
cp warehouse-config/frontend/WarehouseConfigPage.jsx \
   your-project/frontend/src/pages/admin/

# 2. Preview Component
cp warehouse-config/frontend/WarehouseStructurePreview.jsx \
   your-project/frontend/src/components/warehouse/
```

---

## ⚡ CẤU HÌNH BACKEND

### 1. Add route vào server

**File: `backend/src/server.js` hoặc `backend/src/routes/index.js`**

```javascript
import warehouseConfigRoutes from "./modules/warehouse/warehouseConfigRoutes.js";

// Thêm route này
app.use("/api/warehouse/config", warehouseConfigRoutes);
```

### 2. Restart backend

```bash
cd backend
npm run dev
```

### 3. Verify backend

```bash
# Test API
curl http://localhost:5000/api/warehouse/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Kết quả mong đợi:
# {
#   "success": true,
#   "warehouses": [],
#   "pagination": {...}
# }
```

---

## ⚡ CẤU HÌNH FRONTEND

### 1. Add route vào App.jsx

**File: `frontend/src/App.jsx`**

```jsx
import WarehouseConfigPage from "@/pages/admin/WarehouseConfigPage";

// Trong phần routes của ADMIN
{
  path: "admin",
  element: <AdminLayout />,
  children: [
    // ... các routes khác
    {
      path: "warehouse-config",
      element: <WarehouseConfigPage />,
    },
  ],
}
```

### 2. Add menu link (Optional)

**File: `frontend/src/components/AdminSidebar.jsx` hoặc `AdminLayout.jsx`**

```jsx
import { Warehouse } from "lucide-react";

// Thêm vào menu
<NavLink to="/admin/warehouse-config">
  <Warehouse className="w-5 h-5" />
  <span>Cấu Hình Kho</span>
</NavLink>
```

### 3. Restart frontend

```bash
cd frontend
npm run dev
```

### 4. Verify frontend

1. Login as ADMIN
2. Vào: `http://localhost:5173/admin/warehouse-config`
3. Thấy trang "Quản Lý Cấu Hình Kho" ✅

---

**Version:** 1.0.0  
**Ready to use:** ✅ YES  
**Installation time:** ~10 minutes
