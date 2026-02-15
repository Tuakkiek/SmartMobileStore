import mongoose from "mongoose";

const operatingDaySchema = new mongoose.Schema(
  {
    open: String,
    close: String,
  },
  { _id: false }
);

const storeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["STORE", "WAREHOUSE", "SHOWROOM"],
      default: "STORE",
    },

    address: {
      province: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      ward: { type: String, trim: true },
      street: { type: String, required: true, trim: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    manager: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    operatingHours: {
      monday: operatingDaySchema,
      tuesday: operatingDaySchema,
      wednesday: operatingDaySchema,
      thursday: operatingDaySchema,
      friday: operatingDaySchema,
      saturday: operatingDaySchema,
      sunday: operatingDaySchema,
    },

    services: {
      clickAndCollect: { type: Boolean, default: true },
      homeDelivery: { type: Boolean, default: true },
      installation: { type: Boolean, default: false },
      warranty: { type: Boolean, default: true },
      tradeIn: { type: Boolean, default: true },
      installment: { type: Boolean, default: true },
    },

    shippingZones: [
      {
        province: { type: String, trim: true },
        district: { type: String, trim: true },
        shippingFee: { type: Number, default: 0 },
        estimatedDays: { type: Number, default: 2 },
      },
    ],

    capacity: {
      maxOrdersPerDay: { type: Number, default: 100 },
      currentOrders: { type: Number, default: 0 },
      warehouseSize: Number,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
    },

    isHeadquarters: {
      type: Boolean,
      default: false,
    },

    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      rating: { type: Number, default: 5 },
      reviewCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

storeSchema.index({ "address.province": 1, "address.district": 1 });
storeSchema.index({ "address.coordinates": "2dsphere" });
storeSchema.index({ status: 1 });

export default mongoose.models.Store || mongoose.model("Store", storeSchema);
