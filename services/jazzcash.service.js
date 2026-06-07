const crypto = require("crypto");
const { 
  JAZZCASH_MERCHANT_ID, 
  JAZZCASH_PASSWORD,
  JAZZCASH_INTEGRITY_SALT,
  JAZZCASH_RETURN_URL,
  JAZZCASH_PAYMENT_URL 
} = require("../global_config/stripe_config");
// Import all models first to ensure they are registered before using populate
const user_model = require("../models/user.model"); // Import user model to register it
const order_model = require("../models/order.model"); // Import order model to register it
const product_model = require("../models/product.model"); // Import product model to register it
const payment_model = require("../models/payment.model"); // Import payment model to register it
const payment_data_repository = require("../data_repositories/payment.data_repository");
const order_data_repository = require("../data_repositories/order.data_repository");

class jazzcash_service {
  constructor() {
    console.log("FILE: jazzcash.service.js | constructor | Service initialized");
  }

  // Generate secure hash for JazzCash
  // JazzCash hash format: pp_SecureHash = SHA256(pp_Amount + pp_BillReference + pp_Description + pp_MerchantID + pp_Password + pp_ReturnURL + pp_TxnDateTime + pp_TxnExpiryDateTime + pp_TxnRefNo + IntegritySalt)
  generate_hash(amount, billReference, description, merchantId, password, returnUrl, txnDateTime, txnExpiryDateTime, txnRefNo, integritySalt) {
    try {
      const hash_string = `${amount}${billReference}${description}${merchantId}${password}${returnUrl}${txnDateTime}${txnExpiryDateTime}${txnRefNo}${integritySalt}`;
      const hash = crypto.createHash("sha256").update(hash_string).digest("hex");
      return hash;
    } catch (error) {
      console.error(`FILE: jazzcash.service.js | generate_hash | Error:`, error);
      throw error;
    }
  }

  // Verify hash from callback
  verify_hash(pp_Amount, pp_BillReference, pp_Description, pp_MerchantID, pp_Password, pp_ReturnURL, pp_TxnDateTime, pp_TxnExpiryDateTime, pp_TxnRefNo, pp_SecureHash) {
    try {
      const expected_hash = this.generate_hash(
        pp_Amount,
        pp_BillReference,
        pp_Description,
        pp_MerchantID,
        pp_Password,
        pp_ReturnURL,
        pp_TxnDateTime,
        pp_TxnExpiryDateTime,
        pp_TxnRefNo,
        JAZZCASH_INTEGRITY_SALT
      );
      return expected_hash.toLowerCase() === pp_SecureHash.toLowerCase();
    } catch (error) {
      console.error(`FILE: jazzcash.service.js | verify_hash | Error:`, error);
      return false;
    }
  }

  // Create payment request
  async create_payment_request(order_data) {
    try {
      console.log(`FILE: jazzcash.service.js | create_payment_request | Creating payment request for order: ${order_data.order_id}`);

      // Get order
      const order = await order_data_repository.get_order_by_id(order_data.order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01601",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      // Generate unique transaction reference number
      const txnRefNo = `JC${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Payment details
      const amount = Math.round(order.total * 100); // Amount in paisa (multiply by 100)
      const merchantId = JAZZCASH_MERCHANT_ID;
      const password = JAZZCASH_PASSWORD;
      const returnUrl = JAZZCASH_RETURN_URL;
      const billReference = order.order_number;
      const description = `Order Payment - ${order.order_number}`;
      
      // Date time in YYYYMMDDHHmmss format
      const txnDateTime = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
      // Expiry date time (24 hours from now)
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:]/g, "").split(".")[0];

      // Generate secure hash
      const secureHash = this.generate_hash(
        amount,
        billReference,
        description,
        merchantId,
        password,
        returnUrl,
        txnDateTime,
        txnExpiryDateTime,
        txnRefNo,
        JAZZCASH_INTEGRITY_SALT
      );

      // Create payment record
      const payment = await payment_data_repository.create_payment({
        order_id: order._id,
        user_id: order.user_id,
        payment_method: "jazzcash",
        amount: order.total,
        currency: "PKR",
        status: "pending",
        transaction_id: txnRefNo,
        metadata: {
          txnRefNo,
          txnDateTime,
          txnExpiryDateTime,
          billReference,
          description,
          amount,
          merchantId,
          account_number: order.payment_account_number || null,
        },
      });

      // Update order with payment reference
      await order_data_repository.update_order(order._id, {
        payment_id: payment._id.toString(),
      });

      // Prepare payment form data for JazzCash
      const payment_form_data = {
        pp_Amount: amount.toString(),
        pp_BillReference: billReference,
        pp_Description: description,
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_ReturnURL: returnUrl,
        pp_TxnDateTime: txnDateTime,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_TxnRefNo: txnRefNo,
        pp_SecureHash: secureHash,
        ppmpf_1: order.payment_account_number || "", // Customer mobile number
        ppmpf_2: "", // Additional field if needed
        ppmpf_3: "", // Additional field if needed
        ppmpf_4: "", // Additional field if needed
        ppmpf_5: "", // Additional field if needed
      };

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          payment_url: JAZZCASH_PAYMENT_URL,
          payment_form_data: payment_form_data,
          payment_id: payment._id,
          transaction_ref: txnRefNo,
        },
      };
    } catch (error) {
      console.error(`FILE: jazzcash.service.js | create_payment_request | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01602",
        ERROR_DESCRIPTION: error.message || "Failed to create payment request",
      };
    }
  }

