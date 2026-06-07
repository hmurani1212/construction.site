const express = require("express");
const router = express.Router();
const jazzcash_controller = require("../controllers/jazzcash.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: JazzCash
 *   description: JazzCash payment integration APIs
 */

/**
 * @swagger
 * /api/v1/jazzcash/payment:
 *   post:
 *     summary: Create JazzCash payment request
 *     tags: [JazzCash]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 description: Order ID to create payment for
 *     responses:
 *       200:
 *         description: Payment request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/payment", auth_middleware.authenticate, jazzcash_controller.create_payment);

/**
 * @swagger
 * /api/v1/jazzcash/callback:
 *   post:
 *     summary: JazzCash payment callback (called by JazzCash)
 *     tags: [JazzCash]
 *     description: This endpoint is called by JazzCash after payment completion
 *     responses:
 *       302:
 *         description: Redirects to frontend success/failure page
 */
router.post("/callback", jazzcash_controller.payment_callback);

/**
 * @swagger
 * /api/v1/jazzcash/status/{transaction_ref}:
 *   get:
 *     summary: Get JazzCash payment status
 *     tags: [JazzCash]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transaction_ref
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction reference number
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get("/status/:transaction_ref", auth_middleware.authenticate, jazzcash_controller.get_payment_status);

module.exports = router;

