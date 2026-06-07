const express = require("express");
const router = express.Router();
const quote_controller = require("../controllers/quote.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Quotes
 *   description: Bulk material quote request APIs
 */

/**
 * @swagger
 * /api/v1/quotes:
 *   post:
 *     summary: Submit a bulk material quote request
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_name
 *               - phone
 *               - material_required
 *               - estimated_quantity
 *               - delivery_location
 *             properties:
 *               customer_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               material_required:
 *                 type: string
 *                 example: Concrete blocks 6 inch
 *               estimated_quantity:
 *                 type: string
 *                 example: 5000 pieces
 *               delivery_location:
 *                 type: string
 *               project_type:
 *                 type: string
 *                 example: Residential building
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quote request created
 */
router.post("/", auth_middleware.authenticate_optional, quote_controller.create_quote_request);

/**
 * @swagger
 * /api/v1/quotes:
 *   get:
 *     summary: Get all quote requests (admin)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", auth_middleware.authenticate, auth_middleware.is_admin, quote_controller.get_all_quotes);

/**
 * @swagger
 * /api/v1/quotes/{quote_id}:
 *   put:
 *     summary: Update quote request status/response (admin)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:quote_id", auth_middleware.authenticate, auth_middleware.is_admin, quote_controller.update_quote);

module.exports = router;
