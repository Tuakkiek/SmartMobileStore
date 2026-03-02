# PROMPT XỬ LÝ LAG WAREHOUSE VISUALIZER

## Vấn đề hiện tại:

Trang http://localhost:5173/admin/warehouse-config/{id}/visual bị lag khi load vì:

1. Gọi API `/warehouse/config/${id}/layout` lấy tất cả locations cùng lúc
2. Render tất cả bins (vị trí kho) cùng lúc mà không phân trang
3. Hàm `getGroupedLocations()` được gọi lại mỗi khi render
4. Mỗi bin có Tooltip được render ngay cả khi không hover
5. Grid layout với quá nhiều elements gây DOM overload

## Giải pháp đề xuất:

### 1. Lazy Load theo Zone và Aisle:

- Khi chuyển zone, chỉ load dữ liệu của zone đó
- Trong mỗi zone, load từng dãy (aisle) một thay vì tất cả
- Sử dụng "Load more" button hoặc infinite scroll cho mỗi aisle

### 2. Cải thiện API (nếu cần):

- Thêm parameter: `?zone=ZONE_CODE&aisle=A1&page=1&limit=5`
- Backend trả về từng trang của aisles thay vì tất cả

### 3. Trong WarehouseVisualizerPage.jsx:

#### Thêm state:

```
javascript
const [loadedAisles, setLoadedAisles] = useState({}); // { aisleCode: boolean }
const [aislesPerZone, setAislesPerZone] = useState({}); // { zoneCode: [aisles] }
```

#### Thêm hàm load thêm:

```
javascript
const loadMoreAisle = async (aisleCode) => {
  if (loadedAisles[aisleCode]) return;
  // Gọi API với aisle filter hoặc filter từ client
  setLoadedAisles(prev => ({ ...prev, [aisleCode]: true }));
};
```

#### Sửa render logic:

- Chỉ render aisles đã loaded
- Thêm "Xem thêm dãy" button cho mỗi zone
- Sử dụng React.memo cho Bin component
- Lazy load Tooltip chỉ khi hover (sử dụng `delay`)

### 4. Tối ưu getGroupedLocations:

```
javascript
// Cache kết quả với useMemo
const groupedLocations = useMemo(() => {
  return getGroupedLocations(activeZone);
}, [locations, activeZone, loadedAisles]);
```

### 5. Thêm loading skeleton:

- Hiển thị skeleton thay vì chờ tất cả data

## Files cần sửa:

- frontend/src/pages/admin/WarehouseVisualizerPage.jsx
- backend/src/modules/warehouse/warehouseConfigController.js (nếu cần thêm API paginated)

## Kết quả mong đợi:

- Load lần đầu nhanh hơn (chỉ zone đầu tiên)
- Scroll mượt mà hơn
- Giảm DOM elements được render cùng lúc
- UX: Thêm nút "Xem thêm dãy" hoặc infinite scroll
