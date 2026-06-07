const product_model = require("../models/product.model");

class product_data_repository {
  constructor() {
    console.log("FILE: product.data_repository.js | constructor | Data Repository initialized");
  }

  async create_product(product_data) {
    try {
      console.log(`FILE: product.data_repository.js | create_product | Creating product: ${product_data.name}`);
      const new_product = new product_model(product_data);
      const saved_product = await new_product.save();
      return saved_product;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | create_product | Error:`, error);
      throw error;
    }
  }

  async get_product_by_id(product_id) {
    try {
      console.log(`FILE: product.data_repository.js | get_product_by_id | Fetching product: ${product_id}`);
      const product = await product_model.findById(product_id)
        .populate('category_id', 'name image')
        .populate('ratings.user_id', 'name email');
      return product;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | get_product_by_id | Error:`, error);
      throw error;
    }
  }

  async get_all_products(filters = {}, sort = {}, skip = 0, limit = 50) {
    try {
      console.log(`FILE: product.data_repository.js | get_all_products | Fetching products with filters:`, filters);
      const query = product_model.find(filters);
      
      // Populate category_id to get category details
      query.populate('category_id', 'name image');
      
      if (Object.keys(sort).length > 0) {
        query.sort(sort);
      }
      
      query.skip(skip).limit(limit);
      const products = await query.exec();
      return products;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | get_all_products | Error:`, error);
      throw error;
    }
  }

  async count_products(filters = {}) {
    try {
      console.log(`FILE: product.data_repository.js | count_products | Counting products with filters:`, filters);
      // Note: countDocuments doesn't support populate, but filters with category_id will work correctly
      const count = await product_model.countDocuments(filters);
      console.log(`FILE: product.data_repository.js | count_products | Found ${count} products matching filters`);
      return count;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | count_products | Error:`, error);
      throw error;
    }
  }

  async update_product(product_id, update_data) {
    try {
      console.log(`FILE: product.data_repository.js | update_product | Updating product: ${product_id}`);
      update_data.updated_at = Math.floor(Date.now() / 1000);
      const updated_product = await product_model.findByIdAndUpdate(
        product_id,
        { $set: update_data },
        { new: true, runValidators: true }
      );
      return updated_product;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | update_product | Error:`, error);
      throw error;
    }
  }

  async delete_product(product_id) {
    try {
      console.log(`FILE: product.data_repository.js | delete_product | Deleting product: ${product_id}`);
      const deleted_product = await product_model.findByIdAndDelete(product_id);
      return deleted_product;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | delete_product | Error:`, error);
      throw error;
    }
  }

  async get_products_by_category(category, skip = 0, limit = 50) {
    try {
      console.log(`FILE: product.data_repository.js | get_products_by_category | Fetching products for category: ${category}`);
      
      // Try to find category by name first to get category_id
      const category_model = require("../models/category.model");
      const categoryDoc = await category_model.findOne({ name: category, is_active: 1 });
      
      // Build query - support both category name and category_id
      const query = { is_active: 1 };
      if (categoryDoc) {
        // If category found, use category_id (preferred)
        query.category_id = categoryDoc._id;
      } else {
        // Fallback to category name for backward compatibility
        query.category = category;
      }
      
      const products = await product_model
        .find(query)
        .populate('category_id', 'name image') // Populate category details
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
      return products;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | get_products_by_category | Error:`, error);
      throw error;
    }
  }

  async get_products_list() {
    try {
      console.log(`FILE: product.data_repository.js | get_products_list | Fetching products list (name and id only)`);
      const products = await product_model
        .find({ is_active: 1 })
        .select('_id name price')
        .sort({ name: 1 });
      return products;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | get_products_list | Error:`, error);
      throw error;
    }
  }

  async get_ramzan_products(filters = {}, sort = {}, skip = 0, limit = 50) {
    try {
      console.log(`FILE: product.data_repository.js | get_ramzan_products | Fetching ramzan products`);
      const query = product_model.find({
        is_active: 1,
        $or: [{ bulk_material: true }, { ramzan_product: true }],
        ...filters,
      });
      
      // Populate category_id to get category details
      query.populate('category_id', 'name image');
      
      if (Object.keys(sort).length > 0) {
        query.sort(sort);
      } else {
        query.sort({ created_at: -1 }); // Default sort by newest
      }
      
      query.skip(skip).limit(limit);
      const products = await query.exec();
      return products;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | get_ramzan_products | Error:`, error);
      throw error;
    }
  }

  async count_ramzan_products(filters = {}) {
    try {
      console.log(`FILE: product.data_repository.js | count_ramzan_products | Counting ramzan products`);
      const count = await product_model.countDocuments({
        is_active: 1,
        $or: [{ bulk_material: true }, { ramzan_product: true }],
        ...filters,
      });
      console.log(`FILE: product.data_repository.js | count_ramzan_products | Found ${count} ramzan products`);
      return count;
    } catch (error) {
      console.error(`FILE: product.data_repository.js | count_ramzan_products | Error:`, error);
      throw error;
    }
  }
}

module.exports = new product_data_repository();

