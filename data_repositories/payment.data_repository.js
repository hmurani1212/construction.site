// Import all models first to ensure they are registered before using populate
const user_model = require("../models/user.model"); // Import user model to register it
const order_model = require("../models/order.model"); // Import order model to register it
const product_model = require("../models/product.model"); // Import product model to register it
const payment_model = require("../models/payment.model");
const moment = require("moment");

class payment_data_repository {
  constructor() {
    console.log("FILE: payment.data_repository.js | Payment Data Repository initialized");
  }

  async create_payment(payment_data) {
    try {
      console.log(`FILE: payment.data_repository.js | create_payment | Creating payment for order: ${payment_data.order_id}`);
      const new_payment = new payment_model(payment_data);
      const saved_payment = await new_payment.save();
      return saved_payment;
    } catch (error) {
      console.error(`FILE: payment.data_repository.js | create_payment | Error:`, error);
      throw error;
    }
  }

  async get_payment_by_id(payment_id) {
    try {
      console.log(`FILE: payment.data_repository.js | get_payment_by_id | Fetching payment: ${payment_id}`);
      const payment = await payment_model.findById(payment_id)
        .populate("order_id")
        .populate("user_id", "name email");
      return payment;
    } catch (error) {
      console.error(`FILE: payment.data_repository.js | get_payment_by_id | Error:`, error);
      throw error;
    }
  }

  async get_payment_by_stripe_intent(stripe_payment_intent_id) {
    try {
      console.log(`FILE: payment.data_repository.js | get_payment_by_stripe_intent | Fetching payment: ${stripe_payment_intent_id}`);
      const payment = await payment_model.findOne({ stripe_payment_intent_id })
        // .populate("order_id")
        // .populate("user_id", "name email");
      return payment;
    } catch (error) {
      console.error(`FILE: payment.data_repository.js | get_payment_by_stripe_intent | Error:`, error);
      throw error;
    }
  }

  async update_payment(payment_id, update_data) {
    try {
      console.log(`FILE: payment.data_repository.js | update_payment | Updating payment: ${payment_id}`);
      update_data.updated_at = moment().unix();
      const updated_payment = await payment_model.findByIdAndUpdate(
        payment_id,
        { $set: update_data },
        { new: true, runValidators: true }
      );
      return updated_payment;
    } catch (error) {
      console.error(`FILE: payment.data_repository.js | update_payment | Error:`, error);
      throw error;
    }
  }

  async get_payment_by_transaction_id(transaction_id) {
    try {
      console.log(`FILE: payment.data_repository.js | get_payment_by_transaction_id | Fetching payment: ${transaction_id}`);
      const payment = await payment_model.findOne({ 
        $or: [
          { transaction_id: transaction_id },
          { "metadata.pp_TxnRefNo": transaction_id },
          { "metadata.txnRefNo": transaction_id }
        ]
      })
        .populate("order_id")
        .populate("user_id", "name email");
      return payment;
    } catch (error) {
      console.error(`FILE: payment.data_repository.js | get_payment_by_transaction_id | Error:`, error);
      throw error;
    }
  }
}

module.exports = new payment_data_repository();

