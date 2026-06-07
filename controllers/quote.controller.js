const quote_service = require("../services/quote.service");

class quote_controller {
  async create_quote_request(req, res) {
    try {
      console.log(`FILE: quote.controller.js | create_quote_request | Request received`);

      const {
        customer_name,
        phone,
        email,
        material_required,
        estimated_quantity,
        delivery_location,
        project_type,
        message,
        user_id,
      } = req.body;

      const result = await quote_service.create_quote_request({
        customer_name,
        phone,
        email: email || null,
        material_required,
        estimated_quantity,
        delivery_location,
        project_type: project_type || null,
        message: message || null,
        user_id: user_id || (req.user ? req.user.user_id : null),
      });

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: quote.controller.js | create_quote_request | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01407",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_quotes(req, res) {
    try {
      const result = await quote_service.get_all_quotes(req.query);
      if (result.STATUS === "ERROR") {
        return res.status(500).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: quote.controller.js | get_all_quotes | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01408",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_quote(req, res) {
    try {
      const { quote_id } = req.params;
      const result = await quote_service.update_quote(quote_id, req.body);
      if (result.STATUS === "ERROR") {
        const status_code = result.ERROR_FILTER === "NOT_FOUND" ? 404 : 400;
        return res.status(status_code).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: quote.controller.js | update_quote | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01409",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new quote_controller();
