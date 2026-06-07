const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const grocery_store_db = db_connection;

const category_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  image: {
    type: String,
    required: true,
    trim: true,
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
category_schema.index({ name: 1 }, { unique: true });
category_schema.index({ is_active: 1 });
category_schema.index({ created_at: -1 });

// Update updated_at before saving
category_schema.pre('save', function(next) {
  this.updated_at = moment().unix();
  next();
});

module.exports = grocery_store_db.model("category", category_schema);

