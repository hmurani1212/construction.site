const order_data_repository = require("../data_repositories/order.data_repository");
const payment_service = require("./payment.service");
const product_data_repository = require("../data_repositories/product.data_repository");

class order_service {
  constructor() {
    console.log("FILE: order.service.js | constructor | Service initialized");
  }

  async create_order(order_data) {
    try {
      console.log(`FILE: order.service.js | create_order | Creating order for user: ${order_data.user_id}`);

      for (const item of order_data.items || []) {
        if (!item.product_id || item.quantity < 1) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01320",
            ERROR_DESCRIPTION: "Each item must have a valid product and positive quantity",
          };
        }

        const product = await product_data_repository.get_product_by_id(item.product_id);
        if (!product || product.is_active !== 1) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01321",
            ERROR_DESCRIPTION: `Product not found or inactive: ${item.name || item.product_id}`,
          };
        }

        const min_qty = product.minimum_order_quantity || 1;
        if (item.quantity < min_qty) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01322",
            ERROR_DESCRIPTION: `Minimum order quantity for ${product.name} is ${min_qty} ${product.unit_type || "units"}`,
          };
        }

        if (product.stock_quantity > 0 && item.quantity > product.stock_quantity) {
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "INVALID_REQUEST",
            ERROR_CODE: "VTAPP-01323",
            ERROR_DESCRIPTION: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`,
          };
        }
      }

      // Generate order number
      const order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create order
      const order = await order_data_repository.create_order({
        ...order_data,
        order_number,
      });


      // console.log('what is order data', order_data);

      // If payment method is stripe, create payment intent
      let payment_intent_data = null;
      if (order_data.payment_method === "stripe") {
        const payment_result = await payment_service.create_payment_intent({
          order_id: order._id,
          user_id: order_data.user_id,
          items: order_data.items,
          total: order_data.total,
          shipping_address: order_data.shipping_address,
          payment_method: "stripe",
        });

        if (payment_result.STATUS === "SUCCESSFUL") {
          payment_intent_data = payment_result.DB_DATA;
          
          // Get updated order with payment intent ID
          const updated_order = await order_data_repository.get_order_by_id(order._id);
          return {
            STATUS: "SUCCESSFUL",
            ERROR_CODE: "",
            ERROR_FILTER: "",
            ERROR_DESCRIPTION: "",
            DB_DATA: {
              order: updated_order || order,
              payment_intent: payment_intent_data,
            },
          };
        } else {
          // If payment intent creation fails, still return order but with error
          return {
            STATUS: "ERROR",
            ERROR_FILTER: "PAYMENT_ERROR",
            ERROR_CODE: "VTAPP-01301",
            ERROR_DESCRIPTION: payment_result.ERROR_DESCRIPTION || "Failed to create payment intent",
            DB_DATA: {
              order: order,
            },
          };
        }
      }

      // For non-stripe payments, fetch the order again to ensure all fields are included
      const saved_order = await order_data_repository.get_order_by_id(order._id);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          order: saved_order || order,
          payment_intent: null,
        },
      };
    } catch (error) {
      console.error(`FILE: order.service.js | create_order | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01302",
        ERROR_DESCRIPTION: error.message || "Failed to create order",
      };
    }
  }

  async get_order_by_id(order_id) {
    try {
      console.log(`FILE: order.service.js | get_order_by_id | Fetching order: ${order_id}`);

      const order = await order_data_repository.get_order_by_id(order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01303",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: order,
      };
    } catch (error) {
      console.error(`FILE: order.service.js | get_order_by_id | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01304",
        ERROR_DESCRIPTION: error.message || "Failed to fetch order",
      };
    }
  }

  async get_user_orders(user_id) {
    try {
      console.log(`FILE: order.service.js | get_user_orders | Fetching orders for user: ${user_id}`);

      const orders = await order_data_repository.get_orders_by_user(user_id);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          orders: orders,
          total: orders.length,
        },
      };
    } catch (error) {
      console.error(`FILE: order.service.js | get_user_orders | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01305",
        ERROR_DESCRIPTION: error.message || "Failed to fetch orders",
      };
    }
  }

  async get_all_orders(filters = {}) {
    try {
      console.log(`FILE: order.service.js | get_all_orders | Fetching all orders`);

      const orders = await order_data_repository.get_all_orders(filters);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          orders: orders,
          total: orders.length,
        },
      };
    } catch (error) {
      console.error(`FILE: order.service.js | get_all_orders | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01312",
        ERROR_DESCRIPTION: error.message || "Failed to fetch orders",
      };
    }
  }

  async update_order_status(order_id, new_status) {
    try {
      console.log(`FILE: order.service.js | update_order_status | Updating order ${order_id} to status: ${new_status}`);

      // Validate status
      const valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"];
      if (!valid_statuses.includes(new_status)) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01314",
          ERROR_DESCRIPTION: `Invalid order status. Must be one of: ${valid_statuses.join(", ")}`,
        };
      }

      // Get the order first
      const order = await order_data_repository.get_order_by_id(order_id);
      if (!order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01315",
          ERROR_DESCRIPTION: "Order not found",
        };
      }

      // Prepare update data
      const update_data = {
        order_status: new_status,
      };

      // If status is being changed to "completed", deduct stock from products and update payment status
      if (new_status === "completed" && order.order_status !== "completed") {
        console.log(`FILE: order.service.js | update_order_status | Deducting stock for completed order`);
        
        // Update payment_status to "paid" when order is marked as completed
        update_data.payment_status = "paid";
        console.log(`FILE: order.service.js | update_order_status | Updating payment_status to "paid" for completed order`);
        
        // Deduct stock for each item in the order
        for (const item of order.items) {
          try {
            const product_id = item.product_id;
            const quantity_to_deduct = item.quantity || 0;

            if (product_id && quantity_to_deduct > 0) {
              // Get current product
              const product = await product_data_repository.get_product_by_id(product_id);
              
              if (product) {
                const current_stock = product.stock_quantity || 0;
                const new_stock = Math.max(0, current_stock - quantity_to_deduct);

                // Update product stock
                await product_data_repository.update_product(product_id, {
                  stock_quantity: new_stock,
                });

                console.log(`FILE: order.service.js | update_order_status | Product ${product_id}: Stock reduced from ${current_stock} to ${new_stock}`);
              } else {
                console.warn(`FILE: order.service.js | update_order_status | Product ${product_id} not found, skipping stock deduction`);
              }
            }
          } catch (item_error) {
            console.error(`FILE: order.service.js | update_order_status | Error deducting stock for item:`, item_error);
            // Continue with other items even if one fails
          }
        }
      }

      // Update order status (and payment_status if completed)
      const updated_order = await order_data_repository.update_order(order_id, update_data);

      if (!updated_order) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "TECHNICAL_ISSUE",
          ERROR_CODE: "VTAPP-01316",
          ERROR_DESCRIPTION: "Failed to update order status",
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: updated_order,
      };
    } catch (error) {
      console.error(`FILE: order.service.js | update_order_status | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-01317",
        ERROR_DESCRIPTION: error.message || "Failed to update order status",
      };
    }
  }
}

module.exports = new order_service();

