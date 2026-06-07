const crypto = require("crypto");
const { 
  EASYPAISA_STORE_ID, 
  EASYPAISA_HASH_KEY,
  EASYPAISA_RETURN_URL,
  EASYPAISA_PAYMENT_URL 
} = require("../global_config/stripe_config");
// Import all models first to ensure they are registered before using populate
const user_model = require("../models/user.model"); // Import user model to register it
const order_model = require("../models/order.model"); // Import order model to register it
const product_model = require("../models/product.model"); // Import product model to register it
const payment_model = require("../models/payment.model"); // Import payment model to register it
const payment_data_repository = require("../data_repositories/payment.data_repository");
const order_data_repository = require("../data_repositories/order.data_repository");

class easypaisa_service {
  constructor() {
    console.log("FILE: easypaisa.service.js | constructor | Service initialized");
  }

  // Generate secure hash for Easy Paisa
  generate_hash(amount, orderRefNum, storeId, postBackURL) {
    try {
      // Easy Paisa hash format: hashKey + amount + orderRefNum + storeId + postBackURL
      const hash_string = `${EASYPAISA_HASH_KEY}${amount}${orderRefNum}${storeId}${postBackURL}`;
      const hash = crypto.createHash("sha256").update(hash_string).digest("hex");
      return hash.toUpperCase();
    } catch (error) {
      console.error(`FILE: easypaisa.service.js | generate_hash | Error:`, error);
      throw error;
    }
  }

  // Verify hash from callback
  verify_hash(amount, orderRefNum, storeId, postBackURL, receivedHash) {
    try {
      const expected_hash = this.generate_hash(amount, orderRefNum, storeId, postBackURL);
      return expected_hash === receivedHash.toUpperCase();
    } catch (error) {
      console.error(`FILE: easypaisa.service.js | verify_hash | Error:`, error);
      return false;
    }
  }

  // Create payment request
  async create_payment_request(order_data) {
    try {
      console.log(`FILE: easypaisa.service.js | create_payment_request | Creating payment request for order: ${order_data.order_id}`);

      // Get order
      const order = await order_data_repository.get_order_by_id(order_data.order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01501",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      // Generate unique order reference number
      const orderRefNum = `EP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Payment details
      const amount = Math.round(order.total * 100); // Amount in paisa (multiply by 100)
      const storeId = EASYPAISA_STORE_ID;
      const postBackURL = EASYPAISA_RETURN_URL;
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 24 hours expiry in YYYY-MM-DD format
      const orderDateTime = new Date().toISOString().replace(/[-:]/g, "").split(".")[0]; // YYYYMMDDHHmmss format

      // Generate secure hash
      const hashRequest = this.generate_hash(amount, orderRefNum, storeId, postBackURL);

      // Create payment record
      const payment = await payment_data_repository.create_payment({
        order_id: order._id,
        user_id: order.user_id,
        payment_method: "easypaisa",
        amount: order.total,
        currency: "PKR",
        status: "pending",
        transaction_id: orderRefNum,
        metadata: {
          orderRefNum,
          orderDateTime,
          expiryDate,
          amount,
          storeId,
        },
      });

      // Update order with payment reference
      await order_data_repository.update_order(order._id, {
        payment_id: payment._id.toString(),
      });

      // Prepare payment form data
      const payment_form_data = {
        storeId: storeId,
        amount: amount.toString(),
        postBackURL: postBackURL,
        orderRefNum: orderRefNum,
        expiryDate: expiryDate,
        orderDateTime: orderDateTime,
        hashRequest: hashRequest,
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          payment_url: EASYPAISA_PAYMENT_URL,
          payment_form_data: payment_form_data,
          payment_id: payment._id,
          transaction_ref: orderRefNum,
        },
      };
    } catch (error) {
      console.error(`FILE: easypaisa.service.js | create_payment_request | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01502",
        ERROR_DESCRIPTION: error.message || "Failed to create payment request",
      };
    }
  }

  // Verify payment callback from Easy Paisa
  async verify_payment_callback(callback_data) {
    try {
      console.log(`FILE: easypaisa.service.js | verify_payment_callback | Verifying payment callback:`, callback_data);

      const {
        orderRefNum,
        amount,
        storeId,
        postBackURL,
        hashResponse,
        paymentToken,
        paymentStatus,
        transactionId,
      } = callback_data;

      // Get payment record
      const payment = await payment_data_repository.get_payment_by_transaction_id(orderRefNum);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01504",
          ERROR_DESCRIPTION: "Payment record not found",
        };
      }

      // Get order
      const order = await order_data_repository.get_order_by_id(payment.order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01505",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      // Verify hash
      const is_hash_valid = this.verify_hash(amount, orderRefNum, storeId, postBackURL, hashResponse);
      if (!is_hash_valid) {
        console.error(`FILE: easypaisa.service.js | verify_payment_callback | Invalid hash`);
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-01503",
          ERROR_DESCRIPTION: "Invalid secure hash - payment verification failed",
        };
      }

      // Check payment status
      // Easy Paisa status codes: "Success", "Failed", "Pending", etc.
      let payment_status = "failed";
      let order_payment_status = "failed";
      let order_status = "pending";

      if (paymentStatus === "Success" || paymentStatus === "success") {
        payment_status = "completed";
        order_payment_status = "paid";
        order_status = "confirmed";
      } else if (paymentStatus === "Pending" || paymentStatus === "pending") {
        payment_status = "processing";
      }

      // Update payment record
      await payment_data_repository.update_payment(payment._id, {
        status: payment_status,
        transaction_id: transactionId || orderRefNum,
        metadata: {
          ...payment.metadata,
          paymentStatus,
          paymentToken,
          transactionId,
          hashResponse,
          callback_received: true,
          callback_data: callback_data,
        },
      });

      // Update order
      await order_data_repository.update_order(order._id, {
        payment_status: order_payment_status,
        order_status: order_status,
      });

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          payment_status: payment_status,
          order_status: order_status,
          payment_status_response: paymentStatus,
          order_id: order._id,
          order_number: order.order_number,
        },
      };
    } catch (error) {
      console.error(`FILE: easypaisa.service.js | verify_payment_callback | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01506",
        ERROR_DESCRIPTION: error.message || "Failed to verify payment callback",
      };
    }
  }

  // Get payment status
  async get_payment_status(transaction_ref) {
    try {
      console.log(`FILE: easypaisa.service.js | get_payment_status | Getting payment status: ${transaction_ref}`);

      const payment = await payment_data_repository.get_payment_by_transaction_id(transaction_ref);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01507",
          ERROR_DESCRIPTION: "Payment not found",
        };
      }

      const order = await order_data_repository.get_order_by_id(payment.order_id);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          payment: payment,
          order: order,
        },
      };
    } catch (error) {
      console.error(`FILE: easypaisa.service.js | get_payment_status | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01508",
        ERROR_DESCRIPTION: error.message || "Failed to get payment status",
      };
    }
  }
}

module.exports = new easypaisa_service();

