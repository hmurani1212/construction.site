const order_service = require("../services/order.service");
const auth_middleware = require("../middlewares/auth.middleware");

class order_controller {
  async create_order(req, res) {
    try {
      console.log(`FILE: order.controller.js | create_order | Request received`);

      const user = req.user; // From auth middleware (can be null for guest orders)
      const {
        items,
        shipping_address,
        payment_method,
        payment_account_number,
        payment_proof,
        tax,
        shipping,
        delivery_charges,
        delivery_date,
        delivery_instructions,
        is_bulk_quote_order,
        user_id,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01306",
          ERROR_DESCRIPTION: "Items are required",
        });
      }

      // Determine if this is a guest order (user not logged in)
      const is_guest_order = !user || !user.user_id;

      // Validation for shipping address
      if (!shipping_address) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01307",
          ERROR_DESCRIPTION: "Shipping address is required",
        });
      }

      // For guest orders, require name, phone, and address
      if (is_guest_order) {
        if (!shipping_address.name || !shipping_address.name.trim()) {
          return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01320",
            ERROR_DESCRIPTION: "Name is required for guest orders",
          });
        }

        if (!shipping_address.phone || !shipping_address.phone.trim()) {
          return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01321",
            ERROR_DESCRIPTION: "Phone number is required for guest orders",
          });
        }

        if (!shipping_address.address || !shipping_address.address.trim()) {
          return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01322",
            ERROR_DESCRIPTION: "Address is required for guest orders",
          });
        }
      } else {
        // For logged-in users, email is required (for backward compatibility)
        if (!shipping_address.email || !shipping_address.email.trim()) {
          return res.status(400).json({
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01323",
            ERROR_DESCRIPTION: "Email is required",
          });
        }
      }

      if (!payment_method) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01308",
          ERROR_DESCRIPTION: "Payment method is required",
        });
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const delivery_fee = delivery_charges !== undefined ? delivery_charges : (shipping || 0);
      const total = subtotal + (tax || 0) + delivery_fee;

      // Determine user_id:
      // 1. If user_id is explicitly provided in request body (including null), use it
      // 2. If user_id is NOT provided in request body, use authenticated user's ID from token
      // 3. If no user is logged in and user_id not provided, use null (guest order)
      let order_user_id = null;
      
      // Check if user_id key exists in request body (not just if it's truthy)
      if ('user_id' in req.body) {
        // user_id was explicitly sent from frontend (can be null or a value)
        order_user_id = user_id; // Use the value as-is (null or actual ID)
        console.log(`FILE: order.controller.js | create_order | Using user_id from request body: ${order_user_id}`);
      } else if (user && user.user_id) {
        // user_id was NOT sent from frontend, use authenticated user's ID from token
        order_user_id = user.user_id;
        console.log(`FILE: order.controller.js | create_order | Using user_id from token: ${order_user_id}`);
      } else {
        // Guest order - user_id remains null
        console.log(`FILE: order.controller.js | create_order | Guest order - user_id is null`);
      }

      const order_data = {
        user_id: order_user_id,
        items: items,
        subtotal: subtotal,
        tax: tax || 0,
        shipping: delivery_fee,
        delivery_charges: delivery_fee,
        total: total,
        shipping_address: shipping_address,
        payment_method: payment_method,
        payment_account_number: payment_account_number || null,
        payment_proof: payment_proof || null,
        delivery_date: delivery_date || null,
        delivery_instructions: delivery_instructions || null,
        is_bulk_quote_order: is_bulk_quote_order === true || is_bulk_quote_order === "true",
        quote_status: is_bulk_quote_order ? "requested" : "none",
        order_status: is_bulk_quote_order ? "quote_requested" : "pending",
      };

      const result = await order_service.create_order(order_data);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: order.controller.js | create_order | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01309",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_order_by_id(req, res) {
    try {
      console.log(`FILE: order.controller.js | get_order_by_id | Request received for ID: ${req.params.order_id}`);

      const result = await order_service.get_order_by_id(req.params.order_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: order.controller.js | get_order_by_id | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01310",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_user_orders(req, res) {
    try {
      console.log(`FILE: order.controller.js | get_user_orders | Request received`);

      const user = req.user; // From auth middleware
      const result = await order_service.get_user_orders(user.user_id);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: order.controller.js | get_user_orders | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01311",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_orders(req, res) {
    try {
      console.log(`FILE: order.controller.js | get_all_orders | Request received`);

      const filters = {
        payment_status: req.query.payment_status || null,
        order_status: req.query.order_status || null,
        user_id: req.query.user_id || null,
      };

      const result = await order_service.get_all_orders(filters);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: order.controller.js | get_all_orders | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01313",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_order_status(req, res) {
    try {
      console.log(`FILE: order.controller.js | update_order_status | Request received for order: ${req.params.order_id}`);

      const { order_status } = req.body;

      if (!order_status) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01318",
          ERROR_DESCRIPTION: "Order status is required",
        });
      }

      const result = await order_service.update_order_status(req.params.order_id, order_status);

      if (result.STATUS === "ERROR") {
        const status_code = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(status_code).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: order.controller.js | update_order_status | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01319",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new order_controller();

