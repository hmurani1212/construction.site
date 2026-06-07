require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const mongoose_connection = require("./_core_app_connectivities/db_mongo_mongoose");
const { swagger_ui, swagger_spec } = require("./swagger");

// Redis and BullMQ require persistent connections — not compatible with Vercel serverless.
// Only initialize them in non-serverless (local/PM2) environments.
const IS_VERCEL = process.env.VERCEL === '1';
if (!IS_VERCEL) {
  require("./_core_app_connectivities/redis");
}

// CRITICAL: Import all models FIRST in dependency order to ensure they are registered on the same connection
// This must be done before importing routes/services that use these models
// Models must be loaded in dependency order so referenced models exist when schemas are created
// Load base models first (no dependencies)
const user_model = require("./models/user.model");
const product_model = require("./models/product.model");
const category_model = require("./models/category.model");
// Load dependent models (depend on user/product) - these schemas reference user and product
const order_model = require("./models/order.model");
const payment_model = require("./models/payment.model");
const notification_settings_model = require("./models/notification_settings.model");
const comment_model = require("./models/comment.model");
const quote_model = require("./models/quote.model");

// Import routes
const user_routes = require("./routes/user.routes");
const product_routes = require("./routes/product.routes");
const category_routes = require("./routes/category.routes");
const home_routes = require("./routes/home.routes");
const payment_routes = require("./routes/payment.routes");
const order_routes = require("./routes/order.routes");
const easypaisa_routes = require("./routes/easypaisa.routes");
const jazzcash_routes = require("./routes/jazzcash.routes");
const upload_routes = require("./routes/upload.routes");
const notification_routes = require("./routes/notification.routes");
const comment_routes = require("./routes/comment.routes");
const quote_routes = require("./routes/quote.routes");
const sitemap_routes = require("./routes/sitemap.routes");
const apiKeyMiddleware = require("./middlewares/apiKey.middleware");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger documentation
app.use("/api-docs", swagger_ui.serve, swagger_ui.setup(swagger_spec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "BuildMart Construction Materials API",
}));

// Bull Board requires persistent Redis connections — only initialize locally, not on Vercel
if (!IS_VERCEL) {
  const { initializeBullBoard } = require("./admin_board");
  initializeBullBoard(app, '/admin/queues');
}

// Health check endpoint (excluded from API key validation)
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 STATUS:
 *                   type: string
 *                   example: SUCCESSFUL
 *                 DB_DATA:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Server is running
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    STATUS: "SUCCESSFUL",
    ERROR_CODE: "",
    ERROR_FILTER: "",
    ERROR_DESCRIPTION: "",
    DB_DATA: {
      message: "Server is running",
      timestamp: new Date().toISOString(),
    },
  });
});

// Apply API Key Middleware to all API routes
// This ensures all API endpoints require a valid API key
app.use("/api/v1", apiKeyMiddleware.validateApiKey);

// API Routes
app.use("/api/v1/users", user_routes);
app.use("/api/v1/products", product_routes);
app.use("/api/v1/categories", category_routes);
app.use("/api/v1/home", home_routes);
app.use("/api/v1/payments", payment_routes);
app.use("/api/v1/orders", order_routes);
app.use("/api/v1/easypaisa", easypaisa_routes);
app.use("/api/v1/jazzcash", jazzcash_routes);
app.use("/api/v1/upload", upload_routes);
app.use("/api/v1/notifications", notification_routes);
app.use("/api/v1/comments", comment_routes);
app.use("/api/v1/quotes", quote_routes);

// Sitemap route
app.use("/", sitemap_routes);

// Static files: served by Vercel CDN in production (see vercel.json).
// Locally, Express serves them directly from public/build.
if (!IS_VERCEL) {
  const frontendBuildPath = path.join(__dirname, "public", "build");
  app.use(express.static(frontendBuildPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/api-docs") || req.path.startsWith("/admin/queues")) {
      return res.status(404).json({
        STATUS: "ERROR",
        ERROR_FILTER: "INVALID_REQUEST",
        ERROR_CODE: "VTAPP-99999",
        ERROR_DESCRIPTION: "Route not found",
      });
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(`FILE: app.js | error_handler | Error:`, err);
  res.status(500).json({
    STATUS: "ERROR",
    ERROR_FILTER: "TECHNICAL_ISSUE",
    ERROR_CODE: "VTAPP-99998",
    ERROR_DESCRIPTION: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 6160;

// Initialize notification service when MongoDB is connected
const initializeNotificationService = async () => {
  try {
    if (mongoose_connection.readyState === 1) {
      const notification_service = require("./services/notification.service");
      await notification_service.initialize();
      console.log('FILE: app.js | Notification service initialized');
    }
  } catch (error) {
    console.error('FILE: app.js | Error initializing notification service:', error);
  }
};

// Initialize notification service on MongoDB connection
mongoose_connection.on('connected', () => {
  console.log('FILE: app.js | MongoDB connected, initializing notification service');
  initializeNotificationService();
});

// Only call app.listen when running locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`FILE: app.js | Server is running on port ${PORT}`);
    console.log(`FILE: app.js | MongoDB connection status: ${mongoose_connection.readyState === 1 ? "Connected" : "Disconnected"}`);
    
    // Initialize notification service if MongoDB is already connected
    if (mongoose_connection.readyState === 1) {
      initializeNotificationService();
    }
  });
}

// Export app for Vercel serverless deployment
module.exports = app;

