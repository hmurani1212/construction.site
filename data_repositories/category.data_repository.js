const category_model = require("../models/category.model");
const moment = require("moment");

class category_data_repository {
  constructor() {
    console.log("FILE: category.data_repository.js | Category Data Repository initialized");
  }

  async create_category(category_data) {
    try {
      console.log(`FILE: category.data_repository.js | create_category | Creating category: ${category_data.name}`);
      const new_category = new category_model(category_data);
      const saved_category = await new_category.save();
      return saved_category;
    } catch (error) {
      console.error(`FILE: category.data_repository.js | create_category | Error:`, error);
      throw error;
    }
  }

  async get_category_by_id(category_id) {
    try {
      console.log(`FILE: category.data_repository.js | get_category_by_id | Fetching category: ${category_id}`);
      const category = await category_model.findById(category_id);
      return category;
    } catch (error) {
      console.error(`FILE: category.data_repository.js | get_category_by_id | Error:`, error);
      throw error;
    }
  }

  async get_all_categories(filters = {}) {
    try {
      console.log(`FILE: category.data_repository.js | get_all_categories | Fetching all categories`);
      const query = {};
      
      if (filters.is_active !== undefined) {
        query.is_active = filters.is_active;
      }

      const categories = await category_model.find(query).sort({ created_at: -1 });
      return categories;
    } catch (error) {
      console.error(`FILE: category.data_repository.js | get_all_categories | Error:`, error);
      throw error;
    }
  }

  async update_category(category_id, update_data) {
    try {
      console.log(`FILE: category.data_repository.js | update_category | Updating category: ${category_id}`);
      update_data.updated_at = moment().unix();
      const updated_category = await category_model.findByIdAndUpdate(
        category_id,
        { $set: update_data },
        { new: true, runValidators: true }
      );
      return updated_category;
    } catch (error) {
      console.error(`FILE: category.data_repository.js | update_category | Error:`, error);
      throw error;
    }
  }

  async delete_category(category_id) {
    try {
      console.log(`FILE: category.data_repository.js | delete_category | Deleting category: ${category_id}`);
      const deleted_category = await category_model.findByIdAndDelete(category_id);
      return deleted_category;
    } catch (error) {
      console.error(`FILE: category.data_repository.js | delete_category | Error:`, error);
      throw error;
    }
  }
}

module.exports = new category_data_repository();