  // Verify payment callback from JazzCash
  async verify_payment_callback(callback_data) {
    try {
      console.log(`FILE: jazzcash.service.js | verify_payment_callback | Verifying payment callback:`, callback_data);

      const {
        pp_Amount,
        pp_BillReference,
        pp_Description,
        pp_MerchantID,
        pp_Password,
        pp_ReturnURL,
        pp_TxnDateTime,
        pp_TxnExpiryDateTime,
        pp_TxnRefNo,
        pp_SecureHash,
        pp_ResponseCode,
        pp_ResponseMessage,
        pp_BankID,
        pp_RetreivalReferenceNo,
      } = callback_data;

      // Get payment record
      const payment = await payment_data_repository.get_payment_by_transaction_id(pp_TxnRefNo);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01604",
          ERROR_DESCRIPTION: "Payment record not found",
        };
      }

      // Get order
      const order = await order_data_repository.get_order_by_id(payment.order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01605",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      // Verify hash
      const is_hash_valid = this.verify_hash(
        pp_Amount,
        pp_BillReference,
        pp_Description,
        pp_MerchantID,
        pp_Password,
        pp_ReturnURL,
        pp_TxnDateTime,
        pp_TxnExpiryDateTime,
        pp_TxnRefNo,
        pp_SecureHash
      );
      
      if (!is_hash_valid) {
        console.error(`FILE: jazzcash.service.js | verify_payment_callback | Invalid hash`);
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-01603",
          ERROR_DESCRIPTION: "Invalid secure hash - payment verification failed",
        };
      }

      // Check payment status
      // JazzCash response codes: "000" = Success, others = Failed
      let payment_status = "failed";
      let order_payment_status = "failed";
      let order_status = "pending";

      if (pp_ResponseCode === "000" || pp_ResponseCode === "00") {
        payment_status = "completed";
        order_payment_status = "paid";
        order_status = "confirmed";
      } else if (pp_ResponseCode === "121" || pp_ResponseCode === "122") {
        payment_status = "processing";
      }

      // Update payment record
      await payment_data_repository.update_payment(payment._id, {
        status: payment_status,
        transaction_id: pp_RetreivalReferenceNo || pp_TxnRefNo,
        metadata: {
          ...payment.metadata,
          pp_ResponseCode,
          pp_ResponseMessage,
          pp_BankID,
          pp_RetreivalReferenceNo,
          pp_SecureHash,
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
          response_code: pp_ResponseCode,
          response_message: pp_ResponseMessage,
          order_id: order._id,
          order_number: order.order_number,
        },
      };
    } catch (error) {
      console.error(`FILE: jazzcash.service.js | verify_payment_callback | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01606",
        ERROR_DESCRIPTION: error.message || "Failed to verify payment callback",
      };
    }
  }

  // Get payment status
  async get_payment_status(transaction_ref) {
    try {
      console.log(`FILE: jazzcash.service.js | get_payment_status | Getting payment status: ${transaction_ref}`);

      const payment = await payment_data_repository.get_payment_by_transaction_id(transaction_ref);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01607",
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
      console.error(`FILE: jazzcash.service.js | get_payment_status | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01608",
        ERROR_DESCRIPTION: error.message || "Failed to get payment status",
      };
    }
  }
}

module.exports = new jazzcash_service();

