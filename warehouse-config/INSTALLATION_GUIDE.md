# 🏭 HỆ THỐNG QUẢN LÝ CẤU HÌNH KHO

## 📋 TỔNG QUAN

Hệ thống cho phép người dùng **TỰ TẠO VÀ QUẢN LÝ** cấu trúc kho của mình theo mô hình:

```
KHO (Warehouse)
└── KHU (Zone)
    └── DÃY (Aisle)
        └── KỆ (Shelf)
            └── Ô (Bin)
```

### Ví dụ thực tế:

```
Kho HCM (WH-HCM)
├── KHU A - Điện thoại (200m²)
│   ├── Dãy 01 (10 kệ, mỗi kệ 5 tầng, mỗi tầng 10 ô)
│   ├── Dãy 02 (10 kệ, mỗi kệ 5 tầng, mỗi tầng 10 ô)
│   └── Dãy 03 (10 kệ, mỗi kệ 5 tầng, mỗi tầng 10 ô)
│   → Total: 1,500 vị trí
│
├── KHU B - Máy tính bảng (150m²)
│   ├── Dãy 01-05 (8 kệ/dãy, 4 tầng/kệ, 8 ô/tầng)
│   → Total: 1,280 vị trí
│
├── KHU C - Laptop & Mac (180m²)
├── KHU D - Phụ kiện (100m²)
└── KHU E - Hàng lỗi/trả hàng (50m²)
```

---

## 🚀 CÀI ĐẶT

### 1. Backend Setup

#### A. Copy các files vào project

```bash
# Copy Model
cp WarehouseConfiguration.js backend/src/modules/warehouse/

# Copy Controller
cp warehouseConfigController.js backend/src/modules/warehouse/

# Copy Routes
cp warehouseConfigRoutes.js backend/src/modules/warehouse/
```

#### B. Update routes trong server

**File: `backend/src/server.js` hoặc `backend/src/routes/index.js`**

```javascript
import warehouseConfigRoutes from "./modules/warehouse/warehouseConfigRoutes.js";

// Add this route
app.use("/api/warehouse/config", warehouseConfigRoutes);
```

#### C. Restart backend

```bash
cd backend
npm run dev
```

---

### 2. Frontend Setup

#### A. Copy component

```bash
cp WarehouseConfigPage.jsx frontend/src/pages/admin/
```

#### B. Add route vào App.jsx

**File: `frontend/src/App.jsx`**

```jsx
import WarehouseConfigPage from "@/pages/admin/WarehouseConfigPage";

// Trong routes của ADMIN
{
  path: "warehouse-config",
  element: <WarehouseConfigPage />,
}
```

#### C. Add menu link (optional)

**File: `frontend/src/components/Layout.jsx` hoặc AdminSidebar**

```jsx
<NavLink to="/admin/warehouse-config">
  <Warehouse className="w-5 h-5" />
  Cấu Hình Kho
</NavLink>
```

#### D. Restart frontend

```bash
cd frontend
npm run dev
```

---

## 📖 HƯỚNG DẪN SỬ DỤNG

### Bước 1: Tạo Kho Mới

1. **Login as ADMIN**
2. Vào: `/admin/warehouse-config`
3. Click **"Tạo Kho Mới"**

4. **Tab "Thông Tin Cơ Bản":**
   - Mã Kho: `WH-HCM` (Format: WH-XXX)
   - Tên Kho: `Kho Hồ Chí Minh`
   - Địa chỉ: `123 Đường ABC, Quận 1, TP.HCM`
   - Diện tích: `1000` (m²)
   - Trạng thái: `Đang lập kế hoạch`

5. **Tab "Cấu Hình Khu":**

   **Thêm Khu A - Điện thoại:**
   - Mã Khu: `A`
   - Tên Khu: `Khu A - Điện thoại`
   - Mô tả: `Khu chuyên lưu iPhone, Samsung, Xiaomi`
   - Số Dãy: `3` (01, 02, 03)
   - Kệ/Dãy: `10` (mỗi dãy có 10 kệ)
   - Ô/Kệ: `5` (mỗi kệ có 5 ô)
   - Sức chứa/Ô: `100` (mỗi ô chứa 100 sản phẩm)
   
   → **Dự kiến: 150 vị trí | Sức chứa: 15,000 sản phẩm**
   
   Click **"Thêm Khu"**

   **Thêm Khu B - Máy tính bảng:**
   - Mã Khu: `B`
   - Tên Khu: `Khu B - Máy tính bảng`
   - Số Dãy: `2`
   - Kệ/Dãy: `8`
   - Ô/Kệ: `4`
   - Sức chứa/Ô: `50`
   
   → **Dự kiến: 64 vị trí | Sức chứa: 3,200 sản phẩm**

   **Thêm các khu khác tương tự...**

6. **Xem tổng kết:**
   - Tổng: 5 khu
   - Dự kiến: 500+ vị trí

7. Click **"Tạo Kho"**

---

### Bước 2: Tạo Vị Trí Kho (Generate Locations)

**Sau khi tạo cấu hình kho, cần generate vị trí thực tế:**

