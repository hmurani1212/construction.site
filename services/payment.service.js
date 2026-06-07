const stripe = require("stripe");
const { STRIPE_SECRET_KEY, USD_TO_PKR_RATE } = require("../global_config/stripe_config");
// Import all models first to ensure they are registered before using populate
const user_model = require("../models/user.model"); // Import user model to register it
const order_model = require("../models/order.model"); // Import order model to register it
const product_model = require("../models/product.model"); // Import product model to register it
const payment_model = require("../models/payment.model"); // Import payment model to register it
const payment_data_repository = require("../data_repositories/payment.data_repository");
const order_data_repository = require("../data_repositories/order.data_repository");

// Initialize Stripe
const stripe_client = stripe(STRIPE_SECRET_KEY);

class payment_service {
  constructor() {
    console.log("FILE: payment.service.js | constructor | Service initialized");
  }

  async create_payment_intent(order_data) {
    try {
      console.log(`FILE: payment.service.js | create_payment_intent | Creating payment intent for order: ${order_data.order_id}`);

      // console.log('what is order data111', order_data);

      // Get order if order_id is provided, otherwise create new order
      let order;
      if (order_data.order_id) {
        order = await order_data_repository.get_order_by_id(order_data.order_id);
        // console.log('rrrrrrrrrrrrrrrrrrrrrrrr11111111')
        if (!order) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "NOT_FOUND",
            ERROR_CODE: "VTAPP-01213",
            ERROR_DESCRIPTION: "Order not found",
          };
        }
      } else {
        // console.log(`rrrrrrrrrrrrrrrrrrrrrrrr`)
        // Create order first (for backward compatibility)
        const order_number = await order_data_repository.generate_order_number();
        order = await order_data_repository.create_order({
          ...order_data,
          order_number,
        });
      };


      // console.log('order details222', order);

      // Convert PKR to USD for Stripe (Stripe test mode doesn't support PKR)
      // Using conversion rate from config
      const amount_in_usd = order_data.total / USD_TO_PKR_RATE;


      // console.log('11111111111111', amount_in_usd)
      
      // Convert to cents (Stripe uses smallest currency unit)
      // Stripe minimum is $0.50 (50 cents) for USD, but we'll use $1.00 (100 cents) to be safe
      const amount_in_cents = Math.round(amount_in_usd * 100);

      console.log('111111111111111', amount_in_cents)
      
