const comment_data_repository = require("../data_repositories/comment.data_repository");

class comment_service {
  constructor() {
    console.log("FILE: comment.service.js | constructor | Service initialized");
  }

  async create_comment(comment_data) {
    try {
      console.log(`FILE: comment.service.js | create_comment | Creating comment`);

      // Create comment
      const comment = await comment_data_repository.create_comment(comment_data);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          comment: comment,
        },
      };
    } catch (error) {
      console.error(`FILE: comment.service.js | create_comment | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "DATABASE_ERROR",
        ERROR_CODE: "VTAPP-01401",
        ERROR_DESCRIPTION: error.message || "Failed to create comment",
        DB_DATA: null,
      };
    }
  }

  async get_all_comments(filters = {}) {
    try {
      console.log(`FILE: comment.service.js | get_all_comments | Fetching all comments`);

      const comments = await comment_data_repository.get_all_comments(filters);

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          comments: comments,
        },
      };
    } catch (error) {
      console.error(`FILE: comment.service.js | get_all_comments | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "DATABASE_ERROR",
        ERROR_CODE: "VTAPP-01402",
        ERROR_DESCRIPTION: error.message || "Failed to fetch comments",
        DB_DATA: null,
      };
    }
  }

  async get_comment_by_id(comment_id) {
    try {
      console.log(`FILE: comment.service.js | get_comment_by_id | Fetching comment: ${comment_id}`);

      const comment = await comment_data_repository.get_comment_by_id(comment_id);

      if (!comment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01403",
          ERROR_DESCRIPTION: "Comment not found",
          DB_DATA: null,
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          comment: comment,
        },
      };
    } catch (error) {
      console.error(`FILE: comment.service.js | get_comment_by_id | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "DATABASE_ERROR",
        ERROR_CODE: "VTAPP-01404",
        ERROR_DESCRIPTION: error.message || "Failed to fetch comment",
        DB_DATA: null,
      };
    }
  }

  async update_comment(comment_id, update_data) {
    try {
      console.log(`FILE: comment.service.js | update_comment | Updating comment: ${comment_id}`);

      const comment = await comment_data_repository.update_comment(comment_id, update_data);

      if (!comment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01405",
          ERROR_DESCRIPTION: "Comment not found",
          DB_DATA: null,
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          comment: comment,
        },
      };
    } catch (error) {
      console.error(`FILE: comment.service.js | update_comment | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "DATABASE_ERROR",
        ERROR_CODE: "VTAPP-01406",
        ERROR_DESCRIPTION: error.message || "Failed to update comment",
        DB_DATA: null,
      };
    }
  }

  async delete_comment(comment_id) {
    try {
      console.log(`FILE: comment.service.js | delete_comment | Deleting comment: ${comment_id}`);

      const comment = await comment_data_repository.delete_comment(comment_id);

      if (!comment) {
        return {
          STATUS: "ERROR",
          ERROR_FILTER: "NOT_FOUND",
          ERROR_CODE: "VTAPP-01407",
          ERROR_DESCRIPTION: "Comment not found",
          DB_DATA: null,
        };
      }

      return {
        STATUS: "SUCCESSFUL",
        ERROR_CODE: "",
        ERROR_FILTER: "",
        ERROR_DESCRIPTION: "",
        DB_DATA: {
          comment: comment,
        },
      };
    } catch (error) {
      console.error(`FILE: comment.service.js | delete_comment | Error:`, error);
      return {
        STATUS: "ERROR",
        ERROR_FILTER: "DATABASE_ERROR",
        ERROR_CODE: "VTAPP-01408",
        ERROR_DESCRIPTION: error.message || "Failed to delete comment",
        DB_DATA: null,
      };
    }
  }
}

module.exports = new comment_service();
