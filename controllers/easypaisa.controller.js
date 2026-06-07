const easypaisa_service = require("../services/easypaisa.service");

class easypaisa_controller {
  async create_payment(req, res) {
    try {
      console.log(`FILE: easypaisa.controller.js | create_payment | Request received`);

      const { order_id } = req.body;

      if (!order_id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01509",
          ERROR_DESCRIPTION: "Order ID is required",
        });
      }

      const result = await easypaisa_service.create_payment_request({
        order_id: order_id,
      });

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: easypaisa.controller.js | create_payment | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01510",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async payment_callback(req, res) {
    try {
      console.log(`FILE: easypaisa.controller.js | payment_callback | Callback received`);

      // Easy Paisa sends data via POST
      const callback_data = req.body;

      const result = await easypaisa_service.verify_payment_callback(callback_data);

      // Redirect to frontend with status
      const frontend_url = process.env.FRONTEND_URL || "http://localhost:3000";
      
      if (result.STATUS === "SUCCESSFUL") {
        const redirect_url = `${frontend_url}/payment/easypaisa/success?order_id=${result.DB_DATA.order_id}&status=success&order_number=${result.DB_DATA.order_number}`;
        return res.redirect(redirect_url);
      } else {
        const redirect_url = `${frontend_url}/payment/easypaisa/failure?status=failed&message=${encodeURIComponent(result.ERROR_DESCRIPTION)}`;
        return res.redirect(redirect_url);
      }
    } catch (error) {
      console.error(`FILE: easypaisa.controller.js | payment_callback | Error:`, error);
      const frontend_url = process.env.FRONTEND_URL || "http://localhost:3000";
      const redirect_url = `${frontend_url}/payment/easypaisa/failure?status=error&message=${encodeURIComponent(error.message)}`;
      return res.redirect(redirect_url);
    }
  }

  async get_payment_status(req, res) {
    try {
      console.log(`FILE: easypaisa.controller.js | get_payment_status | Request received`);

      const { transaction_ref } = req.params;

      if (!transaction_ref) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01511",
          ERROR_DESCRIPTION: "Transaction reference is required",
        });
      }

      const result = await easypaisa_service.get_payment_status(transaction_ref);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: easypaisa.controller.js | get_payment_status | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01512",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new easypaisa_controller();

