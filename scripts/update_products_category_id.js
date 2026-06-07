/**
 * Update Products Category ID Script
 * 
 * This script updates existing products to use category_id instead of category name.
 * It finds products by category name and updates them with the corresponding category_id.
 * 
 * Usage: node scripts/update_products_category_id.js
 */

const mongoose = require("mongoose");

// MongoDB connection string (from db_mongo_mongoose.js)
const MONGO_CONNECTION_STRING = "mongodb+srv://Project:A6pyWYW5Hbu7QE9T@cluster0.obxjkz6.mongodb.net";
const DB_NAME = "Grossery_store";

// Import models
const product_model = require("../models/product.model");
const category_model = require("../models/category.model");

// Main function to update products
async function updateProductsCategoryId() {
  try {
    console.log("🚀 Starting product category ID update process...\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_CONNECTION_STRING, {
      dbName: DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB\n");

    // Get all products that don't have category_id or have null category_id
    console.log("📦 Fetching products to update...");
    const productsToUpdate = await product_model.find({
      $or: [
        { category_id: { $exists: false } },
        { category_id: null }
      ]
    });
    
    console.log(`✅ Found ${productsToUpdate.length} products to update\n`);

    if (productsToUpdate.length === 0) {
      console.log("✅ All products already have category_id. No updates needed.");
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get all categories to create a name-to-id mapping
    console.log("📋 Fetching all categories...");
    const categories = await category_model.find({ is_active: 1 });
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });
    console.log(`✅ Found ${categories.length} active categories\n`);

    // Update products
    console.log("💾 Updating products...");
    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const product of productsToUpdate) {
      try {
        // Check if product has a category name
        if (!product.category) {
          console.log(`  ⚠️  Product ${product._id} (${product.name}) has no category name. Skipping.`);
          notFoundCount++;
          continue;
        }

        // Find category ID by name
        const categoryId = categoryMap[product.category];

        if (!categoryId) {
          console.log(`  ⚠️  Category "${product.category}" not found for product ${product._id} (${product.name}). Skipping.`);
          notFoundCount++;
          continue;
        }

        // Update product with category_id
        await product_model.updateOne(
          { _id: product._id },
          { 
            $set: { 
              category_id: categoryId,
              updated_at: Math.floor(Date.now() / 1000)
            } 
          }
        );

        console.log(`  ✅ Updated: ${product.name.substring(0, 50)}... (Category: ${product.category} -> ${categoryId})`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error updating product ${product._id} (${product.name}):`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Update Summary:");
    console.log(`  ✅ Successfully updated: ${successCount} products`);
    console.log(`  ⚠️  Category not found: ${notFoundCount} products`);
    console.log(`  ❌ Errors: ${errorCount} products`);
    console.log("=".repeat(50) + "\n");

    // Close connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    console.log("🎉 Update completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error during update:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the update function
updateProductsCategoryId();

