const notification_service = require("../services/notification.service");

class notification_controller {
  async get_settings(req, res) {
    try {
      console.log(`FILE: notification.controller.js | get_settings | Request received for user: ${req.user.user_id}`);

      const result = await notification_service.getSettings(req.user.user_id);

      if (result.STATUS === 'SUCCESSFUL') {
        return res.status(200).json({
          STATUS: 'SUCCESSFUL',
          ERROR_CODE: '',
          ERROR_FILTER: '',
          ERROR_DESCRIPTION: '',
          DB_DATA: result.DB_DATA,
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error(`FILE: notification.controller.js | get_settings | Error:`, error);
      return res.status(500).json({
        STATUS: 'ERROR',
        ERROR_FILTER: 'TECHNICAL_ISSUE',
        ERROR_CODE: 'VTAPP-00703',
        ERROR_DESCRIPTION: error.message || 'Internal server error',
      });
    }
  }

  async update_settings(req, res) {
    try {
      console.log(`FILE: notification.controller.js | update_settings | Request received for user: ${req.user.user_id}`);

      const {
        email_notifications,
        text_messages,
        website_notifications
      } = req.body;

      const settings_data = {};

      if (email_notifications) {
        settings_data.email_notifications = email_notifications;
      }
      if (text_messages) {
        settings_data.text_messages = text_messages;
      }
      if (website_notifications) {
        settings_data.website_notifications = website_notifications;
      }

      const result = await notification_service.updateSettings(req.user.user_id, settings_data);

      if (result.STATUS === 'SUCCESSFUL') {
        return res.status(200).json({
          STATUS: 'SUCCESSFUL',
          ERROR_CODE: '',
          ERROR_FILTER: '',
          ERROR_DESCRIPTION: '',
          DB_DATA: result.DB_DATA,
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error(`FILE: notification.controller.js | update_settings | Error:`, error);
      return res.status(500).json({
        STATUS: 'ERROR',
        ERROR_FILTER: 'TECHNICAL_ISSUE',
        ERROR_CODE: 'VTAPP-00704',
        ERROR_DESCRIPTION: error.message || 'Internal server error',
      });
    }
  }
}

module.exports = new notification_controller();

