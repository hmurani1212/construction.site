const notification_settings_data_repository = require("../data_repositories/notification_settings.data_repository");
const user_model = require("../models/user.model");
const order_model = require("../models/order.model");
const product_model = require("../models/product.model");
const email_service = require("./email.service");
const bullmq_manager = require("../_core_app_connectivities/bullmq");
const moment = require("moment");

const QUEUE_NAMES = {
  WEEKLY_NOTIFICATION: 'weekly-notifications',
  ACCOUNT_SUMMARY: 'account-summary',
  ORDER_UPDATES: 'order-updates',
};

class notification_service {
  constructor() {
    console.log('FILE: notification.service.js | Notification Service initialized');
    this.is_initialized = false;
  }

  /**
   * Initialize BullMQ workers for all notification types
   */
  async initialize() {
    if (this.is_initialized) {
      console.log('FILE: notification.service.js | initialize | Service already initialized');
      return;
    }

    console.log('FILE: notification.service.js | initialize | Initializing notification service with BullMQ');

    // Create worker for weekly notifications
    bullmq_manager.createWorker(
      QUEUE_NAMES.WEEKLY_NOTIFICATION,
      async (job) => {
        if (job.name === 'send-weekly-notifications') {
          // Recurring job - send to all users
          await this.sendWeeklyNotificationsToAll();
        } else {
          // Individual user notification
          await this.processWeeklyNotification(job.data.user_id);
        }
      },
      { concurrency: 5 }
    );

    // Create worker for account summary
    bullmq_manager.createWorker(
      QUEUE_NAMES.ACCOUNT_SUMMARY,
      async (job) => {
        if (job.name === 'send-account-summaries') {
          // Recurring job - send to all users
          await this.sendAccountSummariesToAll();
        } else {
          // Individual user summary
          await this.processAccountSummary(job.data.user_id);
        }
      },
      { concurrency: 5 }
    );

    // Create worker for order updates
    bullmq_manager.createWorker(
      QUEUE_NAMES.ORDER_UPDATES,
      async (job) => {
        await this.processOrderUpdate(job.data.user_id, job.data.product_id);
      },
      { concurrency: 10 }
    );

    // Schedule recurring weekly jobs (every Monday at 9 AM)
    await bullmq_manager.enqueueJob(
      QUEUE_NAMES.WEEKLY_NOTIFICATION,
      'send-weekly-notifications',
      {},
      {
        repeat: {
          pattern: '0 9 * * 1', // Every Monday at 9 AM
        },
        jobId: 'weekly-notifications-recurring',
      }
    );

    // Schedule recurring account summary jobs (every Monday at 10 AM)
    await bullmq_manager.enqueueJob(
      QUEUE_NAMES.ACCOUNT_SUMMARY,
      'send-account-summaries',
      {},
      {
        repeat: {
          pattern: '0 10 * * 1', // Every Monday at 10 AM
        },
        jobId: 'account-summary-recurring',
      }
    );

    this.is_initialized = true;
    console.log('FILE: notification.service.js | initialize | Notification service initialized with BullMQ');
  }

  /**
   * Process weekly notification for a user
   */
  async processWeeklyNotification(user_id) {
    try {
      console.log(`FILE: notification.service.js | processWeeklyNotification | Processing for user: ${user_id}`);

      const user = await user_model.findById(user_id);
      if (!user || !user.email) {
        console.log(`FILE: notification.service.js | processWeeklyNotification | User not found or no email: ${user_id}`);
        return;
      }

      // Get products added in the last week
      const oneWeekAgo = moment().subtract(7, 'days').unix();
      const newProducts = await product_model.find({
        created_at: { $gte: oneWeekAgo },
        is_active: 1
      }).limit(10).sort({ created_at: -1 });

      if (newProducts.length === 0) {
        console.log(`FILE: notification.service.js | processWeeklyNotification | No new products for user: ${user_id}`);
        return;
      }

      await email_service.sendWeeklyNotification(
        user.email,
        user.name,
        newProducts
      );

      console.log(`FILE: notification.service.js | processWeeklyNotification | Weekly notification sent to user: ${user_id}`);
    } catch (error) {
      console.error(`FILE: notification.service.js | processWeeklyNotification | Error:`, error);
      throw error;
    }
  }

