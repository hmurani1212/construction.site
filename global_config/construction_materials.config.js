/**
 * Construction materials platform constants
 */

const UNIT_TYPES = [
  "piece",
  "bag",
  "ton",
  "cubicFoot",
  "cubicMeter",
  "bundle",
  "truckload",
];

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "quote_requested",
  "quote_sent",
  "quote_accepted",
  "shipped",
  "completed",
];

const PAYMENT_METHODS = [
  "stripe",
  "jazzcash",
  "easypaisa",
  "cod",
  "bank_transfer",
];

const QUOTE_STATUSES = [
  "pending",
  "contacted",
  "quoted",
  "closed",
  "reviewing",
  "quote_sent",
  "accepted",
  "rejected",
];

const CONSTRUCTION_CATEGORIES = [
  { name: "Blocks", image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=500" },
  { name: "Bricks", image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500" },
  { name: "Cement", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500" },
  { name: "Sand", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500" },
  { name: "Crush / Aggregates", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500" },
  { name: "Steel", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500" },
  { name: "Pavers", image: "https://images.unsplash.com/photo-1615873968403-89e068e8c0e1?w=500" },
  { name: "Precast Boundary Wall", image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500" },
  { name: "Plumbing", image: "https://images.unsplash.com/photo-1581578731544-c64695cc6952?w=500" },
  { name: "Electrical", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500" },
  { name: "Construction Tools", image: "https://images.unsplash.com/photo-1504148455328-c376907d0c38?w=500" },
  { name: "Construction Chemicals", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500" },
  { name: "Finishing Materials", image: "https://images.unsplash.com/photo-1615873968403-89e068e8c0e1?w=500" },
];

const DEFAULT_UNIT_TYPE = "piece";
const DEFAULT_MINIMUM_ORDER_QUANTITY = 1;
const UPLOAD_FOLDER = "construction_materials";

module.exports = {
  UNIT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  QUOTE_STATUSES,
  CONSTRUCTION_CATEGORIES,
  DEFAULT_UNIT_TYPE,
  DEFAULT_MINIMUM_ORDER_QUANTITY,
  UPLOAD_FOLDER,
};
