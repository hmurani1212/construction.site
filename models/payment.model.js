const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const grocery_store_db = db_connection;

const payment_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  order_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "order",
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "user",
  },
  payment_method: {
    type: String,
    enum: ["stripe", "jazzcash", "easypaisa"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "PKR",
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "refunded"],
    default: "pending",
  },
  // Stripe specific fields
  stripe_payment_intent_id: {
    type: String,
    default: null,
  },
  stripe_charge_id: {
    type: String,
    default: null,
  },
  stripe_customer_id: {
    type: String,
    default: null,
  },
  // Transaction details
  transaction_id: {
    type: String,
    default: null,
  },
  failure_reason: {
    type: String,
    default: null,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
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

payment_schema.index({ order_id: 1 });
payment_schema.index({ user_id: 1, created_at: -1 });
payment_schema.index({ stripe_payment_intent_id: 1 });
payment_schema.index({ status: 1 });

module.exports = grocery_store_db.model("payment", payment_schema);

