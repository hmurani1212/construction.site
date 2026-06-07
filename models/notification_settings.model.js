const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const grocery_store_db = db_connection;

const notification_settings_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "user",
    unique: true,
  },
  // Email Notifications
  email_notifications: {
    weekly_notification: {
      type: Boolean,
      default: false,
    },
    account_summary: {
      type: Boolean,
      default: false,
    },
    order_updates: {
      type: Boolean,
      default: false,
    },
  },
  // Text Messages
  text_messages: {
    call_before_checkout: {
      type: Boolean,
      default: false,
    },
    order_updates: {
      type: Boolean,
      default: false,
    },
  },
  // Website Notifications
  website_notifications: {
    new_follower: {
      type: Boolean,
      default: true,
    },
    post_like: {
      type: Boolean,
      default: true,
    },
    someone_followed_posted: {
      type: Boolean,
      default: true,
    },
    post_added_to_collection: {
      type: Boolean,
      default: true,
    },
    order_delivery: {
      type: Boolean,
      default: true,
    },
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

// Indexes
notification_settings_schema.index({ user_id: 1 }, { unique: true });
notification_settings_schema.index({ is_active: 1 });

module.exports = grocery_store_db.model("notification_settings", notification_settings_schema);

