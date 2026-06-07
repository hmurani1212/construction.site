const quote_model = require("../models/quote.model");
const moment = require("moment");

class quote_data_repository {
  constructor() {
    console.log("FILE: quote.data_repository.js | Quote Data Repository initialized");
  }

  async create_quote(quote_data) {
    try {
      const new_quote = new quote_model(quote_data);
      return await new_quote.save();
    } catch (error) {
      console.error(`FILE: quote.data_repository.js | create_quote | Error:`, error);
      throw error;
    }
  }

  async get_quote_by_id(quote_id) {
    try {
      return await quote_model.findById(quote_id);
    } catch (error) {
      console.error(`FILE: quote.data_repository.js | get_quote_by_id | Error:`, error);
      throw error;
    }
  }

  async get_all_quotes(filters = {}, skip = 0, limit = 50) {
    try {
      const query = { is_active: 1, ...filters };
      return await quote_model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit);
    } catch (error) {
      console.error(`FILE: quote.data_repository.js | get_all_quotes | Error:`, error);
      throw error;
    }
  }

  async count_quotes(filters = {}) {
    try {
      const query = { is_active: 1, ...filters };
      return await quote_model.countDocuments(query);
    } catch (error) {
      console.error(`FILE: quote.data_repository.js | count_quotes | Error:`, error);
      throw error;
    }
  }

  async update_quote(quote_id, update_data) {
    try {
      update_data.updated_at = moment().unix();
      return await quote_model.findByIdAndUpdate(quote_id, update_data, { new: true });
    } catch (error) {
      console.error(`FILE: quote.data_repository.js | update_quote | Error:`, error);
      throw error;
    }
  }
}

module.exports = new quote_data_repository();
