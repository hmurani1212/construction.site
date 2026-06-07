const category_data_repository = require("../data_repositories/category.data_repository");

class category_service {
  constructor() {
    console.log("FILE: category.service.js | Category Service initialized");
  }

  async create_category(category_data) {
    try {
      console.log(`FILE: category.service.js | create_category | Creating category: ${category_data.name}`);

      // Validation
      if (!category_data.name || !category_data.image) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00501",
          ERROR_DESCRIPTION: "Name and image are required",
        };
      }

      const new_category = await category_data_repository.create_category({
        name: category_data.name.trim(),
        image: category_data.image.trim(),
        is_active: 1,
      });

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: new_category,
      };
    } catch (error) {
      console.error(`FILE: category.service.js | create_category | Error:`, error);
      
      if (error.code === 11000) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "DUPLICATE_ENTRY",
          ERROR_CODE: "VTAPP-00502",
          ERROR_DESCRIPTION: "Category with this name already exists",
        };
      }

      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00503",
        ERROR_DESCRIPTION: error.message || "Failed to create category",
      };
    }
  }

  async get_category_by_id(category_id) {
    try {
      console.log(`FILE: category.service.js | get_category_by_id | Fetching category: ${category_id}`);

      if (!category_id) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00504",
          ERROR_DESCRIPTION: "Category ID is required",
        };
      }

      const category = await category_data_repository.get_category_by_id(category_id);

      if (!category) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00505",
          ERROR_DESCRIPTION: "Category not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: category,
      };
    } catch (error) {
      console.error(`FILE: category.service.js | get_category_by_id | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00506",
        ERROR_DESCRIPTION: error.message || "Failed to fetch category",
      };
    }
  }

  async get_all_categories(filters = {}) {
    try {
      console.log(`FILE: category.service.js | get_all_categories | Fetching all categories`);

      const categories = await category_data_repository.get_all_categories(filters);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: categories,
      };
    } catch (error) {
      console.error(`FILE: category.service.js | get_all_categories | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00507",
        ERROR_DESCRIPTION: error.message || "Failed to fetch categories",
      };
    }
  }

  async update_category(category_id, update_data) {
    try {
      console.log(`FILE: category.service.js | update_category | Updating category: ${category_id}`);

      if (!category_id) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00508",
          ERROR_DESCRIPTION: "Category ID is required",
        };
      }

      const update_fields = {};
      if (update_data.name !== undefined) {
        update_fields.name = update_data.name.trim();
      }
      if (update_data.image !== undefined) {
        update_fields.image = update_data.image.trim();
      }
      if (update_data.is_active !== undefined) {
        update_fields.is_active = update_data.is_active;
      }

      const updated_category = await category_data_repository.update_category(category_id, update_fields);

      if (!updated_category) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00509",
          ERROR_DESCRIPTION: "Category not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated_category,
      };
    } catch (error) {
      console.error(`FILE: category.service.js | update_category | Error:`, error);
      
      if (error.code === 11000) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "DUPLICATE_ENTRY",
          ERROR_CODE: "VTAPP-00510",
          ERROR_DESCRIPTION: "Category with this name already exists",
        };
      }

      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00511",
        ERROR_DESCRIPTION: error.message || "Failed to update category",
      };
    }
  }

  async delete_category(category_id) {
    try {
      console.log(`FILE: category.service.js | delete_category | Deleting category: ${category_id}`);

      if (!category_id) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00512",
          ERROR_DESCRIPTION: "Category ID is required",
        };
      }

      const deleted_category = await category_data_repository.delete_category(category_id);

      if (!deleted_category) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-00513",
          ERROR_DESCRIPTION: "Category not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: { message: "Category deleted successfully" },
      };
    } catch (error) {
      console.error(`FILE: category.service.js | delete_category | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00514",
        ERROR_DESCRIPTION: error.message || "Failed to delete category",
      };
    }
  }
}

module.exports = new category_service();

