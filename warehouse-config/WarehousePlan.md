# Ninh Kiều iSTORE: Complete Workflow Analysis & Multi-Branch Warehouse Plan

## I. CURRENT WORKFLOW: Product → Sale

Based on your codebase, here's the complete journey:

### 📦 **Phase 1: Product Creation**
```
PRODUCT_MANAGER creates product via Universal Product System
├─ Brand selection (Apple, Samsung, etc.)
├─ Product Type selection (Smartphone, Laptop, etc.)
├─ Base product info (name, model, specs, images)
└─ Variant generation (color × storage combinations)
    ├─ Auto SKU: "00000001", "00000002"...
    ├─ Each variant: price, originalPrice, stock=0 (initially)
    └─ Slug generation for SEO
```

**Key Controllers:**
- `universalProductController.js` → `create()`
- Sets `stock: 0` initially (controlled by WAREHOUSE_MANAGER only)

---

### 🏭 **Phase 2: Goods Receipt (Nhập Kho)**

**Current Implementation** (from `goodsReceiptController.js`):

```
WAREHOUSE_MANAGER creates Purchase Order (PO)
├─ Supplier info
├─ Items list (SKU, quantity, unit price)
├─ Expected delivery date
└─ Status: PENDING → CONFIRMED (after approval)

When goods arrive:
├─ WAREHOUSE_STAFF scans/receives each SKU
├─ Assigns to warehouse location (Zone-Aisle-Shelf-Bin)
│   └─ System suggests location based on:
│       ├─ Same SKU already stored (priority)
│       ├─ Product category match
│       └─ Available capacity
├─ Creates Inventory record
│   └─ {sku, locationCode, quantity, status: "GOOD"}
├─ Logs StockMovement (type: INBOUND)
└─ Updates PO: receivedQuantity += quantity

On completion:
└─ Generate GRN (Goods Receipt Note)
```

**⚠️ Current Gap:** No automatic sync to `UniversalVariant.stock` or `StoreInventory`

---

### 🏪 **Phase 3: Inventory Distribution (Current vs Needed)**

#### **What EXISTS:**
```javascript
// StoreInventory model
{
  storeId, productId, variantSku,
  quantity, reserved, available,
  locationId
}

// Manual stock operations
- Pick (xuất kho theo đơn)
- Transfer (chuyển kho nội bộ)
- Cycle Count (kiểm kê)
```

#### **What's MISSING (KiotViet-style):**
```
❌ Automatic warehouse → store distribution
❌ Centralized inventory dashboard across all locations
❌ Inter-branch transfer workflows
❌ Automatic low-stock alerts
❌ Stock rebalancing suggestions
```

---

### 🛒 **Phase 4: Customer Order (Omnichannel)**

**Sophisticated Routing System** (already implemented):

```javascript
// orderController.js → createOrder()

Customer places order:
├─ Frontend: CartPage → CheckoutPage
│   └─ Selects fulfillmentType:
│       ├─ HOME_DELIVERY
│       ├─ CLICK_AND_COLLECT (store pickup)
│       └─ IN_STORE (POS order)
│
├─ Backend validates cart items
│
└─ If HOME_DELIVERY or CLICK_AND_COLLECT:
    ├─ routingService.findBestStore(items, address)
    │   └─ Scoring algorithm:
    │       ├─ Stock availability (has all items)
    │       ├─ Geographic proximity (province/district match)
    │       └─ Store capacity (currentOrders < maxOrdersPerDay)
    │
    ├─ routingService.reserveInventory(storeId, items)
    │   └─ StoreInventory.reserved += quantity
    │   └─ Updates available = quantity - reserved
    │
    └─ Order created with assignedStore
```

**Payment Processing:**
```
If VNPAY:
├─ Status: PENDING_PAYMENT (15min timer)
├─ On success: → PENDING (waiting for fulfillment)
└─ On failure/timeout: auto-cancel + release reserved stock

If COD/CASH:
└─ Status: PENDING → ready for warehouse picking
```

---

### 📋 **Phase 5: Order Fulfillment**

**Warehouse Picking** (`stockOperationsController.js`):

