const product_service = require("../services/product.service");

class product_controller {
  async create_product(req, res) {
    try {
      console.log(`FILE: product.controller.js | create_product | Request received`);

      const { 
        name, 
        description, 
        price, 
        original_price, 
        image, // Backward compatibility
        main_image, 
        category, 
        category_id,
        label, 
        stock_quantity, 
        unit,
        additional_items,
        ramzan_product,
        bulk_material,
        unit_type,
        minimum_order_quantity,
        material_type,
        dimensions,
        weight,
        specifications,
        usage_application,
        delivery_available,
        bulk_pricing,
        featured,
      } = req.body;

      // Validation - main_image or image (for backward compatibility) is required
      const product_main_image = main_image || image;
      if (!name || !price || !product_main_image || (!category && !category_id)) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00402",
          ERROR_DESCRIPTION: "Name, price, main_image (or image), and category (or category_id) are required",
        });
      }

      if (price < 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00403",
          ERROR_DESCRIPTION: "Price must be a positive number",
        });
      }

      // Validate additional_items if provided
      if (additional_items && Array.isArray(additional_items)) {
        for (const item of additional_items) {
          if (!item.name || !item.image || item.price === undefined) {
            return res.status(400).json({
              STATUS: "ERROR",
              ERROR_FILTER: "INVALID_REQUEST",
              ERROR_CODE: "VTAPP-00411",
              ERROR_DESCRIPTION: "Each additional item must have name, image, and price",
            });
          }
          if (item.price < 0) {
            return res.status(400).json({
              STATUS: "ERROR",
              ERROR_FILTER: "INVALID_REQUEST",
              ERROR_CODE: "VTAPP-00412",
              ERROR_DESCRIPTION: "Additional item price must be a positive number",
            });
          }
        }
      }

      const result = await product_service.create_product({
        name,
        description: description || null,
        price,
        original_price: original_price || null,
        image: image || null, // Keep for backward compatibility
        main_image: product_main_image,
        category: category || null,
        category_id: category_id || null,
        label: label || null,
        stock_quantity: stock_quantity || 0,
        unit: unit || "1 piece",
        unit_type: unit_type || "piece",
        minimum_order_quantity: minimum_order_quantity || 1,
        material_type: material_type || null,
        dimensions: dimensions || null,
        weight: weight || null,
        specifications: specifications || null,
        usage_application: usage_application || null,
        delivery_available: delivery_available !== false && delivery_available !== "false",
        bulk_pricing: bulk_pricing || [],
        featured: featured === true || featured === "true",
        bulk_material: bulk_material === true || bulk_material === "true" || ramzan_product === true || ramzan_product === "true",
        ramzan_product: bulk_material === true || bulk_material === "true" || ramzan_product === true || ramzan_product === "true",
        additional_items: additional_items || [],
      });

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | create_product | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00404",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_product_by_id(req, res) {
    try {
      console.log(`FILE: product.controller.js | get_product_by_id | Request received`);

      const { product_id } = req.params;

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00504",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      const result = await product_service.get_product_by_id(product_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | get_product_by_id | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00505",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_products(req, res) {
    try {
      console.log(`FILE: product.controller.js | get_all_products | Request received`);

      const result = await product_service.get_all_products(req.query);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | get_all_products | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00506",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_product(req, res) {
    try {
      console.log(`FILE: product.controller.js | update_product | Request received`);

      const { product_id } = req.params;
      const update_data = req.body;

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00603",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      if (update_data.price !== undefined && update_data.price < 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00604",
          ERROR_DESCRIPTION: "Price must be a positive number",
        });
      }

      const result = await product_service.update_product(product_id, update_data);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | update_product | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00605",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async delete_product(req, res) {
    try {
      console.log(`FILE: product.controller.js | delete_product | Request received`);

      const { product_id } = req.params;

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00703",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      const result = await product_service.delete_product(product_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | delete_product | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00704",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_products_list(req, res) {
    try {
      console.log(`FILE: product.controller.js | get_products_list | Request received`);
      
      const result = await product_service.get_products_list();
      
      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | get_products_list | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00509",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async rate_product(req, res) {
    try {
      console.log(`FILE: product.controller.js | rate_product | Request received`);

      const { product_id } = req.params;
      const { rating } = req.body;
      // JWT token contains user_id, not _id or id
      const user_id = req.user?.user_id || req.user?._id || req.user?.id;

      console.log(`FILE: product.controller.js | rate_product | User from token:`, req.user);
      console.log(`FILE: product.controller.js | rate_product | Extracted user_id:`, user_id);

      // Check authentication
      if (!user_id) {
        console.log(`FILE: product.controller.js | rate_product | No user_id found in req.user`);
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHENTICATION_REQUIRED",
          ERROR_CODE: "VTAPP-00513",
          ERROR_DESCRIPTION: "Authentication required to rate products",
        });
      }

      if (!product_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00514",
          ERROR_DESCRIPTION: "Product ID is required",
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-00515",
          ERROR_DESCRIPTION: "Rating must be between 1 and 5",
        });
      }

      const result = await product_service.rate_product(product_id, user_id, rating);

      if (result.STATUS === "ERROR") {
        const status_code = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(status_code).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | rate_product | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00516",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_ramzan_products(req, res) {
    try {
      console.log(`FILE: product.controller.js | get_ramzan_products | Request received`);

      const result = await product_service.get_ramzan_products(req.query);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: product.controller.js | get_ramzan_products | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00521",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new product_controller();

