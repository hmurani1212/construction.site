const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");
const bcrypt = require("bcryptjs");

// Get MongoDB connection - use shared connection to ensure all models use the same instance
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const grocery_store_db = db_connection;

const user_schema = new Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: false, // Email is now optional
    unique: true,
    sparse: true, // Allow multiple null values
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // If email is provided, validate format; if null/empty, allow it
        return !v || /^\S+@\S+\.\S+$/.test(v);
      },
      message: "Please provide a valid email address"
    },
  },
  password: {
    type: String,
    required: false, // Password is now optional
    minlength: 6,
  },
  phone: {
    type: String,
    required: true, // Phone is now required
    unique: true, // Phone must be unique
    trim: true,
    validate: {
      validator: function(v) {
        // Pakistani phone format: 11 digits starting with 03
        // Format: 03XXXXXXXXX (e.g., 030xxxxxxxxxxx)
        return /^03\d{9}$/.test(v);
      },
      message: "Phone number must be in Pakistani format: 11 digits starting with 03 (e.g., 030xxxxxxxxxxx)"
    },
  },
  address: {
    type: String,
    required: true, // Address is now required
    trim: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  favorites: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    }],
    default: [],
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

// Hash password before saving (only if password is provided)
user_schema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password (only if password exists)
user_schema.methods.compare_password = async function (candidate_password) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidate_password, this.password);
};

// Index for faster lookups
user_schema.index({ email: 1 }, { unique: true, sparse: true }); // Sparse index for optional email
user_schema.index({ phone: 1 }, { unique: true }); // Unique index for phone (required field)
user_schema.index({ created_at: -1 });

module.exports = grocery_store_db.model("user", user_schema);