      // Validate minimum amount - require at least Rs 280 (equivalent to $1 USD)
      const minimum_pkr = USD_TO_PKR_RATE; // Rs 280 = $1 USD
      if (order_data.total < minimum_pkr) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01212",
          ERROR_DESCRIPTION: `Minimum order amount is Rs ${minimum_pkr}. Your order total is Rs ${order_data.total}.`,
        };
      }

      // Ensure minimum of 100 cents ($1.00) for Stripe
      const final_amount_cents = Math.max(amount_in_cents, 100);

      console.log(`FILE: payment.service.js | create_payment_intent | Amount conversion - PKR: ${order_data.total}, USD: ${amount_in_usd.toFixed(2)}, Cents: ${final_amount_cents}`);

      // Create Stripe Payment Intent
      // Using USD for test mode - in production, you can enable PKR in Stripe dashboard
      // Note: Cannot use both automatic_payment_methods and confirmation_method together
      const payment_intent = await stripe_client.paymentIntents.create({
        amount: final_amount_cents,
        currency: "usd", // Explicitly use USD
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          order_id: order._id.toString(),
          order_number: order.order_number,
          user_id: order_data.user_id.toString(),
          original_amount_pkr: order_data.total.toString(),
          original_amount_paisa: Math.round(order_data.total * 100).toString(),
          converted_amount_usd: (final_amount_cents / 100).toFixed(2),
          conversion_rate: USD_TO_PKR_RATE.toString(),
        },
        description: `Order ${order.order_number} - Grocery Store (PKR ${order_data.total})`,
      });

      // Create payment record
      const payment = await payment_data_repository.create_payment({
        order_id: order._id,
        user_id: order_data.user_id,
        payment_method: "stripe",
        amount: order_data.total,
        currency: "PKR",
        status: "pending",
        stripe_payment_intent_id: payment_intent.id,
      });

      console.log(`FILE: payment.service.js | create_payment_intent | Payment intent created: ${payment_intent.id}, Payment record ID: ${payment._id}`);

      // Update order with payment intent ID
      await order_data_repository.update_order(order._id, {
        stripe_payment_intent_id: payment_intent.id,
        payment_id: payment._id.toString(),
      });

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          payment_intent: {
            id: payment_intent.id,
            client_secret: payment_intent.client_secret,
          },
          order: {
            id: order._id,
            ///order_number: order_number,
          },
          payment: {
            id: payment._id,
          },
        },
      };
    } catch (error) {
      console.error(`FILE: payment.service.js | create_payment_intent | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01201",
        ERROR_DESCRIPTION: error.message || "Failed to create payment intent",
      };
    }
  }

  async confirm_payment(payment_intent_id) {
    try {
      console.log(`FILE: payment.service.js | confirm_payment | Confirming payment: ${payment_intent_id}`);

      // Retrieve payment intent from Stripe
      const payment_intent = await stripe_client.paymentIntents.retrieve(payment_intent_id);

      // Get payment record
      const payment = await payment_data_repository.get_payment_by_stripe_intent(payment_intent_id);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01202",
          ERROR_DESCRIPTION: "Payment record not found",
        };
      }

      // Update payment status based on Stripe status
      let payment_status = "pending";
      let order_payment_status = "pending";
      let order_status = "pending";

      if (payment_intent.status === "succeeded") {
        payment_status = "completed";
        order_payment_status = "paid";
        order_status = "confirmed";
      } else if (payment_intent.status === "processing") {
        // Payment is processing - for test cards, this often succeeds shortly after
        // Check if there's a charge that succeeded
        if (payment_intent.latest_charge) {
          try {
            const charge = await stripe_client.charges.retrieve(payment_intent.latest_charge);
            if (charge.status === "succeeded" || charge.paid === true) {
              payment_status = "completed";
              order_payment_status = "paid";
              order_status = "confirmed";
            } else {
              payment_status = "processing";
            }
          } catch (chargeError) {
            // If charge retrieval fails, keep as processing
            payment_status = "processing";
          }
        } else {
          payment_status = "processing";
        }
      } else if (payment_intent.status === "requires_payment_method" || 
                 payment_intent.status === "requires_confirmation" ||
                 payment_intent.status === "requires_action") {
        // Payment needs user action or payment method
        payment_status = "pending";
        order_payment_status = "pending";
      } else if (payment_intent.status === "canceled" || 
                 payment_intent.status === "payment_failed") {
        payment_status = "failed";
        order_payment_status = "failed";
      }

      // Update payment record
      await payment_data_repository.update_payment(payment._id, {
        status: payment_status,
        stripe_charge_id: payment_intent.latest_charge || null,
        transaction_id: payment_intent.id,
        metadata: {
          stripe_status: payment_intent.status,
          ...payment_intent.metadata,
        },
      });
      // Update order
      await order_data_repository.update_order(payment.order_id, {
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
          payment_intent_status: payment_intent.status,
        },
      };
    } catch (error) {
      console.error(`FILE: payment.service.js | confirm_payment | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01203",
        ERROR_DESCRIPTION: error.message || "Failed to confirm payment",
      };
    }
  }

  async get_payment_status(payment_intent_id) {
    try {
      console.log(`FILE: payment.service.js | get_payment_status | Getting payment status: ${payment_intent_id}`);

      const payment = await payment_data_repository.get_payment_by_stripe_intent(payment_intent_id);
      if (!payment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01204",
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
      console.error(`FILE: payment.service.js | get_payment_status | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01205",
        ERROR_DESCRIPTION: error.message || "Failed to get payment status",
      };
    }
  }
}

module.exports = new payment_service();

