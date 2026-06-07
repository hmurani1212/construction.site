const user_service = require("../services/user.service");

class auth_middleware {
  async authenticate(req, res, next) {
    try {
      console.log(`FILE: auth.middleware.js | authenticate | Authenticating request`);

      const auth_header = req.headers.authorization;

      if (!auth_header || !auth_header.startsWith("Bearer ")) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00302",
          ERROR_DESCRIPTION: "Authorization token is required",
        });
      }

      const token = auth_header.substring(7); // Remove "Bearer " prefix

      const verification_result = user_service.verify_token(token);

      if (verification_result.STATUS === "ERROR") {
        return res.status(401).json(verification_result);
      }

      // Attach user info to request
      req.user = verification_result.DB_DATA;
      next();
    } catch (error) {
      console.error(`FILE: auth.middleware.js | authenticate | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00303",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  async is_admin(req, res, next) {
    try {
      console.log(`FILE: auth.middleware.js | is_admin | Checking admin access`);

      if (!req.user) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00304",
          ERROR_DESCRIPTION: "Authentication required",
        });
      }

      if (req.user.role !== "admin") {
        return res.status(403).json({
          STATUS: "ERROR",
          ERROR_FILTER: "USER_END_VIOLATION",
          ERROR_CODE: "VTAPP-00305",
          ERROR_DESCRIPTION: "Admin access required",
        });
      }

      next();
    } catch (error) {
      console.error(`FILE: auth.middleware.js | is_admin | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00306",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }

  // Optional authentication - doesn't fail if no token, but sets req.user if token is valid
  async authenticate_optional(req, res, next) {
    try {
      console.log(`FILE: auth.middleware.js | authenticate_optional | Checking optional authentication`);

      const auth_header = req.headers.authorization;

      if (!auth_header || !auth_header.startsWith("Bearer ")) {
        // No token provided - continue without user (guest order)
        req.user = null;
        return next();
      }

      const token = auth_header.substring(7); // Remove "Bearer " prefix

      const verification_result = user_service.verify_token(token);

      if (verification_result.STATUS === "ERROR") {
        // Invalid token - continue without user (guest order)
        req.user = null;
        return next();
      }

      // Valid token - attach user info to request
      req.user = verification_result.DB_DATA;
      next();
    } catch (error) {
      console.error(`FILE: auth.middleware.js | authenticate_optional | Error:`, error);
      // On error, continue without user (guest order)
      req.user = null;
      next();
    }
  }
}

module.exports = new auth_middleware();

