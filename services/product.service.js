const product_data_repository = require("../data_repositories/product.data_repository");

class product_service {
  constructor() {
    console.log("FILE: product.service.js | constructor | Service initialized");
  }

  async create_product(product_data) {
    try {
      console.log(`FILE: product.service.js | create_product | Creating product: ${product_data.name}`);

      // Backward compatibility: if image is provided but main_image is not, use image as main_image
      if (product_data.image && !product_data.main_image) {
        product_data.main_image = product_data.image;
      }

      // Validate main_image is provided
      if (!product_data.main_image) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00405",
          ERROR_DESCRIPTION: "Main image is required",
        };
      }

      // If category is provided as name, find and set category_id
      if (product_data.category && !product_data.category_id) {
        const category_model = require("../models/category.model");
        const categoryDoc = await category_model.findOne({ name: product_data.category, is_active: 1 });
        if (categoryDoc) {
          product_data.category_id = categoryDoc._id;
        }
      }

      // Validate category_id is provided
      if (!product_data.category_id) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00406",
          ERROR_DESCRIPTION: "Category ID is required",
        };
      }

      // Calculate discount percentage if original_price is provided
      if (product_data.original_price && product_data.price < product_data.original_price) {
        const discount = ((product_data.original_price - product_data.price) / product_data.original_price) * 100;
        product_data.discount_percentage = Math.round(discount);
      }

      // Process additional_items: calculate discount for each item if original_price is provided
      if (product_data.additional_items && Array.isArray(product_data.additional_items)) {
        product_data.additional_items = product_data.additional_items.map((item) => {
          if (item.original_price && item.price < item.original_price) {
            const itemDiscount = ((item.original_price - item.price) / item.original_price) * 100;
            item.discount_percentage = Math.round(itemDiscount);
          }
          return item;
        });
      }

      const new_product = await product_data_repository.create_product(product_data);

      // Trigger notification for new product (async, non-blocking)
      setImmediate(async () => {
        try {
          const notification_service = require("./notification.service");
          await notification_service.notifyNewProduct(new_product._id.toString());
        } catch (error) {
          console.error(`FILE: product.service.js | create_product | Error sending notifications:`, error);
          // Don't fail product creation if notification fails
        }
      });

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: new_product,
      };
    } catch (error) {
      console.error(`FILE: product.service.js | create_product | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00401",
        ERROR_DESCRIPTION: error.message || "Failed to create product",
      };
    }
  }

  async get_product_by_id(product_id) {
    try {
      console.log(`FILE: product.service.js | get_product_by_id | Fetching product: ${product_id}`);

      const product = await product_data_repository.get_product_by_id(product_id);
      if (!product) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00501",
          ERROR_DESCRIPTION: "Product not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: product,
      };
    } catch (error) {
      console.error(`FILE: product.service.js | get_product_by_id | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00502",
        ERROR_DESCRIPTION: error.message || "Failed to fetch product",
      };
    }
  }

  async get_all_products(query_params) {
    try {
      console.log(`FILE: product.service.js | get_all_products | Fetching products with params:`, query_params);

      const page = parseInt(query_params.page) || 1;
      const limit = parseInt(query_params.limit) || 50;
      const skip = (page - 1) * limit;

      // Build filters
      const filters = { is_active: 1 };
      
      // Only accept category_id (not category name)
      if (query_params.category_id) {
        // Use category_id directly if provided
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(query_params.category_id)) {
          filters.category_id = new mongoose.Types.ObjectId(query_params.category_id);
          console.log(`FILE: product.service.js | get_all_products | Filtering by category_id: ${query_params.category_id}`);
        } else {
          console.log(`FILE: product.service.js | get_all_products | Invalid category_id format: ${query_params.category_id}`);
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-00507",
            ERROR_DESCRIPTION: "Invalid category_id format. Please provide a valid MongoDB ObjectId.",
          };
        }
      }
      if (query_params.search) {
        filters.$or = [
          { name: { $regex: query_params.search, $options: "i" } },
          { description: { $regex: query_params.search, $options: "i" } },
          { material_type: { $regex: query_params.search, $options: "i" } },
        ];
        console.log(`FILE: product.service.js | get_all_products | Searching in name and description for: "${query_params.search}"`);
      }

      if (query_params.material_type) {
        filters.material_type = { $regex: query_params.material_type, $options: "i" };
      }

      if (query_params.unit_type) {
        filters.unit_type = query_params.unit_type;
      }

      if (query_params.delivery_available === "true") {
        filters.delivery_available = true;
      }

      if (query_params.featured === "true") {
        filters.featured = true;
      }

      if (query_params.brand) {
        filters.brand_supplier = { $regex: query_params.brand, $options: "i" };
      }

      // Build sort
      const sort = {};
      if (query_params.sort_by) {
        switch (query_params.sort_by) {
          case "price_low":
            sort.price = 1;
            break;
          case "price_high":
            sort.price = -1;
            break;
          case "rating":
            sort.rating = -1;
            break;
          case "newest":
            sort.created_at = -1;
            break;
          default:
            sort.created_at = -1;
        }
      } else {
        sort.created_at = -1;
      }

      const products = await product_data_repository.get_all_products(filters, sort, skip, limit);
      const total_count = await product_data_repository.count_products(filters);

      console.log(`FILE: product.service.js | get_all_products | Returning ${products.length} products (total: ${total_count})`);
      console.log(`FILE: product.service.js | get_all_products | Filters applied - category_id: ${filters.category_id || 'N/A'}, search: ${query_params.search || 'N/A'}`);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          products: products,
          pagination: {
            page: page,
            limit: limit,
            total: total_count,
            total_pages: Math.ceil(total_count / limit),
          },
        },
      };
    } catch (error) {
      console.error(`FILE: product.service.js | get_all_products | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00503",
        ERROR_DESCRIPTION: error.message || "Failed to fetch products",
      };
    }
  }

  async update_product(product_id, update_data) {
    try {
      console.log(`FILE: product.service.js | update_product | Updating product: ${product_id}`);

      // Check if product exists
      const existing_product = await product_data_repository.get_product_by_id(product_id);
      if (!existing_product) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00601",
          ERROR_DESCRIPTION: "Product not found",
        };
      }

      // If category is provided as name, find and set category_id
      if (update_data.category && !update_data.category_id) {
        const category_model = require("../models/category.model");
        const categoryDoc = await category_model.findOne({ name: update_data.category, is_active: 1 });
        if (categoryDoc) {
          update_data.category_id = categoryDoc._id;
        }
      }

      // Calculate discount percentage if original_price is provided
      if (update_data.original_price && update_data.price && update_data.price < update_data.original_price) {
        const discount = ((update_data.original_price - update_data.price) / update_data.original_price) * 100;
        update_data.discount_percentage = Math.round(discount);
      }

      const updated_product = await product_data_repository.update_product(product_id, update_data);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated_product,
      };
    } catch (error) {
      console.error(`FILE: product.service.js | update_product | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00602",
        ERROR_DESCRIPTION: error.message || "Failed to update product",
      };
    }
  }

  async delete_product(product_id) {
    try {
      console.log(`FILE: product.service.js | delete_product | Deleting product: ${product_id}`);

      // Check if product exists
      const existing_product = await product_data_repository.get_product_by_id(product_id);
      if (!existing_product) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00701",
          ERROR_DESCRIPTION: "Product not found",
        };
      }

      const deleted_product = await product_data_repository.delete_product(product_id);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: { message: "Product deleted successfully", product_id: product_id },
      };
    } catch (error) {
      console.error(`FILE: product.service.js | delete_product | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00702",
        ERROR_DESCRIPTION: error.message || "Failed to delete product",
      };
    }
  }

  async get_products_list() {
    try {
      console.log(`FILE: product.service.js | get_products_list | Fetching products list`);
      const products = await product_data_repository.get_products_list();
      
      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: products,
      };
    } catch (error) {
      console.error(`FILE: product.service.js | get_products_list | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00508",
        ERROR_DESCRIPTION: error.message || "Failed to fetch products list",
      };
    }
  }

  async rate_product(product_id, user_id, rating_value) {
    try {
      console.log(`FILE: product.service.js | rate_product | Rating product ${product_id} by user ${user_id} with rating ${rating_value}`);

      // Validate rating value
      if (!rating_value || rating_value < 1 || rating_value > 5) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00510",
          ERROR_DESCRIPTION: "Rating must be between 1 and 5",
        };
      }

      // Get the product
      const product = await product_data_repository.get_product_by_id(product_id);
      if (!product) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00511",
          ERROR_DESCRIPTION: "Product not found",
        };
      }

      // Check if user has already rated this product
      const mongoose = require("mongoose");
      const userObjectId = new mongoose.Types.ObjectId(user_id);
      const existingRating = product.ratings?.find(
        (r) => r.user_id.toString() === userObjectId.toString()
      );

      let updatedProduct;
      const moment = require("moment");

      if (existingRating) {
        // User has already rated - update existing rating
        console.log(`FILE: product.service.js | rate_product | User has already rated, updating existing rating`);
        
        // Update the existing rating
        const updatedRatings = product.ratings.map((r) => {
          if (r.user_id.toString() === userObjectId.toString()) {
            return {
              user_id: r.user_id,
              rating: rating_value,
              created_at: r.created_at, // Keep original created_at
            };
          }
          return r;
        });

        // Calculate new average rating
        const totalRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / updatedRatings.length;

        updatedProduct = await product_data_repository.update_product(product_id, {
          ratings: updatedRatings,
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          reviews_count: updatedRatings.length,
          updated_at: moment().unix(),
        });
      } else {
        // User hasn't rated yet - add new rating
        console.log(`FILE: product.service.js | rate_product | Adding new rating`);
        
        const newRating = {
          user_id: userObjectId,
          rating: rating_value,
          created_at: moment().unix(),
        };

        const updatedRatings = [...(product.ratings || []), newRating];

        // Calculate new average rating
        const totalRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / updatedRatings.length;

        updatedProduct = await product_data_repository.update_product(product_id, {
          ratings: updatedRatings,
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          reviews_count: updatedRatings.length,
          updated_at: moment().unix(),
        });
      }

      // Get user's rating for this product
      const userRating = updatedProduct.ratings?.find(
        (r) => r.user_id.toString() === userObjectId.toString()
      );

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          product: updatedProduct,
          user_rating: userRating?.rating || null,
          already_rated: !!existingRating,
        },
      };
    } catch (error) {
      console.error(`FILE: product.service.js | rate_product | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00512",
        ERROR_DESCRIPTION: error.message || "Failed to rate product",
      };
    }
  }

  async get_ramzan_products(query_params = {}) {
    try {
      console.log(`FILE: product.service.js | get_ramzan_products | Fetching ramzan products with params:`, query_params);

      const page = parseInt(query_params.page) || 1;
      const limit = parseInt(query_params.limit) || 50;
      const skip = (page - 1) * limit;

      // Build filters
      const filters = {};
      
      // Category filter
      if (query_params.category) {
        const category_model = require("../models/category.model");
        const categoryDoc = await category_model.findOne({ name: query_params.category, is_active: 1 });
        if (categoryDoc) {
          filters.category_id = categoryDoc._id;
        } else {
          // Fallback to category name for backward compatibility
          filters.category = query_params.category;
        }
      }

      // Search filter
      if (query_params.search) {
        filters.$or = [
          { name: { $regex: query_params.search, $options: 'i' } },
          { description: { $regex: query_params.search, $options: 'i' } },
        ];
      }

      // Build sort
      const sort = {};
      if (query_params.sort_by === 'price_low') {
        sort.price = 1;
      } else if (query_params.sort_by === 'price_high') {
        sort.price = -1;
      } else if (query_params.sort_by === 'rating') {
        sort.rating = -1;
      } else {
        sort.created_at = -1; // Default: newest first
      }

      // Fetch products
      const products = await product_data_repository.get_ramzan_products(filters, sort, skip, limit);
      const total = await product_data_repository.count_ramzan_products(filters);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          products: products,
          pagination: {
            page: page,
            limit: limit,
            total: total,
            total_pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error(`FILE: product.service.js | get_ramzan_products | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00520",
        ERROR_DESCRIPTION: error.message || "Failed to fetch ramzan products",
      };
    }
  }
}

module.exports = new product_service();

