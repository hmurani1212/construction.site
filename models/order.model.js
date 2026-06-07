const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const construction_materials_db = db_connection;
const { ORDER_STATUSES, PAYMENT_METHODS } = require("../global_config/construction_materials.config");

const order_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: false, // Optional for guest orders created from admin dashboard
    ref: "user",
    default: null,
  },
  order_number: {
    type: String,
    required: true,
    unique: true,
  },
  items: [
    {
      product_id: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "product",
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unit_type: { type: String, default: "piece" },
      image: { type: String, default: null },
    },
  ],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0,
  },
  delivery_charges: {
    type: Number,
    default: 0,
    min: 0,
  },
  delivery_date: {
    type: String,
    default: null,
  },
  delivery_instructions: {
    type: String,
    default: null,
  },
  is_bulk_quote_order: {
    type: Boolean,
    default: false,
  },
  quote_status: {
    type: String,
    enum: ["none", "requested", "sent", "accepted", "rejected"],
    default: "none",
  },
  admin_notes: {
    type: String,
    default: null,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  shipping_address: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    address: { type: String, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  payment_method: {
    type: String,
    enum: PAYMENT_METHODS,
    required: true,
  },
  payment_account_number: {
    type: String,
    default: null,
  },
  payment_proof: {
    type: String,
    default: null,
  },
  payment_status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  payment_id: {
    type: String,
    default: null,
  },
  stripe_payment_intent_id: {
    type: String,
    default: null,
  },
  order_status: {
    type: String,
    enum: ORDER_STATUSES,
    default: "pending",
  },
  is_active: {
    type: Number,
    enum: [0, 1],
    default: 1,
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

// Index user_id with sparse option to handle null values (guest orders)
order_schema.index({ user_id: 1, created_at: -1 }, { sparse: true });
order_schema.index({ order_number: 1 }, { unique: true });
order_schema.index({ payment_status: 1 });
order_schema.index({ order_status: 1 });
// Index for guest orders (orders without user_id)
order_schema.index({ created_at: -1 });

module.exports = construction_materials_db.model("order", order_schema);

