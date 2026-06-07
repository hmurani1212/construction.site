const notification_settings_model = require("../models/notification_settings.model");
const moment = require("moment");

class notification_settings_data_repository {
  constructor() {
    console.log("FILE: notification_settings.data_repository.js | Notification Settings Data Repository initialized");
  }

  async create_or_update_settings(user_id, settings_data) {
    try {
      console.log(`FILE: notification_settings.data_repository.js | create_or_update_settings | Updating settings for user: ${user_id}`);
      
      settings_data.updated_at = moment().unix();
      
      const settings = await notification_settings_model.findOneAndUpdate(
        { user_id: user_id, is_active: 1 },
        { $set: settings_data },
        { 
          new: true, 
          runValidators: true,
          upsert: true // Create if doesn't exist
        }
      );
      
      return settings;
    } catch (error) {
      console.error(`FILE: notification_settings.data_repository.js | create_or_update_settings | Error:`, error);
      throw error;
    }
  }

  async get_settings_by_user(user_id) {
    try {
      console.log(`FILE: notification_settings.data_repository.js | get_settings_by_user | Fetching settings for user: ${user_id}`);
      
      const settings = await notification_settings_model.findOne({
        user_id: user_id,
        is_active: 1
      });
      
      return settings;
    } catch (error) {
      console.error(`FILE: notification_settings.data_repository.js | get_settings_by_user | Error:`, error);
      throw error;
    }
  }

  async get_users_with_notification_enabled(notification_type, sub_type) {
    try {
      console.log(`FILE: notification_settings.data_repository.js | get_users_with_notification_enabled | Fetching users with ${notification_type}.${sub_type} enabled`);
      
      const query = {
        is_active: 1,
        [`${notification_type}.${sub_type}`]: true
      };
      
      const settings = await notification_settings_model.find(query).populate('user_id', 'name email phone');
      
      return settings;
    } catch (error) {
      console.error(`FILE: notification_settings.data_repository.js | get_users_with_notification_enabled | Error:`, error);
      throw error;
    }
  }
}

module.exports = new notification_settings_data_repository();

