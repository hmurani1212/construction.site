const comment_service = require("../services/comment.service");
const auth_middleware = require("../middlewares/auth.middleware");

class comment_controller {
  async create_comment(req, res) {
    try {
      console.log(`FILE: comment.controller.js | create_comment | Request received`);

      // Try to get user from token if provided (optional auth)
      let user = null;
      const auth_header = req.headers.authorization;
      if (auth_header && auth_header.startsWith("Bearer ")) {
        const token = auth_header.substring(7);
        const user_service = require("../services/user.service");
        const verification_result = user_service.verify_token(token);
        if (verification_result.STATUS === "SUCCESSFUL") {
          user = verification_result.DB_DATA;
        }
      }

      const { comment } = req.body;

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01409",
          ERROR_DESCRIPTION: "Comment is required",
        });
      }

      // Determine user_id: use authenticated user's ID if available, otherwise null (guest comment)
      const comment_user_id = user && user.user_id ? user.user_id : null;

      const comment_data = {
        user_id: comment_user_id,
        comment: comment.trim(),
      };

      const result = await comment_service.create_comment(comment_data);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error(`FILE: comment.controller.js | create_comment | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INTERNAL_ERROR",
        ERROR_CODE: "VTAPP-01410",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_all_comments(req, res) {
    try {
      console.log(`FILE: comment.controller.js | get_all_comments | Request received`);

      const filters = {};
      const result = await comment_service.get_all_comments(filters);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: comment.controller.js | get_all_comments | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INTERNAL_ERROR",
        ERROR_CODE: "VTAPP-01411",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async get_comment_by_id(req, res) {
    try {
      console.log(`FILE: comment.controller.js | get_comment_by_id | Request received`);

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01412",
          ERROR_DESCRIPTION: "Comment ID is required",
        });
      }

      const result = await comment_service.get_comment_by_id(id);

      if (result.STATUS === "ERROR") {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: comment.controller.js | get_comment_by_id | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INTERNAL_ERROR",
        ERROR_CODE: "VTAPP-01413",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async update_comment(req, res) {
    try {
      console.log(`FILE: comment.controller.js | update_comment | Request received`);

      const { id } = req.params;
      const { comment } = req.body;

      if (!id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01414",
          ERROR_DESCRIPTION: "Comment ID is required",
        });
      }

      if (!comment || !comment.trim()) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01415",
          ERROR_DESCRIPTION: "Comment is required",
        });
      }

      const update_data = {
        comment: comment.trim(),
      };

      const result = await comment_service.update_comment(id, update_data);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: comment.controller.js | update_comment | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INTERNAL_ERROR",
        ERROR_CODE: "VTAPP-01416",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async delete_comment(req, res) {
    try {
      console.log(`FILE: comment.controller.js | delete_comment | Request received`);

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          STATUS: "ERROR",
          ERROR_FILTER: "INVALID_REQUEST",
          ERROR_CODE: "VTAPP-01417",
          ERROR_DESCRIPTION: "Comment ID is required",
        });
      }

      const result = await comment_service.delete_comment(id);

      if (result.STATUS === "ERROR") {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(`FILE: comment.controller.js | delete_comment | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INTERNAL_ERROR",
        ERROR_CODE: "VTAPP-01418",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new comment_controller();
