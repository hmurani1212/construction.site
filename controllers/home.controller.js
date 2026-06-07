const category_service = require("../services/category.service");
const product_service = require("../services/product.service");
const order_data_repository = require("../data_repositories/order.data_repository");
const product_data_repository = require("../data_repositories/product.data_repository");
const mongoose = require("mongoose");

// Cache for popular products - stores selected product IDs
let cachedPopularProductIds = null;
let cachedProductCount = 0;

class home_controller {
  async get_home_data(req, res) {
    try {
      console.log(`FILE: home.controller.js | get_home_data | Request received`);

      // Fetch active categories
      const categories_result = await category_service.get_all_categories();
      const popular_categories = categories_result.STATUS === "SUCCESSFUL" 
        ? (categories_result.DB_DATA.categories || categories_result.DB_DATA || []) 
        : [];

      // Fetch products with consistent random selection (cached)
      const product_model = require("../models/product.model");
      // Exclude ramzan products from popular products
      const total_active_products = await product_model.countDocuments({ is_active: 1, $and: [{ bulk_material: { $ne: true } }, { ramzan_product: { $ne: true } }] });
      
      let popular_products = [];
      
      // Check if we need to reselect products (cache is empty or product count changed)
      if (!cachedPopularProductIds || cachedProductCount !== total_active_products) {
        console.log(`FILE: home.controller.js | get_home_data | Selecting new random products (cache miss or product count changed)`);
        
        // Fetch all active products for random selection (exclude ramzan products)
        const all_products = await product_model.find({ is_active: 1, $and: [{ bulk_material: { $ne: true } }, { ramzan_product: { $ne: true } }] })
          .populate('category_id', 'name image')
          .select('-__v')
          .lean();
        
        console.log(`FILE: home.controller.js | get_home_data | Fetched ${all_products.length} products for randomization`);
        
        if (all_products.length > 0) {
          // Use a seeded random selection for consistency
          // Use product count as seed to ensure same selection for same product set
          const seed = total_active_products;
          
          // Shuffle array with seed (Fisher-Yates shuffle with seeded random)
          const shuffled = [...all_products];
          let seedValue = seed;
          const seededRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
          };
          
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          // Take 20 random products (or all available if less than 20)
          const target_count = Math.min(20, shuffled.length);
          const selected_products = shuffled.slice(0, target_count);
          
          // Cache the selected product IDs
          cachedPopularProductIds = selected_products.map(p => p._id.toString());
          cachedProductCount = total_active_products;
          
          popular_products = selected_products;
          
          console.log(`FILE: home.controller.js | get_home_data | Cached ${popular_products.length} popular products`);
        }
      } else {
        // Use cached product IDs
        console.log(`FILE: home.controller.js | get_home_data | Using cached popular products`);
        
        const product_ids = cachedPopularProductIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        
        if (product_ids.length > 0) {
          popular_products = await product_model.find({
            _id: { $in: product_ids },
            is_active: 1,
            $and: [{ bulk_material: { $ne: true } }, { ramzan_product: { $ne: true } }] // Exclude ramzan products
          })
          .populate('category_id', 'name image')
          .lean();
          
          // Maintain the cached order
          const product_map = {};
          popular_products.forEach(product => {
            product_map[product._id.toString()] = product;
          });
          
          const ordered_products = [];
          cachedPopularProductIds.forEach(id => {
            if (product_map[id]) {
              ordered_products.push(product_map[id]);
            }
          });
          
          popular_products = ordered_products;
          
          console.log(`FILE: home.controller.js | get_home_data | Returning ${popular_products.length} cached popular products`);
        }
      }

      // Fetch Daily Best Sells (today's best selling products)
      const daily_best_sells = await get_daily_best_sells();

      return res.status(200).json({
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          Popular_Categories: popular_categories,
          Popular_Products: popular_products,
          Daily_Best_Sells: daily_best_sells,
        },
      });
    } catch (error) {
      console.error(`FILE: home.controller.js | get_home_data | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00601",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

}

// Helper function to get daily best selling products
async function get_daily_best_sells() {
  try {
    console.log(`FILE: home.controller.js | get_daily_best_sells | Fetching daily best selling products`);
    
    const TARGET_COUNT = 4; // Target to return up to 4 products
    const product_model = require("../models/product.model");
    
    // Get today's best selling product IDs
    const best_selling_product_ids = await order_data_repository.get_todays_best_selling_products(TARGET_COUNT);
    
    let daily_best_sells = [];
    const seen_product_ids = new Set(); // Track seen product IDs to prevent duplicates
    
    // Fetch product details for best selling products
    if (best_selling_product_ids.length > 0) {
      const product_ids = best_selling_product_ids
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      
      if (product_ids.length > 0) {
        // Fetch products by IDs and maintain order (exclude ramzan products)
        const best_products = await product_model.find({
          _id: { $in: product_ids },
          is_active: 1,
          $and: [{ bulk_material: { $ne: true } }, { ramzan_product: { $ne: true } }] // Exclude ramzan products
        }).populate('category_id', 'name image');
        
        // Create a map for quick lookup
        const product_map = {};
        best_products.forEach(product => {
          product_map[product._id.toString()] = product;
        });
        
        // Add products in the same order as sales ranking, ensuring no duplicates
        best_selling_product_ids.forEach(product_id => {
          const product = product_map[product_id];
          if (product && !seen_product_ids.has(product_id)) {
            daily_best_sells.push(product);
            seen_product_ids.add(product_id);
          }
        });
      }
    }
    
    // If we have less than TARGET_COUNT products, fill with other active products
    if (daily_best_sells.length < TARGET_COUNT) {
      const remaining_count = TARGET_COUNT - daily_best_sells.length;
      
      // Get IDs we already have to exclude them
      const exclude_ids = Array.from(seen_product_ids).map(id => new mongoose.Types.ObjectId(id));
      
      // Build query to exclude already included products and ramzan products
      const additional_query = { is_active: 1, $and: [{ bulk_material: { $ne: true } }, { ramzan_product: { $ne: true } }] };
      if (exclude_ids.length > 0) {
        additional_query._id = { $nin: exclude_ids };
      }
      
      // Fetch additional products (excluding already included ones and ramzan products)
      const additional_products = await product_model
        .find(additional_query)
        .populate('category_id', 'name image')
        .sort({ created_at: -1 }) // Sort by newest
        .limit(remaining_count);
      
      // Add additional products, ensuring no duplicates
      additional_products.forEach(product => {
        const product_id = product._id.toString();
        if (!seen_product_ids.has(product_id)) {
          daily_best_sells.push(product);
          seen_product_ids.add(product_id);
        }
      });
    }
    
    // Return products (up to TARGET_COUNT, but only what's available)
    // No need to force exactly 4 - return what we have
    const final_products = daily_best_sells.slice(0, TARGET_COUNT);
    
    console.log(`FILE: home.controller.js | get_daily_best_sells | Returning ${final_products.length} unique daily best selling products`);
    
    return final_products;
  } catch (error) {
    console.error(`FILE: home.controller.js | get_daily_best_sells | Error:`, error);
    // Return empty array on error, don't break the home API
    return [];
  }
}

module.exports = new home_controller();

