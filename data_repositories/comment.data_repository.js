// CRITICAL: Import models in dependency order to ensure they are registered before populate operations
// Import base models first
const mongoose = require("mongoose");
const user_model = require("../models/user.model");
// Import dependent models
const comment_model = require("../models/comment.model");
const moment = require("moment");

class comment_data_repository {
  constructor() {
    console.log("FILE: comment.data_repository.js | Comment Data Repository initialized");
  }

  async create_comment(comment_data) {
    try {
      const user_info = comment_data.user_id ? `user: ${comment_data.user_id}` : 'guest comment';
      console.log(`FILE: comment.data_repository.js | create_comment | Creating comment for ${user_info}`);
      const new_comment = new comment_model(comment_data);
      const saved_comment = await new_comment.save();
      return saved_comment;
    } catch (error) {
      console.error(`FILE: comment.data_repository.js | create_comment | Error:`, error);
      throw error;
    }
  }

  async get_comment_by_id(comment_id) {
    try {
      console.log(`FILE: comment.data_repository.js | get_comment_by_id | Fetching comment: ${comment_id}`);
      const comment = await comment_model.findById(comment_id)
        .populate("user_id", "name email phone");
      return comment;
    } catch (error) {
      console.error(`FILE: comment.data_repository.js | get_comment_by_id | Error:`, error);
      throw error;
    }
  }

  async get_all_comments(filters = {}) {
    try {
      console.log(`FILE: comment.data_repository.js | get_all_comments | Fetching all comments`);
      const query = { is_active: 1, ...filters };
      const comments = await comment_model.find(query)
        .populate("user_id", "name email phone")
        .sort({ created_at: -1 });
      return comments;
    } catch (error) {
      console.error(`FILE: comment.data_repository.js | get_all_comments | Error:`, error);
      throw error;
    }
  }

  async update_comment(comment_id, update_data) {
    try {
      console.log(`FILE: comment.data_repository.js | update_comment | Updating comment: ${comment_id}`);
      update_data.updated_at = moment().unix();
      const updated_comment = await comment_model.findByIdAndUpdate(
        comment_id,
        update_data,
        { new: true }
      ).populate("user_id", "name email phone");
      return updated_comment;
    } catch (error) {
      console.error(`FILE: comment.data_repository.js | update_comment | Error:`, error);
      throw error;
    }
  }

  async delete_comment(comment_id) {
    try {
      console.log(`FILE: comment.data_repository.js | delete_comment | Soft deleting comment: ${comment_id}`);
      const deleted_comment = await comment_model.findByIdAndUpdate(
        comment_id,
        { is_active: 0, updated_at: moment().unix() },
        { new: true }
      );
      return deleted_comment;
    } catch (error) {
      console.error(`FILE: comment.data_repository.js | delete_comment | Error:`, error);
      throw error;
    }
  }
}

module.exports = new comment_data_repository();
