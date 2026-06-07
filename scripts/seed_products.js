/**
 * Seed Products Script
 * 
 * This script fetches products from FakeStore API and inserts them into the database
 * along with popular categories.
 * 
 * Usage: node scripts/seed_products.js
 */

const axios = require("axios");
const mongoose = require("mongoose");

// MongoDB connection string (from db_mongo_mongoose.js)
const MONGO_CONNECTION_STRING = "mongodb+srv://Project:A6pyWYW5Hbu7QE9T@cluster0.obxjkz6.mongodb.net";
const DB_NAME = "Grossery_store";

// Import models
const product_model = require("../models/product.model");
const category_model = require("../models/category.model");

// FakeStore API URL
const FAKE_STORE_API = "https://fakestoreapi.com/products";

// Popular categories to add
const POPULAR_CATEGORIES = [
  {
    name: "Fruits & Vegetables",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500",
  },
  {
    name: "Dairy & Eggs",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500",
  },
  {
    name: "Bakery & Bread",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
  },
  {
    name: "Meat & Seafood",
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500",
  },
  {
    name: "Beverages",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500",
  },
  {
    name: "Snacks",
    image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500",
  },
  {
    name: "Frozen Foods",
    image: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=500",
  },
  {
    name: "Personal Care",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500",
  },
];

// Map FakeStore categories to grocery categories
const categoryMapping = {
  "men's clothing": "Snacks",
  "women's clothing": "Snacks",
  "electronics": "Beverages",
  "jewelery": "Snacks",
};

// Function to get or create category
async function getOrCreateCategory(categoryName) {
  try {
    let category = await category_model.findOne({ name: categoryName });
    
    if (!category) {
      // Find the category in POPULAR_CATEGORIES
      const popularCategory = POPULAR_CATEGORIES.find(cat => cat.name === categoryName);
      
      if (!popularCategory) {
        throw new Error(`Category ${categoryName} not found in popular categories`);
      }
      
      category = new category_model({
        name: categoryName,
        image: popularCategory.image,
        is_active: 1,
      });
      
      await category.save();
      console.log(`✅ Created category: ${categoryName}`);
    }
    
    return category;
  } catch (error) {
    console.error(`❌ Error creating category ${categoryName}:`, error.message);
    throw error;
  }
}

// Function to transform FakeStore product to our product schema
function transformProduct(fakeProduct, category) {
  // Determine label based on rating
  let label = null;
  const rating = fakeProduct.rating?.rate || 0;
  if (rating >= 4.5) {
    label = "Hot";
  } else if (rating >= 4.0) {
    label = "New";
  }

  // Calculate discount (random 10-30% for some products)
  const hasDiscount = Math.random() > 0.6; // 40% chance of discount
  const discountPercentage = hasDiscount ? Math.floor(Math.random() * 21) + 10 : null; // 10-30%
  const originalPrice = hasDiscount && discountPercentage 
    ? Math.round((fakeProduct.price / (1 - discountPercentage / 100)) * 100) / 100 
    : null;

  return {
    name: fakeProduct.title,
    description: fakeProduct.description || "No description available",
    price: fakeProduct.price,
    original_price: originalPrice,
    image: fakeProduct.image,
    category: category.name, // Keep for backward compatibility
    category_id: category._id, // Save category ID
    label: label,
    discount_percentage: discountPercentage,
    rating: rating,
    reviews_count: fakeProduct.rating?.count || 0,
    stock_quantity: Math.floor(Math.random() * 100) + 10, // Random stock between 10-110
    is_active: 1,
  };
}

// Main function to seed products
async function seedProducts() {
  try {
    console.log("🚀 Starting product seeding process...\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_CONNECTION_STRING, {
      dbName: DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB\n");

    // First, create popular categories
    console.log("📦 Creating popular categories...");
    for (const cat of POPULAR_CATEGORIES) {
      try {
        const existingCategory = await category_model.findOne({ name: cat.name });
        if (!existingCategory) {
          const newCategory = new category_model({
            name: cat.name,
            image: cat.image,
            is_active: 1,
          });
          await newCategory.save();
          console.log(`  ✅ Created category: ${cat.name}`);
        } else {
          console.log(`  ⏭️  Category already exists: ${cat.name}`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating category ${cat.name}:`, error.message);
      }
    }
    console.log("");

    // Fetch products from FakeStore API
    console.log("📥 Fetching products from FakeStore API...");
    const response = await axios.get(FAKE_STORE_API);
    const fakeProducts = response.data;
    console.log(`✅ Fetched ${fakeProducts.length} products from API\n`);

    // Process and insert products
    console.log("💾 Inserting products into database...");
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fakeProduct of fakeProducts) {
      try {
        // Check if product already exists (by name)
        const existingProduct = await product_model.findOne({ name: fakeProduct.title });
        if (existingProduct) {
          console.log(`  ⏭️  Skipping existing product: ${fakeProduct.title}`);
          skipCount++;
          continue;
        }

        // Map category
        const mappedCategory = categoryMapping[fakeProduct.category] || "Snacks";
        
        // Get or create category
        const category = await getOrCreateCategory(mappedCategory);

        // Transform product data (pass category object instead of name)
        const productData = transformProduct(fakeProduct, category);

        // Create and save product
        const product = new product_model(productData);
        await product.save();

        console.log(`  ✅ Inserted: ${fakeProduct.title.substring(0, 50)}...`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error inserting product ${fakeProduct.title}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Seeding Summary:");
    console.log(`  ✅ Successfully inserted: ${successCount} products`);
    console.log(`  ⏭️  Skipped (already exist): ${skipCount} products`);
    console.log(`  ❌ Errors: ${errorCount} products`);
    console.log("=".repeat(50) + "\n");

    // Close connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    console.log("🎉 Seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error during seeding:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seeding function
seedProducts();