```
WAREHOUSE_STAFF receives pick list:
├─ GET /warehouse/pick-list/:orderId
│   └─ Returns optimal locations for each SKU
│       └─ Sorted by: quantity DESC, zone proximity
│
├─ Staff scans items at each location
│   └─ POST /warehouse/pick
│       ├─ Deducts Inventory.quantity
│       ├─ Updates WarehouseLocation.currentLoad
│       └─ Logs StockMovement (type: OUTBOUND)
│
└─ Status updates:
    PENDING → CONFIRMED → PROCESSING → PREPARING_SHIPMENT
```

**Delivery Paths:**

```
HOME_DELIVERY:
├─ ORDER_MANAGER assigns shipper
├─ Status: PREPARING_SHIPMENT → SHIPPING
├─ Shipper updates: SHIPPING → DELIVERED
└─ On DELIVERED: inventory actually deducted
    └─ routingService.deductInventory()

CLICK_AND_COLLECT:
├─ Status: PREPARING_SHIPMENT → READY_FOR_PICKUP
├─ Customer receives pickup code
└─ At store: verify code → PICKED_UP

IN_STORE (POS):
├─ POS_STAFF creates order
├─ CASHIER processes payment
├─ If instantFulfillment=true:
│   └─ Immediately: COMPLETED + deduct stock
└─ Else: follows warehouse picking flow
```

---

## II. KiotViet Comparison

### What KiotViet Does Well:

1. **Multi-branch inventory sync** (real-time)
2. **Automatic stock transfers** between branches
3. **Centralized dashboard** showing all locations
4. **Low stock alerts** with auto-replenishment suggestions
5. **Barcode-based receiving/picking**
6. **Supplier management** with payment tracking
7. **Profit margin tracking** per product/branch

### Your System's Current State:

| Feature | KiotViet | Ninh Kiều iSTORE | Gap |
|---------|----------|------------------|-----|
| Product Management | ✅ | ✅ (Better: dynamic types) | None |
| Purchase Orders | ✅ | ✅ | None |
| Goods Receipt | ✅ | ✅ (with location assignment) | None |
| **Multi-location Inventory** | ✅ | ⚠️ Partial | **Critical** |
| **Inter-branch Transfers** | ✅ | ⚠️ Schema only | **Critical** |
| Warehouse Picking | ✅ | ✅ (advanced pick lists) | None |
| Omnichannel Orders | ⚠️ Basic | ✅ (sophisticated routing) | **You're ahead** |
| POS Integration | ✅ | ✅ | None |
| Cycle Counting | ✅ | ✅ | None |
| **Centralized Dashboard** | ✅ | ❌ | **Critical** |

---

## III. FEASIBILITY ANALYSIS: Multi-Branch Warehouse System

### ✅ **HIGHLY FEASIBLE** - You Already Have 80% of Infrastructure

**Existing Strengths:**
1. **Data Models** ✅ Complete
   - WarehouseConfiguration, WarehouseLocation, Inventory
   - Store, StoreInventory
   - StockMovement (audit trail)
   - StockTransfer (inter-branch schema)

2. **Core Operations** ✅ Implemented
   - Goods receipt with location assignment
   - Pick list generation
   - Stock movement tracking
   - Cycle counting

3. **Omnichannel Routing** ✅ Advanced
   - Better than most systems
   - Intelligent store selection
   - Stock reservation/release

**Missing Pieces (Need Implementation):**

1. **Warehouse ↔ Store Sync** ❌
2. **Inter-branch Transfers** ⚠️ Partial
3. **Centralized Inventory View** ❌
4. **Automatic Replenishment** ❌

---

## IV. DETAILED IMPLEMENTATION PLAN

### 🎯 **PHASE 1: Foundation (Weeks 1-2)**

#### **1.1 Sync Warehouse → Store Inventory**

**Create Service:** `inventorySyncService.js`

