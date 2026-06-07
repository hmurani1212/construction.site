const payment_service = require("../services/payment.service");
const auth_middleware = require("../middlewares/auth.middleware");

class payment_controller {
  async create_payment_intent(req, res) {
    try {
      console.log(`FILE: payment.controller.js | create_payment_intent | Request received`);

      const user = req.user; // From auth middleware
      const { items, shipping_address, tax, shipping } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01206",
          ERROR_DESCRIPTION: "Items are required",
        });
      }

      if (!shipping_address || !shipping_address.name || !shipping_address.email || !shipping_address.address) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01207",
          ERROR_DESCRIPTION: "Shipping address is required with name, email, and address",
        });
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const total = subtotal + (tax || 0) + (shipping || 0);

      const order_data = {
        user_id: user.user_id,
        items: items,
        subtotal: subtotal,
        tax: tax || 0,
        shipping: shipping || 0,
        total: total,
        shipping_address: shipping_address,
        payment_method: "stripe",
      };

      const result = await payment_service.create_payment_intent(order_data);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: payment.controller.js | create_payment_intent | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01208",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async confirm_payment(req, res) {
    try {
      console.log(`FILE: payment.controller.js | confirm_payment | Request received`);

      const { payment_intent_id } = req.body;

      if (!payment_intent_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01209",
          ERROR_DESCRIPTION: "Payment intent ID is required",
        });
      }

      const result = await payment_service.confirm_payment(payment_intent_id);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: payment.controller.js | confirm_payment | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01210",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_payment_status(req, res) {
    try {
      console.log(`FILE: payment.controller.js | get_payment_status | Request received for: ${req.params.payment_intent_id}`);

      const result = await payment_service.get_payment_status(req.params.payment_intent_id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: payment.controller.js | get_payment_status | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01211",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new payment_controller();

