// CRITICAL: Import models in dependency order to ensure they are registered before populate operations
// Import base models first
const mongoose = require("mongoose");
const user_model = require("../models/user.model");
const product_model = require("../models/product.model");
const category_model = require("../models/category.model");
// Import dependent models
const order_model = require("../models/order.model");
const moment = require("moment");

class order_data_repository {
  constructor() {
    console.log("FILE: order.data_repository.js | Order Data Repository initialized");
  }

  async create_order(order_data) {
    try {
      const user_info = order_data.user_id ? `user: ${order_data.user_id}` : 'guest order';
      console.log(`FILE: order.data_repository.js | create_order | Creating order for ${user_info}`);
      const new_order = new order_model(order_data);
      const saved_order = await new_order.save();
      return saved_order;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | create_order | Error:`, error);
      throw error;
    }
  }

  async get_order_by_id(order_id) {
    try {
      console.log(`FILE: order.data_repository.js | get_order_by_id | Fetching order: ${order_id}`);
      const order = await order_model.findById(order_id)
        // .populate("user_id", "name email phone")
        // .populate("items.product_id", "name image");
      return order;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | get_order_by_id | Error:`, error);
      throw error;
    }
  }

  async get_order_by_number(order_number) {
    try {
      console.log(`FILE: order.data_repository.js | get_order_by_number | Fetching order: ${order_number}`);
      const order = await order_model.findOne({ order_number })
        .populate("user_id", "name email phone")
        .populate("items.product_id", "name image unit");
      return order;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | get_order_by_number | Error:`, error);
      throw error;
    }
  }

  async get_orders_by_user(user_id, filters = {}) {
    try {
      console.log(`FILE: order.data_repository.js | get_orders_by_user | Fetching orders for user: ${user_id}`);
      
      // Ensure product model is registered before populate
      // This ensures the model exists on the connection when populate is called
      if (!product_model) {
        throw new Error("Product model not loaded");
      }
      
      const query = { user_id, is_active: 1 };
      
      if (filters.payment_status) {
        query.payment_status = filters.payment_status;
      }
      if (filters.order_status) {
        query.order_status = filters.order_status;
      }

      const orders = await order_model.find(query)
        .populate("items.product_id", "name image unit")
        .sort({ created_at: -1 });
      return orders;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | get_orders_by_user | Error:`, error);
      throw error;
    }
  }

  async get_all_orders(filters = {}) {
    try {
      console.log(`FILE: order.data_repository.js | get_all_orders | Fetching all orders`);
      
      // Ensure models are registered before populate
      if (!product_model || !user_model) {
        throw new Error("Models not loaded");
      }
      
      const query = { is_active: 1 };
      
      if (filters.payment_status) {
        query.payment_status = filters.payment_status;
      }
      if (filters.order_status) {
        query.order_status = filters.order_status;
      }
      if (filters.user_id) {
        query.user_id = filters.user_id;
      }

      const orders = await order_model.find(query)
        .populate("user_id", "name email phone")
        .populate("items.product_id", "name image unit")
        .sort({ created_at: -1 });
      return orders;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | get_all_orders | Error:`, error);
      throw error;
    }
  }

  async update_order(order_id, update_data) {
    try {
      console.log(`FILE: order.data_repository.js | update_order | Updating order: ${order_id}`);
      update_data.updated_at = moment().unix();
      const updated_order = await order_model.findByIdAndUpdate(
        order_id,
        { $set: update_data },
        { new: true, runValidators: true }
      );
      return updated_order;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | update_order | Error:`, error);
      throw error;
    }
  }

  async generate_order_number() {
    try {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      return `ORD-${timestamp}-${random}`;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | generate_order_number | Error:`, error);
      throw error;
    }
  }

  async get_todays_best_selling_products(limit = 4) {
    try {
      console.log(`FILE: order.data_repository.js | get_todays_best_selling_products | Fetching today's best selling products`);
      
      // Get start and end of today (in Unix timestamp)
      const start_of_today = moment().startOf('day').unix();
      const end_of_today = moment().endOf('day').unix();
      
      // Find all orders from today with paid status
      const todays_orders = await order_model.find({
        created_at: { $gte: start_of_today, $lte: end_of_today },
        is_active: 1,
        payment_status: 'paid', // Only count paid orders
      });

      // Count product sales (aggregate quantities by product_id)
      const product_sales = {};
      
      todays_orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            // Handle both ObjectId and string product_id
            let product_id = null;
            if (item.product_id) {
              if (typeof item.product_id === 'object' && item.product_id.toString) {
                product_id = item.product_id.toString();
              } else {
                product_id = String(item.product_id);
              }
            }
            
            if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
              if (!product_sales[product_id]) {
                product_sales[product_id] = {
                  product_id: product_id,
                  total_quantity: 0,
                };
              }
              product_sales[product_id].total_quantity += item.quantity || 0;
            }
          });
        }
      });

      // Sort by total quantity (descending) and get top products
      const sorted_products = Object.values(product_sales)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, limit)
        .map(item => item.product_id);

      console.log(`FILE: order.data_repository.js | get_todays_best_selling_products | Found ${sorted_products.length} products with sales today`);

      return sorted_products;
    } catch (error) {
      console.error(`FILE: order.data_repository.js | get_todays_best_selling_products | Error:`, error);
      throw error;
    }
  }
}

module.exports = new order_data_repository();

