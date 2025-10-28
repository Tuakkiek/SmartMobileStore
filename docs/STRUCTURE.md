# File Tree: v10

**Generated:** 10/28/2025, 3:33:39 PM
**Root Path:** `c:\Project_1\v10`

```
├── 📁 .qodo
│   ├── 📁 agents
│   └── 📁 workflows
└── 📁 SmartMobileStore
    ├── 📁 backend
    │   ├── 📁 src
    │   │   ├── 📁 config
    │   │   │   ├── 📄 config.js
    │   │   │   └── 📄 db.js
    │   │   ├── 📁 controllers
    │   │   │   ├── 📄 accessoryController.js
    │   │   │   ├── 📄 airPodsController.js
    │   │   │   ├── 📄 appleWatchController.js
    │   │   │   ├── 📄 authController.js
    │   │   │   ├── 📄 cartController.js
    │   │   │   ├── 📄 iPadController.js
    │   │   │   ├── 📄 iPhoneController.js
    │   │   │   ├── 📄 macController.js
    │   │   │   ├── 📄 orderController.js
    │   │   │   ├── 📄 productController.js
    │   │   │   ├── 📄 promotionController.js
    │   │   │   ├── 📄 reviewController.js
    │   │   │   └── 📄 userController.js
    │   │   ├── 📁 lib
    │   │   │   └── 📄 api.js
    │   │   ├── 📁 middleware
    │   │   │   └── 📄 authMiddleware.js
    │   │   ├── 📁 models
    │   │   │   ├── 📄 Accessory.js
    │   │   │   ├── 📄 AirPods.js
    │   │   │   ├── 📄 AppleWatch.js
    │   │   │   ├── 📄 Attribute.js
    │   │   │   ├── 📄 Cart.js
    │   │   │   ├── 📄 IPad.js
    │   │   │   ├── 📄 IPhone.js
    │   │   │   ├── 📄 Mac.js
    │   │   │   ├── 📄 Order.js
    │   │   │   ├── 📄 Product.js
    │   │   │   ├── 📄 Promotion.js
    │   │   │   ├── 📄 Review.js
    │   │   │   ├── 📄 SalesAnalytics.js
    │   │   │   ├── 📄 User.js
    │   │   │   └── 📄 Variant.js
    │   │   ├── 📁 routes
    │   │   │   ├── 📄 accessoryRoutes.js
    │   │   │   ├── 📄 airPodsRoutes.js
    │   │   │   ├── 📄 analyticsRoutes.js
    │   │   │   ├── 📄 appleWatchRoutes.js
    │   │   │   ├── 📄 authRoutes.js
    │   │   │   ├── 📄 cartRoutes.js
    │   │   │   ├── 📄 iPadRoutes.js
    │   │   │   ├── 📄 iPhoneRoutes.js
    │   │   │   ├── 📄 macRoutes.js
    │   │   │   ├── 📄 orderRoutes.js
    │   │   │   ├── 📄 productRoutes.js
    │   │   │   ├── 📄 promotionRoutes.js
    │   │   │   ├── 📄 reviewRoutes.js
    │   │   │   ├── 📄 salesRoutes.js
    │   │   │   └── 📄 userRoutes.js
    │   │   ├── 📁 services
    │   │   │   ├── 📄 productSalesService.js
    │   │   │   └── 📄 salesAnalyticsService.js
    │   │   └── 📄 server.js
    │   ├── ⚙️ package-lock.json
    │   └── ⚙️ package.json
    ├── 📁 docs
    │   └── 📝 STRUCTURE.md
    └── 📁 frontend
        ├── 📁 public
        │   ├── 🖼️ iPhone17pm.png
        │   ├── 🖼️ img1.png
        │   ├── 🖼️ img2.png
        │   ├── 🖼️ img3.png
        │   ├── 🖼️ img4.png
        │   ├── 🖼️ img5.png
        │   ├── 🖼️ ip17.png
        │   ├── 🖼️ ip17pm.png
        │   ├── 🖼️ ip17pm1.png
        │   ├── 🖼️ ipAir.png
        │   └── 🖼️ ipAir2.png
        ├── 📁 src
        │   ├── 📁 assets
        │   │   └── 🖼️ react.svg
        │   ├── 📁 components
        │   │   ├── 📁 shared
        │   │   │   ├── 📁 specs
        │   │   │   │   ├── 📄 AccessoriesSpecsForm.jsx
        │   │   │   │   ├── 📄 AirPodsSpecsForm.jsx
        │   │   │   │   ├── 📄 AppleWatchSpecsForm.jsx
        │   │   │   │   ├── 📄 IPadSpecsForm.jsx
        │   │   │   │   ├── 📄 IPhoneSpecsForm.jsx
        │   │   │   │   └── 📄 MacSpecsForm.jsx
        │   │   │   ├── 📁 variants
        │   │   │   │   ├── 📄 AccessoriesVariantsForm.jsx
        │   │   │   │   ├── 📄 AirPodsVariantsForm.jsx
        │   │   │   │   ├── 📄 AppleWatchVariantsForm.jsx
        │   │   │   │   ├── 📄 IPadVariantsForm.jsx
        │   │   │   │   ├── 📄 IPhoneVariantsForm.jsx
        │   │   │   │   └── 📄 MacVariantsForm.jsx
        │   │   │   ├── 📄 ErrorMessage.jsx
        │   │   │   ├── 📄 HeroBanner.jsx
        │   │   │   ├── 📄 Loading.jsx
        │   │   │   ├── 📄 ProductCard.jsx
        │   │   │   ├── 📄 ProductEditModal.jsx
        │   │   │   ├── 📄 ProductsPage.jsx
        │   │   │   └── 📄 iPhoneShowcase.jsx
        │   │   └── 📁 ui
        │   │       ├── 📄 ProductVariantSelector.jsx
        │   │       ├── 📄 alert-dialog.jsx
        │   │       ├── 📄 badge.jsx
        │   │       ├── 📄 button.jsx
        │   │       ├── 📄 card.jsx
        │   │       ├── 📄 dialog.jsx
        │   │       ├── 📄 dropdown-menu.jsx
        │   │       ├── 📄 input.jsx
        │   │       ├── 📄 label.jsx
        │   │       ├── 📄 select.jsx
        │   │       ├── 📄 separator.jsx
        │   │       ├── 📄 sonner.jsx
        │   │       ├── 📄 tabs.jsx
        │   │       └── 📄 textarea.jsx
        │   ├── 📁 layouts
        │   │   ├── 📄 DashboardLayout.jsx
        │   │   └── 📄 MainLayout.jsx
        │   ├── 📁 lib
        │   │   ├── 📄 api.js
        │   │   ├── 📄 generateSKU.js
        │   │   ├── 📄 productConstants.js
        │   │   └── 📄 utils.js
        │   ├── 📁 pages
        │   │   ├── 📁 admin
        │   │   │   ├── 📄 AdminDashboard.jsx
        │   │   │   ├── 📄 EmployeesPage.jsx
        │   │   │   └── 📄 PromotionsPage.jsx
        │   │   ├── 📁 customer
        │   │   │   ├── 📄 CartPage.jsx
        │   │   │   ├── 📄 CheckoutPage.jsx
        │   │   │   ├── 📄 OrderDetailPage.jsx
        │   │   │   ├── 📄 OrdersPage.jsx
        │   │   │   └── 📄 ProfilePage.jsx
        │   │   ├── 📁 order-manager
        │   │   │   └── 📄 OrderManagementPage.jsx
        │   │   ├── 📁 warehouse
        │   │   │   ├── 📄 ProductPage2.jsx
        │   │   │   └── 📄 ProductsPage.jsx
        │   │   ├── 📄 HomePage.jsx
        │   │   ├── 📄 LoginPage.jsx
        │   │   ├── 📄 ProductDetailPage.jsx
        │   │   ├── 📄 ProductsPage.jsx
        │   │   └── 📄 RegisterPage.jsx
        │   ├── 📁 store
        │   │   ├── 📄 authStore.js
        │   │   └── 📄 cartStore.js
        │   ├── 🎨 App.css
        │   ├── 📄 App.jsx
        │   ├── 🎨 index.css
        │   ├── 📄 main.jsx
        │   └── 📄 province.js
        ├── ⚙️ .gitignore
        ├── 📝 README.md
        ├── ⚙️ components.json
        ├── 📄 eslint.config.js
        ├── 🌐 index.html
        ├── ⚙️ jsconfig.json
        ├── ⚙️ package-lock.json
        ├── ⚙️ package.json
        ├── 📄 postcss.config.js
        ├── 📄 tailwind.config.js
        └── 📄 vite.config.js
```

---
*Generated by FileTree Pro Extension*