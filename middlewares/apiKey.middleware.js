const app_config = require("../global_config/app_config");

/**
 * API Key Authentication Middleware
 * Validates that requests include a valid API key in the headers
 * This prevents unauthorized access to API endpoints from external sources
 */
class apiKeyMiddleware {
  validateApiKey(req, res, next) {
    try {
      // Get API key from custom header (not Authorization to avoid confusion with JWT)
      const apiKey = req.headers['x-api-key'] || req.headers['x-apikey'] || req.headers['api-key'];

      if (!apiKey) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHORIZATION_VIOLATION",
          ERROR_CODE: "VTAPP-00401",
          ERROR_DESCRIPTION: "You are not authorized to access this API. API key is required.",
        });
      }

      // Get the valid API key from config
      const validApiKey = app_config.gc_api_security_key;

      if (!validApiKey) {
        console.error('FILE: apiKey.middleware.js | validateApiKey | API key not configured in app_config');
        return res.status(500).json({
          STATUS: "ERROR",
          ERROR_FILTER: "TECHNICAL_ISSUE",
          ERROR_CODE: "VTAPP-00402",
          ERROR_DESCRIPTION: "Server configuration error",
        });
      }

      // Compare API keys (use secure comparison to prevent timing attacks)
      if (apiKey !== validApiKey) {
        return res.status(401).json({
          STATUS: "ERROR",
          ERROR_FILTER: "AUTHORIZATION_VIOLATION",
          ERROR_CODE: "VTAPP-00403",
          ERROR_DESCRIPTION: "You are not authorized to access this API. Invalid API key provided.",
        });
      }

      // API key is valid, proceed to next middleware
      next();
    } catch (error) {
      console.error(`FILE: apiKey.middleware.js | validateApiKey | Error:`, error);
      return res.status(500).json({
        STATUS: "ERROR",
        ERROR_FILTER: "TECHNICAL_ISSUE",
        ERROR_CODE: "VTAPP-00404",
        ERROR_DESCRIPTION: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new apiKeyMiddleware();
