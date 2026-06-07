const mongoose = require("mongoose");
const moment = require("moment");

// Get MongoDB connection
const { db_connection } = require("../_core_app_connectivities/db_connection_shared");
const product_model = require("../models/product.model");

async function update_all_products_with_unit() {
  try {
    console.log("FILE: test.js | update_all_products_with_unit | Starting update process...");

    // Use updateMany to update all products that don't have unit field in the database
    // This directly updates the database without relying on Mongoose defaults
    const result = await product_model.updateMany(
      { unit: { $exists: false } }, // Only update products where unit field doesn't exist in DB
      {
        $set: {
          unit: "1kg",
          updated_at: moment().unix(),
        },
      }
    );

    console.log(`FILE: test.js | update_all_products_with_unit | Update completed!`);
    console.log(`FILE: test.js | update_all_products_with_unit | Matched: ${result.matchedCount} products`);
    console.log(`FILE: test.js | update_all_products_with_unit | Modified: ${result.modifiedCount} products`);

    // Also update products that have empty or null unit
    const result2 = await product_model.updateMany(
      { $or: [{ unit: "" }, { unit: null }] },
      {
        $set: {
          unit: "1kg",
          updated_at: moment().unix(),
        },
      }
    );

    console.log(`FILE: test.js | update_all_products_with_unit | Updated empty/null units: ${result2.modifiedCount} products`);

    // Force update all products to ensure unit field is saved in database
    // This ensures the field is actually stored, not just using schema default
    console.log("FILE: test.js | update_all_products_with_unit | Force updating all products to ensure unit field is saved...");
    const result3 = await product_model.updateMany(
      {},
      {
        $set: {
          unit: "1kg",
          updated_at: moment().unix(),
        },
      }
    );
    console.log(`FILE: test.js | update_all_products_with_unit | Force updated: ${result3.modifiedCount} products`);

    // Verify by checking a few products directly from database
    const sampleProducts = await product_model.find({}).limit(5).lean();
    console.log("\nFILE: test.js | update_all_products_with_unit | Sample products after update:");
    sampleProducts.forEach(product => {
      const unitValue = product.unit !== undefined ? `"${product.unit}"` : 'NOT SET IN DB';
      console.log(`  - ${product.name}: unit = ${unitValue}`);
    });

    const totalUpdated = result.modifiedCount + result2.modifiedCount + result3.modifiedCount;
    console.log(`\nFILE: test.js | update_all_products_with_unit | Total products updated: ${totalUpdated}`);

    process.exit(0);
  } catch (error) {
    console.error(`FILE: test.js | update_all_products_with_unit | Error:`, error);
    process.exit(1);
  }
}

// Run the update
update_all_products_with_unit();
