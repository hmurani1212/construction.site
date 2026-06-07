const user_model = require("../models/user.model");

class user_data_repository {
  constructor() {
    console.log("FILE: user.data_repository.js | constructor | Data Repository initialized");
  }

  async create_user(user_data) {
    try {
      console.log(`FILE: user.data_repository.js | create_user | Creating user: ${user_data.email}`);
      const new_user = new user_model(user_data);
      const saved_user = await new_user.save();
      return saved_user;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | create_user | Error:`, error);
      throw error;
    }
  }

  async get_user_by_email(email) {
    try {
      console.log(`FILE: user.data_repository.js | get_user_by_email | Fetching user: ${email}`);
      if (!email) {
        return null;
      }
      const user = await user_model.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | get_user_by_email | Error:`, error);
      throw error;
    }
  }

  async get_user_by_id(user_id) {
    try {
      console.log(`FILE: user.data_repository.js | get_user_by_id | Fetching user: ${user_id}`);
      const user = await user_model.findById(user_id);
      return user;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | get_user_by_id | Error:`, error);
      throw error;
    }
  }

  async update_user(user_id, update_data) {
    try {
      console.log(`FILE: user.data_repository.js | update_user | Updating user: ${user_id}`);
      update_data.updated_at = Math.floor(Date.now() / 1000);
      const updated_user = await user_model.findByIdAndUpdate(
        user_id,
        { $set: update_data },
        { new: true, runValidators: true }
      );
      return updated_user;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | update_user | Error:`, error);
      throw error;
    }
  }

  async get_user_by_phone(phone) {
    try {
      console.log(`FILE: user.data_repository.js | get_user_by_phone | Fetching user: ${phone}`);
      if (!phone) {
        return null;
      }
      // Normalize phone: remove any spaces, dashes, etc. and ensure it starts with 03
      const normalized_phone = phone.trim().replace(/[\s-]/g, '');
      // Get user - password field will be included by default (not set to select: false)
      const user = await user_model.findOne({ phone: normalized_phone });
      return user;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | get_user_by_phone | Error:`, error);
      throw error;
    }
  }

  async get_all_users_list() {
    try {
      console.log(`FILE: user.data_repository.js | get_all_users_list | Fetching all users (name and id only)`);
      const users = await user_model.find(
        { is_active: 1 },
        { _id: 1, name: 1 } // Only return _id and name
      ).sort({ name: 1 });
      return users;
    } catch (error) {
      console.error(`FILE: user.data_repository.js | get_all_users_list | Error:`, error);
      throw error;
    }
  }
}

module.exports = new user_data_repository();