```javascript
// When goods are received at warehouse
export const syncWarehouseToStores = async (grn) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    for (const item of grn.items) {
      // Update UniversalVariant.stock (global)
      const variant = await UniversalVariant.findOne({ sku: item.sku });
      variant.stock += item.receivedQuantity;
      await variant.save({ session });
      
      // Distribute to stores based on rules
      const allocation = await calculateStoreAllocation({
        sku: item.sku,
        totalQuantity: item.receivedQuantity,
      });
      
      for (const { storeId, quantity } of allocation) {
        await StoreInventory.findOneAndUpdate(
          { storeId, variantSku: item.sku },
          { 
            $inc: { quantity, available: quantity },
            $set: { lastRestockDate: new Date() }
          },
          { upsert: true, session }
        );
      }
      
      // Log distribution
      await StockMovement.create([{
        type: 'DISTRIBUTION',
        sku: item.sku,
        fromLocationId: item.locationId,
        distributionDetails: allocation,
        performedBy: grn.receivedBy,
      }], { session });
    }
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
};

// Smart allocation algorithm
const calculateStoreAllocation = async ({ sku, totalQuantity }) => {
  // Get all active stores
  const stores = await Store.find({ status: 'ACTIVE' });
  
  // Get current stock levels
  const currentStock = await StoreInventory.find({ variantSku: sku });
  
  // Priority rules:
  // 1. Stores with 0 stock (critical)
  // 2. Stores below minStock (low stock)
  // 3. Distribute remaining proportionally by store capacity
  
  const allocation = [];
  let remaining = totalQuantity;
  
  // Rule 1: Zero stock stores (minimum viable stock)
  for (const store of stores) {
    const stock = currentStock.find(s => s.storeId.equals(store._id));
    if (!stock || stock.quantity === 0) {
      const minViable = 5; // configurable per product
      allocation.push({ storeId: store._id, quantity: minViable });
      remaining -= minViable;
    }
  }
  
  // Rule 2: Low stock stores (up to minStock)
  for (const stock of currentStock) {
    if (stock.quantity > 0 && stock.quantity < stock.minStock) {
      const needed = stock.minStock - stock.quantity;
      const allocate = Math.min(needed, remaining);
      allocation.push({ storeId: stock.storeId, quantity: allocate });
      remaining -= allocate;
    }
  }
  
  // Rule 3: Distribute remaining by capacity
  if (remaining > 0) {
    const totalCapacity = stores.reduce((sum, s) => 
      sum + (s.capacity?.maxOrdersPerDay || 100), 0);
    
    for (const store of stores) {
      const proportion = (store.capacity?.maxOrdersPerDay || 100) / totalCapacity;
      const allocate = Math.floor(remaining * proportion);
      allocation.push({ storeId: store._id, quantity: allocate });
    }
  }
  
  return allocation;
};
```

**Update:** `goodsReceiptController.js`
```javascript
// In completeGoodsReceipt()
await grn.save({ session });

// ✅ ADD THIS:
await syncWarehouseToStores(grn, { session });
```

---

#### **1.2 Real-time Inventory Dashboard API**

**Create:** `inventoryDashboardController.js`

