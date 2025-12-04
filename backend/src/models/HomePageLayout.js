// ============================================
// FILE: backend/src/models/HomePageLayout.js
// Schema for dynamic homepage layout configuration
// ============================================

import mongoose from "mongoose";

const sectionConfigSchema = new mongoose.Schema(
  {
    // For banner sections
    images: [{ type: String, trim: true }],
    links: [{ type: String, trim: true }],

    // For category sections
    categoryId: { type: String, trim: true },
    categoryName: { type: String, trim: true },
    limit: { type: Number, default: 10, min: 1, max: 100 },

    // For product sections
    productType: {
      type: String,
      enum: ["new", "topSeller", "category"],
    },
    categoryFilter: {
      type: String,
      enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessories"],
    },

    // For deals sections
    dealImages: [{ type: String, trim: true }],
    dealLinks: [{ type: String, trim: true }],

    // For showcase sections
    showcaseItems: [
      {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        image: { type: String, trim: true },
        link: { type: String, trim: true },
      },
    ],
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "hero",
        "promo-strip",
        "category-nav",
        "deals-grid",
        "magic-deals",
        "products-new",
        "products-topSeller",
        "category-section",
        "iphone-showcase",
        "secondary-banners",
      ],
    },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true, min: 0 },
    title: { type: String, trim: true }, // Display title for section
    config: { type: sectionConfigSchema, default: {} },
  },
  { _id: false }
);

const homePageLayoutSchema = new mongoose.Schema(
  {
    sections: {
      type: [sectionSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================
homePageLayoutSchema.index({ isActive: 1 });
homePageLayoutSchema.index({ version: -1 });

// ============================================
// METHODS
// ============================================

// Get active layout
homePageLayoutSchema.statics.getActiveLayout = async function () {
  const layout = await this.findOne({ isActive: true }).sort({ version: -1 });

  if (!layout) {
    // Return default layout if none exists
    return this.getDefaultLayout();
  }

  return layout;
};

// Create default layout
homePageLayoutSchema.statics.getDefaultLayout = function () {
  return {
    sections: [
      {
        id: "hero-main",
        type: "hero",
        enabled: true,
        order: 1,
        title: "Hero Banner",
        config: {
          images: ["/ip17pm.png", "/ipAir.png", "/ip17.png"],
          links: [
            "/dien-thoai/iphone-17-pro-256gb?sku=00000279",
            "/dien-thoai/iphone-air-256gb?sku=00000425",
            "/dien-thoai/iphone-17-256gb?sku=00000300",
          ],
        },
      },
      {
        id: "secondary-banners",
        type: "secondary-banners",
        enabled: true,
        order: 2,
        title: "Secondary Banners",
        config: {
          images: [
            "/ip16e.png",
            "/cpuA19.png",
            "/macpro14.png",
            "/banner_phu_ip17pro.png",
          ],
          links: [
            "/products?category=Accessories",
            "/products?category=AppleWatch",
            "/products?category=AirPods",
            "/products?category=iPhone",
          ],
        },
      },
      {
        id: "promo-strip",
        type: "promo-strip",
        enabled: true,
        order: 3,
        title: "Promo Strip",
        config: {},
      },
      {
        id: "category-nav",
        type: "category-nav",
        enabled: true,
        order: 4,
        title: "Category Navigation",
        config: {},
      },
      {
        id: "deals-grid",
        type: "deals-grid",
        enabled: true,
        order: 5,
        title: "Deals Grid",
        config: {
          dealImages: [
            "/banner_phu2.png",
            "/banner_phu4.png",
            "/banner_phu1.png",
            "/banner_phu5.png",
            "/banner_phu3.png",
            "/banner_phu7.png",
          ],
          dealLinks: Array(6).fill("/products?category=iPhone"),
        },
      },
      {
        id: "magic-deals",
        type: "magic-deals",
        enabled: true,
        order: 6,
        title: "Magic Deals",
        config: {
          images: [
            "/banner_chinh1.png",
          ],
        },
      },
      {
        id: "products-new",
        type: "products-new",
        enabled: true,
        order: 7,
        title: "Sản phẩm mới",
        config: { limit: 10 },
      },
      {
        id: "products-topSeller",
        type: "products-topSeller",
        enabled: true,
        order: 8,
        title: "Sản phẩm bán chạy",
        config: { limit: 10 },
      },
      {
        id: "category-iphone",
        type: "category-section",
        enabled: true,
        order: 9,
        title: "iPhone",
        config: { categoryFilter: "iPhone", limit: 10 },
      },
      {
        id: "category-ipad",
        type: "category-section",
        enabled: true,
        order: 10,
        title: "iPad",
        config: { categoryFilter: "iPad", limit: 10 },
      },
      {
        id: "category-mac",
        type: "category-section",
        enabled: true,
        order: 11,
        title: "Mac",
        config: { categoryFilter: "Mac", limit: 10 },
      },
      {
        id: "category-airpods",
        type: "category-section",
        enabled: true,
        order: 12,
        title: "AirPods",
        config: { categoryFilter: "AirPods", limit: 10 },
      },
      {
        id: "category-applewatch",
        type: "category-section",
        enabled: true,
        order: 13,
        title: "Apple Watch",
        config: { categoryFilter: "AppleWatch", limit: 10 },
      },
      {
        id: "category-accessories",
        type: "category-section",
        enabled: true,
        order: 14,
        title: "Phụ kiện",
        config: { categoryFilter: "Accessories", limit: 10 },
      },
      {
        id: "iphone-showcase",
        type: "iphone-showcase",
        enabled: true,
        order: 15, // ← Đổi từ 12 thành 15
        title: "iPhone Showcase",
        config: {
          showcaseItems: [
            {
              title: "Thiết kế Đột Phá",
              subtitle: "Một diện mạo hoàn toàn mới.",
              image: "/img1.png",
            },
            {
              title: "Camera Chuyên Nghiệp",
              subtitle: "Hệ thống camera Pro đột phá.",
              image: "/img2.png",
            },
          ],
        },
      },
    ],
    isActive: true,
    version: 1,
  };
};

// Create new version
homePageLayoutSchema.methods.createNewVersion = async function () {
  // Deactivate current layout
  await this.constructor.updateMany({}, { isActive: false });

  // Create new version
  this.version += 1;
  this.isActive = true;
  this.isNew = true;

  return this.save();
};

const HomePageLayout = mongoose.model("HomePageLayout", homePageLayoutSchema);

export default HomePageLayout;