1. Trong danh sách kho, tìm kho vừa tạo
2. Click nút **"Tạo Vị Trí"**
3. Xác nhận: "Tạo vị trí kho sẽ tạo tất cả các vị trí..."
4. Hệ thống sẽ tạo:
   - ✅ Tất cả vị trí theo cấu hình
   - ✅ Mã vị trí tự động (WH-HCM-A-01-01-01)
   - ✅ QR Code cho mỗi vị trí
   - ✅ Cập nhật database

**Kết quả:**
```
✅ Đã tạo 500 vị trí kho thành công
```

---

### Bước 3: Sử Dụng Kho

**Sau khi generate locations, các vị trí sẽ sẵn sàng cho:**

1. **Nhập hàng (Goods Receipt)**
   - Khi nhận hàng, chọn vị trí từ danh sách
   - VD: `WH-HCM-A-01-05-03` (Kho HCM, Khu A, Dãy 01, Kệ 05, Ô 03)

2. **Xuất hàng (Pick Orders)**
   - Hệ thống tự động gợi ý vị trí có hàng
   - Warehouse staff đi đúng vị trí lấy hàng

3. **Chuyển kho (Transfer Stock)**
   - Chuyển hàng giữa các vị trí
   - VD: A-01-01-01 → B-02-03-05

---

## 🎯 CẤU TRÚC MÃ VỊ TRÍ

### Format:
```
WH-XXX-Y-AA-BB-CC

WH-HCM-A-01-05-03
│  │   │ │  │  │
│  │   │ │  │  └─ Ô (Bin): 03
│  │   │ │  └──── Kệ (Shelf): 05
│  │   │ └─────── Dãy (Aisle): 01
│  │   └────────── Khu (Zone): A
│  └────────────── Mã kho: HCM
└───────────────── Tiền tố: WH (Warehouse)
```

### Ví dụ:
- `WH-HCM-A-01-01-01`: Kho HCM, Khu A, Dãy 01, Kệ 01, Ô 01
- `WH-HCM-B-02-05-10`: Kho HCM, Khu B, Dãy 02, Kệ 05, Ô 10
- `WH-HN-C-03-08-07`: Kho Hà Nội, Khu C, Dãy 03, Kệ 08, Ô 07

---

## ⚙️ API ENDPOINTS

### GET /api/warehouse/config
Lấy danh sách tất cả kho

**Query params:**
- `status`: PLANNING | ACTIVE | INACTIVE
- `search`: Tìm theo mã hoặc tên kho
- `page`: Trang (default: 1)
- `limit`: Số lượng/trang (default: 20)

### POST /api/warehouse/config
Tạo kho mới (ADMIN only)

### POST /api/warehouse/config/:id/generate-locations
Tạo vị trí kho từ cấu hình (ADMIN only)

### GET /api/warehouse/config/:id/stats
Xem thống kê kho

---

## 🔒 PERMISSIONS

### ADMIN
- ✅ Tạo kho mới
- ✅ Sửa cấu hình kho (chỉ khi chưa generate)
- ✅ Xóa kho (chỉ khi chưa generate)
- ✅ Generate locations
- ✅ Xem thống kê

### WAREHOUSE_STAFF
- ✅ Xem danh sách kho
- ✅ Xem thống kê kho
- ❌ Không được tạo/sửa/xóa

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Không thể sửa sau khi generate
- Sau khi click "Tạo Vị Trí", cấu trúc kho bị khóa
- Không thể sửa số dãy, kệ, ô
- Lý do: Đã có data thực tế trong các vị trí

### 2. Xóa kho
- Chỉ xóa được kho chưa generate
- Nếu đã generate, phải xóa tất cả vị trí trước

### 3. Mã kho
- Format: `WH-XXX` (2-10 ký tự chữ)
- VD: WH-HCM, WH-HN, WH-DANANG ✅
- VD: WH123, WAREHOUSE ❌

### 4. Performance
- Kho lớn (50,000+ vị trí) có thể mất 1-2 phút để generate
- Sử dụng transaction để đảm bảo data integrity

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Mã kho đã tồn tại"
- Mỗi kho phải có mã unique
- Đổi mã khác hoặc xóa kho cũ

### Lỗi: "Mã khu phải là duy nhất"
- Trong cùng 1 kho, mã khu phải khác nhau
- VD: Không được có 2 khu "A"

### Lỗi: "Không thể sửa kho đã tạo vị trí"
- Kho đã generate locations không thể sửa cấu trúc
- Tạo kho mới thay vì sửa

### Không thấy nút "Tạo Vị Trí"
- Đảm bảo đã login as ADMIN
- Kho phải có status PLANNING hoặc ACTIVE
- Kho chưa được generate

---

## 📚 TÀI LIỆU THAM KHẢO

### Files đã tạo:
1. `WarehouseConfiguration.js` - Model
2. `warehouseConfigController.js` - Controller
3. `warehouseConfigRoutes.js` - Routes
4. `WarehouseConfigPage.jsx` - Frontend UI
5. `INSTALLATION_GUIDE.md` - Tài liệu này

### Related files cần có:
- `WarehouseLocation.js` - Model vị trí kho (đã có)
- `authMiddleware.js` - Middleware xác thực
- `protect`, `restrictTo` functions

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-12  
**Status:** ✅ Production Ready
