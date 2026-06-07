const quote_data_repository = require("../data_repositories/quote.data_repository");
const { QUOTE_STATUSES } = require("../global_config/construction_materials.config");

class quote_service {
  constructor() {
    console.log("FILE: quote.service.js | constructor | Service initialized");
  }

  async create_quote_request(quote_data) {
    try {
      console.log(`FILE: quote.service.js | create_quote_request | Creating quote for: ${quote_data.customer_name}`);

      if (!quote_data.customer_name || !quote_data.phone || !quote_data.material_required ||
          !quote_data.estimated_quantity || !quote_data.delivery_location) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01401",
          ERROR_DESCRIPTION: "Customer name, phone, material required, estimated quantity, and delivery location are required",
        };
      }

      const saved_quote = await quote_data_repository.create_quote({
        ...quote_data,
        quote_status: "pending",
      });

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: saved_quote,
      };
    } catch (error) {
      console.error(`FILE: quote.service.js | create_quote_request | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01402",
        ERROR_DESCRIPTION: error.message || "Failed to create quote request",
      };
    }
  }

  async get_all_quotes(query_params = {}) {
    try {
      const page = parseInt(query_params.page, 10) || 1;
      const limit = parseInt(query_params.limit, 10) || 50;
      const skip = (page - 1) * limit;
      const filters = {};

      if (query_params.quote_status && QUOTE_STATUSES.includes(query_params.quote_status)) {
        filters.quote_status = query_params.quote_status;
      }

      const quotes = await quote_data_repository.get_all_quotes(filters, skip, limit);
      const total = await quote_data_repository.count_quotes(filters);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          quotes,
          pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error(`FILE: quote.service.js | get_all_quotes | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01403",
        ERROR_DESCRIPTION: error.message || "Failed to fetch quotes",
      };
    }
  }

  async update_quote(quote_id, update_data) {
    try {
      if (update_data.quote_status && !QUOTE_STATUSES.includes(update_data.quote_status)) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01404",
          ERROR_DESCRIPTION: "Invalid quote status",
        };
      }

      const updated = await quote_data_repository.update_quote(quote_id, update_data);
      if (!updated) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01405",
          ERROR_DESCRIPTION: "Quote not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated,
      };
    } catch (error) {
      console.error(`FILE: quote.service.js | update_quote | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01406",
        ERROR_DESCRIPTION: error.message || "Failed to update quote",
      };
    }
  }
}

module.exports = new quote_service();
