const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const construction_db = db_connection;

const quote_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    default: null,
  },
  material_required: {
    type: String,
    required: true,
    trim: true,
  },
  estimated_quantity: {
    type: String,
    required: true,
    trim: true,
  },
  delivery_location: {
    type: String,
    required: true,
    trim: true,
  },
  project_type: {
    type: String,
    trim: true,
    default: null,
  },
  message: {
    type: String,
    trim: true,
    default: null,
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: "user",
    default: null,
  },
  quote_status: {
    type: String,
    enum: ["pending", "contacted", "quoted", "closed", "reviewing", "quote_sent", "accepted", "rejected"],
    default: "pending",
  },
  admin_response: {
    type: String,
    trim: true,
    default: null,
  },
  admin_notes: {
    type: String,
    trim: true,
    default: null,
  },
  quoted_amount: {
    type: Number,
    min: 0,
    default: null,
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

quote_schema.index({ quote_status: 1 });
quote_schema.index({ created_at: -1 });

module.exports = construction_db.model("quote", quote_schema);
