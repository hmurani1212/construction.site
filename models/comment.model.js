const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const grocery_store_db = db_connection;

const comment_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: false, // Optional for guest comments
    ref: "user",
    default: null,
  },
  comment: {
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

// Index for faster lookups
comment_schema.index({ user_id: 1, created_at: -1 }, { sparse: true });
comment_schema.index({ created_at: -1 });
comment_schema.index({ is_active: 1 });

module.exports = grocery_store_db.model("comment", comment_schema);
