const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const construction_materials_db = db_connection;
const {
  UNIT_TYPES,
  DEFAULT_UNIT_TYPE,
  DEFAULT_MINIMUM_ORDER_QUANTITY,
} = require("../global_config/construction_materials.config");

const product_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    default: null,
  },
  subcategory: {
    type: String,
    trim: true,
    default: null,
  },
  brand_supplier: {
    type: String,
    trim: true,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  original_price: {
    type: Number,
    min: 0,
    default: null, // For discount calculation
  },
  image: {
    type: String,
    required: false, // Keep for backward compatibility, will be deprecated
    trim: true,
  },
  main_image: {
    type: String,
    required: true,
    trim: true,
  },
  additional_items: {
    type: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        image: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        original_price: {
          type: Number,
          min: 0,
          default: null,
        },
        descriptions: {
          type: String,
          trim: true,
          default: null,
        },
        stock_quantity: {
          type: Number,
          min: 0,
          default: 0,
        },
        unit: {
          type: String,
          trim: true,
          default: "1kg",
        },
      },
    ],
    default: [],
  },
  category: {
    type: String,
    required: false, // Keep for backward compatibility, will be deprecated
    trim: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true,
  },
  label: {
    type: String,
    enum: ["Sale", "Hot", "New", null],
    default: null,
  },
  discount_percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null, // e.g., 14 for 14%
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviews_count: {
    type: Number,
    min: 0,
    default: 0,
  },
  ratings: {
    type: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        created_at: {
          type: Number,
          default: () => moment().unix(),
        },
      },
    ],
    default: [],
  },
  descriptions: {
    type: String,
    trim: true,
    default: null,
  },
  stock_quantity: {
    type: Number,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    trim: true,
    default: "1 piece",
  },
  unit_type: {
    type: String,
    enum: UNIT_TYPES,
    default: DEFAULT_UNIT_TYPE,
  },
  minimum_order_quantity: {
    type: Number,
    min: 1,
    default: DEFAULT_MINIMUM_ORDER_QUANTITY,
  },
  dimensions: {
    type: String,
    trim: true,
    default: null,
  },
  weight: {
    type: String,
    trim: true,
    default: null,
  },
  material_type: {
    type: String,
    trim: true,
    default: null,
  },
  grade_quality: {
    type: String,
    trim: true,
    default: null,
  },
  specifications: {
    type: String,
    trim: true,
    default: null,
  },
  usage_application: {
    type: String,
    trim: true,
    default: null,
  },
  delivery_available: {
    type: Boolean,
    default: true,
  },
  bulk_pricing: {
    type: [
      {
        min_quantity: { type: Number, min: 1, required: true },
        price: { type: Number, min: 0, required: true },
      },
    ],
    default: [],
  },
  featured: {
    type: Boolean,
    default: false,
  },
  ramzan_product: {
    type: Boolean,
    default: false,
  },
  bulk_material: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Number,
    enum: [0, 1],
    default: 1, // 0: Inactive, 1: Active
  },
  created_at: {
    type: Number,
    default: () => moment().unix(),
  },
  updated_at: {
    type: Number,
    default: () => moment().unix(),
  },
});

// Indexes for faster lookups
product_schema.index({ category: 1 }); // Keep for backward compatibility
product_schema.index({ category_id: 1 }); // New index for category reference
product_schema.index({ is_active: 1 });
product_schema.index({ ramzan_product: 1 });
product_schema.index({ bulk_material: 1 });
product_schema.index({ unit_type: 1 });
product_schema.index({ material_type: 1 });
product_schema.index({ featured: 1 });
product_schema.index({ created_at: -1 });
product_schema.index({ price: 1 });
product_schema.index({ rating: -1 });

// Virtual for discount calculation
product_schema.virtual("discount_amount").get(function () {
  if (this.original_price && this.price < this.original_price) {
    return this.original_price - this.price;
  }
  return 0;
});

module.exports = construction_materials_db.model("product", product_schema);