  /**
   * Process account summary for a user
   */
  async processAccountSummary(user_id) {
    try {
      console.log(`FILE: notification.service.js | processAccountSummary | Processing for user: ${user_id}`);

      const user = await user_model.findById(user_id);
      if (!user || !user.email) {
        console.log(`FILE: notification.service.js | processAccountSummary | User not found or no email: ${user_id}`);
        return;
      }

      // Get orders from the last week
      const oneWeekAgo = moment().subtract(7, 'days').unix();
      const orders = await order_model.find({
        user_id: user_id,
        created_at: { $gte: oneWeekAgo },
        is_active: 1,
        payment_status: 'paid'
      });

      const totalOrders = orders.length;
      let totalProducts = 0;
      let totalAmount = 0;

      orders.forEach(order => {
        totalAmount += order.total || 0;
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            totalProducts += item.quantity || 0;
          });
        }
      });

      await email_service.sendAccountSummary(
        user.email,
        user.name,
        {
          totalOrders,
          totalProducts,
          totalAmount
        }
      );

      console.log(`FILE: notification.service.js | processAccountSummary | Account summary sent to user: ${user_id}`);
    } catch (error) {
      console.error(`FILE: notification.service.js | processAccountSummary | Error:`, error);
      throw error;
    }
  }

  /**
   * Process order update (new product added)
   */
  async processOrderUpdate(user_id, product_id) {
    try {
      console.log(`FILE: notification.service.js | processOrderUpdate | Processing for user: ${user_id}, product: ${product_id}`);

      const user = await user_model.findById(user_id);
      if (!user || !user.email) {
        console.log(`FILE: notification.service.js | processOrderUpdate | User not found or no email: ${user_id}`);
        return;
      }

      const product = await product_model.findById(product_id);
      if (!product) {
        console.log(`FILE: notification.service.js | processOrderUpdate | Product not found: ${product_id}`);
        return;
      }

      await email_service.sendOrderUpdate(
        user.email,
        user.name,
        product
      );

      console.log(`FILE: notification.service.js | processOrderUpdate | Order update sent to user: ${user_id}`);
    } catch (error) {
      console.error(`FILE: notification.service.js | processOrderUpdate | Error:`, error);
      throw error;
    }
  }

  /**
   * Send weekly notifications to all users who have it enabled
   */
  async sendWeeklyNotificationsToAll() {
    try {
      console.log('FILE: notification.service.js | sendWeeklyNotificationsToAll | Sending weekly notifications to all enabled users');

      const settings = await notification_settings_data_repository.get_users_with_notification_enabled(
        'email_notifications',
        'weekly_notification'
      );

      for (const setting of settings) {
        if (setting.user_id && setting.user_id.email) {
          await bullmq_manager.enqueueJob(
            QUEUE_NAMES.WEEKLY_NOTIFICATION,
            'send-weekly-notification',
            { user_id: setting.user_id._id.toString() }
          );
        }
      }

      console.log(`FILE: notification.service.js | sendWeeklyNotificationsToAll | Queued ${settings.length} weekly notifications`);
    } catch (error) {
      console.error('FILE: notification.service.js | sendWeeklyNotificationsToAll | Error:', error);
      throw error;
    }
  }

  /**
   * Send account summaries to all users who have it enabled
   */
  async sendAccountSummariesToAll() {
    try {
      console.log('FILE: notification.service.js | sendAccountSummariesToAll | Sending account summaries to all enabled users');

      const settings = await notification_settings_data_repository.get_users_with_notification_enabled(
        'email_notifications',
        'account_summary'
      );

      for (const setting of settings) {
        if (setting.user_id && setting.user_id.email) {
          await bullmq_manager.enqueueJob(
            QUEUE_NAMES.ACCOUNT_SUMMARY,
            'send-account-summary',
            { user_id: setting.user_id._id.toString() }
          );
        }
      }

      console.log(`FILE: notification.service.js | sendAccountSummariesToAll | Queued ${settings.length} account summaries`);
    } catch (error) {
      console.error('FILE: notification.service.js | sendAccountSummariesToAll | Error:', error);
      throw error;
    }
  }

  /**
   * Notify users about new product (when product is created)
   */
  async notifyNewProduct(product_id) {
    try {
      console.log(`FILE: notification.service.js | notifyNewProduct | Notifying users about new product: ${product_id}`);

      const settings = await notification_settings_data_repository.get_users_with_notification_enabled(
        'email_notifications',
        'order_updates'
      );

      for (const setting of settings) {
        if (setting.user_id && setting.user_id.email) {
          await bullmq_manager.enqueueJob(
            QUEUE_NAMES.ORDER_UPDATES,
            'send-order-update',
            { 
              user_id: setting.user_id._id.toString(),
              product_id: product_id
            }
          );
        }
      }

      console.log(`FILE: notification.service.js | notifyNewProduct | Queued ${settings.length} order update notifications`);
    } catch (error) {
      console.error('FILE: notification.service.js | notifyNewProduct | Error:', error);
      throw error;
    }
  }

  /**
   * Update notification settings for a user
   */
  async updateSettings(user_id, settings_data) {
    try {
      console.log(`FILE: notification.service.js | updateSettings | Updating settings for user: ${user_id}`);

      const settings = await notification_settings_data_repository.create_or_update_settings(
        user_id,
        settings_data
      );

      return {
        STATUS: 'SUCCESSFUL',
        DB_DATA: { settings }
      };
    } catch (error) {
      console.error(`FILE: notification.service.js | updateSettings | Error:`, error);
      return {
        STATUS: 'ERROR',
        ERROR_CODE: 'VTAPP-00701',
        ERROR_DESCRIPTION: error.message || 'Failed to update notification settings'
      };
    }
  }

  /**
   * Get notification settings for a user
   */
  async getSettings(user_id) {
    try {
      console.log(`FILE: notification.service.js | getSettings | Fetching settings for user: ${user_id}`);

      let settings = await notification_settings_data_repository.get_settings_by_user(user_id);

      // If no settings exist, create default settings
      if (!settings) {
        settings = await notification_settings_data_repository.create_or_update_settings(user_id, {});
      }

      return {
        STATUS: 'SUCCESSFUL',
        DB_DATA: { settings }
      };
    } catch (error) {
      console.error(`FILE: notification.service.js | getSettings | Error:`, error);
      return {
        STATUS: 'ERROR',
        ERROR_CODE: 'VTAPP-00702',
        ERROR_DESCRIPTION: error.message || 'Failed to get notification settings'
      };
    }
  }
}

module.exports = new notification_service();

