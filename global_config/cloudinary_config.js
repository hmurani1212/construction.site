/**
 * Cloudinary Configuration
 * 
 * This file contains Cloudinary API credentials and configuration
 * for image upload and management.
 */

const cloudinary = require("cloudinary").v2;

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dbqvcdgvr";
const CLOUDINARY_API_KEY = "744511866118717";
const CLOUDINARY_API_SECRET = "bUyUbkeS_H3oX49kC8fvAkvtX34";

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

module.exports = {
  cloudinary,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
};