```javascript
export const getConsolidatedInventory = async (req, res) => {
  try {
    const { sku, productId, lowStockOnly } = req.query;
    
    // Aggregate inventory across all locations
    const pipeline = [
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $unwind: '$store' },
      {
        $group: {
          _id: '$variantSku',
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reserved' },
          totalAvailable: { $sum: '$available' },
          locations: {
            $push: {
              storeId: '$storeId',
              storeName: '$store.name',
              storeCode: '$store.code',
              quantity: '$quantity',
              reserved: '$reserved',
              available: '$available',
              status: '$status',
            }
          }
        }
      },
      {
        $lookup: {
          from: 'universalvariants',
          localField: '_id',
          foreignField: 'sku',
          as: 'variant'
        }
      },
      { $unwind: '$variant' },
      {
        $lookup: {
          from: 'universalproducts',
          localField: 'variant.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
    ];
    
    if (lowStockOnly) {
      pipeline.push({
        $match: {
          totalAvailable: { $lt: 10 } // configurable threshold
        }
      });
    }
    
    const inventory = await StoreInventory.aggregate(pipeline);
    
    res.json({
      success: true,
      inventory,
      summary: {
        totalSKUs: inventory.length,
        totalValue: inventory.reduce((sum, item) => 
          sum + (item.totalQuantity * item.variant.price), 0),
        lowStockCount: inventory.filter(i => i.totalAvailable < 10).length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStoreInventoryComparison = async (req, res) => {
  try {
    const stores = await Store.find({ status: 'ACTIVE' });
    const comparison = [];
    
    for (const store of stores) {
      const inventory = await StoreInventory.aggregate([
        { $match: { storeId: store._id } },
        {
          $group: {
            _id: null,
            totalSKUs: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalReserved: { $sum: '$reserved' },
            totalAvailable: { $sum: '$available' },
            outOfStockSKUs: {
              $sum: { $cond: [{ $eq: ['$available', 0] }, 1, 0] }
            },
            lowStockSKUs: {
              $sum: { $cond: [
                { $and: [
                  { $gt: ['$available', 0] },
                  { $lt: ['$available', '$minStock'] }
                ]}, 1, 0
              ]}
            }
          }
        }
      ]);
      
      comparison.push({
        storeId: store._id,
        storeName: store.name,
        storeCode: store.code,
        stats: inventory[0] || {},
        capacity: store.capacity,
      });
    }
    
    res.json({
      success: true,
      comparison,
      needsAttention: comparison.filter(c => 
        c.stats.outOfStockSKUs > 0 || c.stats.lowStockSKUs > 5
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

**Routes:** `inventoryDashboardRoutes.js`
```javascript
router.get('/dashboard/consolidated', getConsolidatedInventory);
router.get('/dashboard/store-comparison', getStoreInventoryComparison);
router.get('/dashboard/alerts', getLowStockAlerts);
router.get('/dashboard/movements', getRecentStockMovements);
```

---

### 🎯 **PHASE 2: Inter-Branch Transfers (Weeks 3-4)**

#### **2.1 Complete Stock Transfer Workflow**

**Update:** `StockTransfer.js` (already exists, enhance it)

**Create:** `transferController.js`

```javascript
export const requestTransfer = async (req, res) => {
  try {
    const { 
      fromStoreId, toStoreId, items, reason, notes 
    } = req.body;
    
    // Validate stock availability at source
    for (const item of items) {
      const inventory = await StoreInventory.findOne({
        storeId: fromStoreId,
        variantSku: item.sku,
      });
      
      if (!inventory || inventory.available < item.requestedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock at source: ${item.sku}`
        });
      }
    }
    
    const fromStore = await Store.findById(fromStoreId);
    const toStore = await Store.findById(toStoreId);
    
    const transferNumber = `TR${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    const transfer = await StockTransfer.create({
      transferNumber,
      fromStore: {
        storeId: fromStore._id,
        storeName: fromStore.name,
        storeCode: fromStore.code,
      },
      toStore: {
        storeId: toStore._id,
        storeName: toStore.name,
        storeCode: toStore.code,
      },
      items: items.map(item => ({
        variantSku: item.sku,
        name: item.name,
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: 0,
        receivedQuantity: 0,
      })),
      reason,
      notes,
      status: 'PENDING',
      requestedBy: req.user._id,
      requestedAt: new Date(),
    });
    
    // Notify source store manager
    await NotificationService.send({
      recipientRole: 'WAREHOUSE_MANAGER',
      storeId: fromStoreId,
      title: 'New Transfer Request',
      message: `Transfer ${transferNumber} requested by ${toStore.name}`,
    });
    
    res.status(201).json({
      success: true,
      transfer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { transferId } = req.params;
    const { approvedItems } = req.body; // Can adjust quantities
    
    const transfer = await StockTransfer.findById(transferId).session(session);
    
    if (transfer.status !== 'PENDING') {
      throw new Error('Transfer already processed');
    }
    
    // Update approved quantities
    for (const approved of approvedItems) {
      const item = transfer.items.find(i => i.variantSku === approved.sku);
      item.approvedQuantity = approved.quantity;
    }
    
    // Reserve stock at source
    for (const item of transfer.items) {
      if (item.approvedQuantity > 0) {
        await StoreInventory.findOneAndUpdate(
          {
            storeId: transfer.fromStore.storeId,
            variantSku: item.variantSku,
          },
          {
            $inc: { reserved: item.approvedQuantity }
          },
          { session }
        );
      }
    }
    
    transfer.status = 'APPROVED';
    transfer.approvedBy = req.user._id;
    transfer.approvedAt = new Date();
    await transfer.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      transfer,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const shipTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { transferId } = req.params;
    const { trackingNumber, carrier } = req.body;
    
    const transfer = await StockTransfer.findById(transferId).session(session);
    
    // Deduct from source store
    for (const item of transfer.items) {
      if (item.approvedQuantity > 0) {
        await StoreInventory.findOneAndUpdate(
          {
            storeId: transfer.fromStore.storeId,
            variantSku: item.variantSku,
          },
          {
            $inc: { 
              quantity: -item.approvedQuantity,
              reserved: -item.approvedQuantity 
            }
          },
          { session }
        );
        
        // Log movement
        await StockMovement.create([{
          type: 'TRANSFER',
          sku: item.variantSku,
          fromLocationId: null, // Store-level transfer
          quantity: item.approvedQuantity,
          referenceType: 'TRANSFER',
          referenceId: transfer.transferNumber,
          performedBy: req.user._id,
          performedByName: req.user.fullName,
          notes: `Transfer to ${transfer.toStore.storeName}`,
        }], { session });
      }
    }
    
    transfer.status = 'IN_TRANSIT';
    transfer.trackingNumber = trackingNumber;
    transfer.carrier = carrier;
    transfer.shippedBy = req.user._id;
    transfer.shippedAt = new Date();
    await transfer.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      transfer,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const receiveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { transferId } = req.params;
    const { receivedItems, notes } = req.body; // Can report discrepancies
    
    const transfer = await StockTransfer.findById(transferId).session(session);
    
    const discrepancies = [];
    
    for (const received of receivedItems) {
      const item = transfer.items.find(i => i.variantSku === received.sku);
      item.receivedQuantity = received.quantity;
      
      if (received.quantity !== item.approvedQuantity) {
        discrepancies.push({
          variantSku: received.sku,
          expected: item.approvedQuantity,
          received: received.quantity,
          reason: received.reason || 'Not specified',
        });
      }
      
      // Add to destination store
      await StoreInventory.findOneAndUpdate(
        {
          storeId: transfer.toStore.storeId,
          variantSku: received.sku,
        },
        {
          $inc: { quantity: received.quantity, available: received.quantity },
          $set: { lastRestockDate: new Date() }
        },
        { upsert: true, session }
      );
      
      // Log movement
      await StockMovement.create([{
        type: 'TRANSFER',
        sku: received.sku,
        toLocationId: null,
        quantity: received.quantity,
        referenceType: 'TRANSFER',
        referenceId: transfer.transferNumber,
        performedBy: req.user._id,
        performedByName: req.user.fullName,
        notes: `Received from ${transfer.fromStore.storeName}`,
      }], { session });
    }
    
    transfer.status = 'COMPLETED';
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    transfer.receivingNotes = notes;
    transfer.discrepancies = discrepancies;
    await transfer.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      transfer,
      discrepancies,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
```

---

### 🎯 **PHASE 3: Automation & Intelligence (Weeks 5-6)**

#### **3.1 Auto-Replenishment System**

**Create:** `replenishmentService.js`

```javascript
export const analyzeReplenishmentNeeds = async () => {
  const stores = await Store.find({ status: 'ACTIVE' });
  const recommendations = [];
  
  for (const store of stores) {
    // Get low stock items at this store
    const lowStock = await StoreInventory.find({
      storeId: store._id,
      $expr: { $lt: ['$available', '$minStock'] }
    });
    
    for (const item of lowStock) {
      // Check if other stores have surplus
      const otherStores = await StoreInventory.find({
        variantSku: item.variantSku,
        storeId: { $ne: store._id },
        available: { $gt: 20 }, // Configurable threshold
      }).sort({ available: -1 });
      
      if (otherStores.length > 0) {
        const needed = item.minStock - item.available;
        const source = otherStores[0];
        
        recommendations.push({
          type: 'INTER_STORE_TRANSFER',
          priority: item.available === 0 ? 'CRITICAL' : 'HIGH',
          sku: item.variantSku,
          fromStore: source.storeId,
          toStore: store._id,
          suggestedQuantity: Math.min(needed, Math.floor(source.available / 2)),
          reason: `Low stock at ${store.name} (${item.available}/${item.minStock})`,
        });
      } else {
        // Need to order from warehouse
        recommendations.push({
          type: 'WAREHOUSE_REPLENISHMENT',
          priority: 'HIGH',
          sku: item.variantSku,
          toStore: store._id,
          suggestedQuantity: item.minStock - item.available,
          reason: 'No surplus in other stores',
        });
      }
    }
  }
  
  return recommendations;
};

// Scheduled job (run daily at 2 AM)
export const scheduleReplenishmentAnalysis = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const recommendations = await analyzeReplenishmentNeeds();
      
      // Send to WAREHOUSE_MANAGER
      await NotificationService.send({
        recipientRole: 'WAREHOUSE_MANAGER',
        title: `${recommendations.length} Replenishment Recommendations`,
        message: 'Review daily stock replenishment suggestions',
        metadata: { recommendations },
      });
      
      console.log(`✅ Generated ${recommendations.length} replenishment recommendations`);
    } catch (error) {
      console.error('❌ Replenishment analysis failed:', error);
    }
  });
};
```

#### **3.2 Predictive Stock Allocation**

```javascript
// Machine learning model (simple version)
export const predictDemand = async (sku, storeId, daysAhead = 7) => {
  // Get historical sales data
  const sales = await Order.aggregate([
    {
      $match: {
        'assignedStore.storeId': storeId,
        status: { $in: ['DELIVERED', 'COMPLETED'] },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }
    },
    { $unwind: '$items' },
    { $match: { 'items.variantSku': sku } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        quantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  // Simple moving average
  const avgDailyDemand = sales.length > 0
    ? sales.reduce((sum, s) => sum + s.quantity, 0) / sales.length
    : 1;
  
  // Add 20% safety stock
  const predictedDemand = Math.ceil(avgDailyDemand * daysAhead * 1.2);
  
  return {
    sku,
    storeId,
    avgDailyDemand,
    predictedDemand,
    confidence: sales.length >= 30 ? 'HIGH' : 'LOW',
  };
};
```

---

### 🎯 **PHASE 4: Frontend Dashboard (Weeks 7-8)**

#### **4.1 Multi-Branch Inventory Dashboard**

**Create:** `frontend/src/pages/admin/InventoryDashboard.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function InventoryDashboard() {
  const [consolidatedInventory, setConsolidatedInventory] = useState([]);
  const [storeComparison, setStoreComparison] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [inventory, comparison, alertsData] = await Promise.all([
        api.get('/inventory/dashboard/consolidated'),
        api.get('/inventory/dashboard/store-comparison'),
        api.get('/inventory/dashboard/alerts'),
      ]);
      
      setConsolidatedInventory(inventory.data.inventory);
      setStoreComparison(comparison.data.comparison);
      setAlerts(alertsData.data.alerts);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {consolidatedInventory.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {alerts.filter(a => a.priority === 'CRITICAL').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {alerts.filter(a => a.priority === 'HIGH').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(consolidatedInventory.reduce((sum, item) => 
                sum + (item.totalQuantity * item.variant?.price || 0), 0
              ) / 1000000).toFixed(1)}M VND
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="consolidated">
        <TabsList>
          <TabsTrigger value="consolidated">Consolidated View</TabsTrigger>
          <TabsTrigger value="stores">Store Comparison</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="consolidated">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Across All Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2">Total Qty</th>
                      <th className="text-right p-2">Reserved</th>
                      <th className="text-right p-2">Available</th>
                      <th className="text-left p-2">Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedInventory.map((item) => (
                      <tr key={item._id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="text-sm text-gray-500">{item._id}</div>
                        </td>
                        <td className="text-right p-2">{item.totalQuantity}</td>
                        <td className="text-right p-2 text-yellow-600">
                          {item.totalReserved}
                        </td>
                        <td className="text-right p-2">
                          <Badge variant={item.totalAvailable < 10 ? 'destructive' : 'default'}>
                            {item.totalAvailable}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {item.locations.map((loc) => (
                            <div key={loc.storeId} className="text-xs">
                              {loc.storeCode}: {loc.available}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Other tabs... */}
      </Tabs>
    </div>
  );
}
```

---

## V. FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      CENTRAL WAREHOUSE                          │
├─────────────────────────────────────────────────────────────────┤
│  Purchase Order → Goods Receipt → Location Assignment          │
│  ├─ Zone A: iPhone/iPad (High-value, secure area)             │
│  ├─ Zone B: Accessories (High-turnover)                       │
│  └─ Zone C: Laptops/Tablets                                   │
│                          ↓                                      │
│  [Auto-Distribution Algorithm]                                 │
│  ├─ Critical: Stores with 0 stock                             │
│  ├─ Priority: Stores below minStock                           │
│  └─ Balanced: Proportional to store capacity                  │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
        ┌──────────────┴──────────────┐
        ↓                              ↓
┌───────────────┐              ┌───────────────┐
│  STORE HCM    │←──Transfer──→│  STORE HN     │
├───────────────┤              ├───────────────┤
│ StoreInventory│              │ StoreInventory│
│ - Reserved    │              │ - Reserved    │
│ - Available   │              │ - Available   │
└───────┬───────┘              └───────┬───────┘
        ↓                              ↓
   Order Routing                  Order Routing
   (Smart Assignment)             (Smart Assignment)
        ↓                              ↓
   Customer Orders                Customer Orders
```

---

## VI. IMPLEMENTATION TIMELINE

| Phase | Duration | Deliverables | Resources |
|-------|----------|--------------|-----------|
| **Phase 1** | 2 weeks | Warehouse→Store sync, Dashboard API | 1 backend dev |
| **Phase 2** | 2 weeks | Inter-branch transfers complete workflow | 1 backend + 1 frontend dev |
| **Phase 3** | 2 weeks | Auto-replenishment, Predictive analytics | 1 backend dev |
| **Phase 4** | 2 weeks | Multi-branch dashboard UI | 1 frontend dev |
| **Testing** | 1 week | Integration testing, Load testing | QA team |
| **Training** | 1 week | Staff training, Documentation | All devs |

**Total:** 10 weeks (2.5 months)

---

## VII. CRITICAL SUCCESS FACTORS

✅ **What Makes This Feasible:**
1. **80% infrastructure exists** - you're not starting from scratch
2. **Clean data models** - well-designed schemas
3. **Omnichannel routing** - already advanced
4. **Transaction support** - MongoDB sessions for consistency

⚠️ **Key Risks:**
1. **Data migration** - existing orders/inventory must sync correctly
2. **Concurrent updates** - multiple stores updating same SKU
3. **Network latency** - real-time sync across branches
4. **User adoption** - warehouse staff training

🎯 **Recommended Approach:**
1. Start with **Phase 1** (sync + dashboard) - immediate value
2. Run **parallel systems** for 1 month (old + new)
3. Gradually migrate stores one-by-one
4. Keep **audit logs** of all inventory changes
5. Build **rollback mechanisms** for safety

---

## VIII. COMPARISON: Your System vs KiotViet After Implementation

| Feature | KiotViet | Ninh Kiều (After Plan) |
|---------|----------|-------------------------|
| Multi-location Inventory | ✅ | ✅ |
| Inter-branch Transfers | ✅ | ✅ (More detailed) |
| Smart Routing | ⚠️ Basic | ✅ Advanced |
| Warehouse Locations | ❌ | ✅ (Zone/Aisle/Shelf/Bin) |
| Omnichannel Orders | ⚠️ Basic | ✅ (HOME_DELIVERY/CLICK_AND_COLLECT/IN_STORE) |
| Predictive Analytics | ❌ | ✅ (AI-powered) |
| Real-time Dashboard | ✅ | ✅ |
| Barcode Support | ✅ | ✅ (QR codes for locations) |

**Your Competitive Advantage:**
- ✨ **Better omnichannel** (KiotViet is primarily POS-focused)
- ✨ **Warehouse location tracking** (they don't have this level)
- ✨ **Smart inventory routing** (your algorithm is superior)
- ✨ **Modern tech stack** (React + MongoDB vs their legacy system)

---

**Ready to implement?** I recommend starting with Phase 1 (sync + dashboard) as a **2-week sprint** to prove the concept. This gives immediate value and validates the architecture before committing to the full 10-week plan. 🚀