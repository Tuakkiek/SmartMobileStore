// backend/src/services/salesAnalyticsService.js
import SalesAnalytics from '../models/SalesAnalytics.js';
import IPhone, { IPhoneVariant } from '../models/IPhone.js';
import IPad, { IPadVariant } from '../models/IPad.js';
import Mac, { MacVariant } from '../models/Mac.js';
import AirPods, { AirPodsVariant } from '../models/AirPods.js';
import AppleWatch, { AppleWatchVariant } from '../models/AppleWatch.js';
import Accessory, { AccessoryVariant } from '../models/Accessory.js';

const categoryMap = [
  { name: 'iphone', variantModel: IPhoneVariant, mainModel: IPhone },
  { name: 'ipad', variantModel: IPadVariant, mainModel: IPad },
  { name: 'mac', variantModel: MacVariant, mainModel: Mac },
  { name: 'airpods', variantModel: AirPodsVariant, mainModel: AirPods },
  { name: 'applewatch', variantModel: AppleWatchVariant, mainModel: AppleWatch },
  { name: 'accessory', variantModel: AccessoryVariant, mainModel: Accessory },
];

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo.toString().padStart(2, '0');
}

export async function updateSales(variantId, quantity, revenue) {
  let foundCategory;
  let variant;
  for (const cat of categoryMap) {
    variant = await cat.variantModel.findById(variantId).select('productId');
    if (variant) {
      foundCategory = cat;
      break;
    }
  }
  if (!variant) {
    throw new Error('Variant not found in any category');
  }
  const productId = variant.productId;
  const category = foundCategory.name;

  let analytic = await SalesAnalytics.findOne({ productId, variantId, category });
  if (!analytic) {
    analytic = new SalesAnalytics({ productId, variantId, category });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const monthStr = now.toISOString().slice(0, 7);
  const year = now.getFullYear();
  const weekStr = `${year}-W${getISOWeek(now)}`;

  // Update sales
  analytic.sales.total += quantity;
  analytic.sales.daily.set(dateStr, (analytic.sales.daily.get(dateStr) || 0) + quantity);
  analytic.sales.weekly.set(weekStr, (analytic.sales.weekly.get(weekStr) || 0) + quantity);
  analytic.sales.monthly.set(monthStr, (analytic.sales.monthly.get(monthStr) || 0) + quantity);

  // Update revenue
  analytic.revenue.total += revenue;
  analytic.revenue.daily.set(dateStr, (analytic.revenue.daily.get(dateStr) || 0) + revenue);
  analytic.revenue.weekly.set(weekStr, (analytic.revenue.weekly.get(weekStr) || 0) + revenue);
  analytic.revenue.monthly.set(monthStr, (analytic.revenue.monthly.get(monthStr) || 0) + revenue);

  analytic.lastUpdated = now;
  await analytic.save();
}

export async function getTopProducts(category, limit = 10) {
  const top = await SalesAnalytics.aggregate([
    { $match: { category } },
    { $group: { _id: '$productId', totalSales: { $sum: '$sales.total' } } },
    { $sort: { totalSales: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: '$_id' } },
  ]);
  return top.map(r => r.productId.toString());
}