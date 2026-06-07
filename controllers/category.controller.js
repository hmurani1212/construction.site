const category_service = require("../services/category.service");

class category_controller {
  async create_category(req, res) {
    try {
      console.log(`FILE: category.controller.js | create_category | Request received`);

      const { name, image } = req.body;

      // Validation
      if (!name || !image) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00515",
          ERROR_DESCRIPTION: "Name and image are required",
        });
      }

      const result = await category_service.create_category({
        name,
        image,
      });

      if (result.STATUS === "ERROR") {
        const statusCode = result.ERROR_FILTER === "NOT_FOUND" ? 404 :
                          result.ERROR_FILTER === "DUPLICATE_ENTRY" ? 409 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: category.controller.js | create_category | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00516",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_category_by_id(req, res) {
    try {
      console.log(`FILE: category.controller.js | get_category_by_id | Request received`);
      const { category_id } = req.params;

      const result = await category_service.get_category_by_id(category_id);

      if (result.STATUS === "ERROR") {
        const statusCode = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: category.controller.js | get_category_by_id | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00517",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_categories(req, res) {
    try {
      console.log(`FILE: category.controller.js | get_all_categories | Request received`);

      const filters = {};
      if (req.query.is_active !== undefined) {
        filters.is_active = parseInt(req.query.is_active);
      }

      const result = await category_service.get_all_categories(filters);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: category.controller.js | get_all_categories | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00518",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_category(req, res) {
    try {
      console.log(`FILE: category.controller.js | update_category | Request received`);
      const { category_id } = req.params;
      const { name, image, is_active } = req.body;

      const result = await category_service.update_category(category_id, {
        name,
        image,
        is_active,
      });

      if (result.STATUS === "ERROR") {
        const statusCode = result.ERROR_FILTER === "NOT_FOUND" ? 404 :
                          result.ERROR_FILTER === "DUPLICATE_ENTRY" ? 409 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: category.controller.js | update_category | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00519",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async delete_category(req, res) {
    try {
      console.log(`FILE: category.controller.js | delete_category | Request received`);
      const { category_id } = req.params;

      const result = await category_service.delete_category(category_id);

      if (result.STATUS === "ERROR") {
        const statusCode = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: category.controller.js | delete_category | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00520",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new category_controller();

