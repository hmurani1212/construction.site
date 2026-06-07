const express = require("express");
const router = express.Router();
const payment_controller = require("../controllers/payment.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Payment intent ID
 *         client_secret:
 *           type: string
 *           description: Client secret for Stripe
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management APIs
 */

/**
 * @swagger
 * /api/v1/payments/create-intent:
 *   post:
 *     summary: Create a payment intent (Stripe)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shipping_address
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: number
 *                     image:
 *                       type: string
 *               shipping_address:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: string
 *               tax:
 *                 type: number
 *               shipping:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/create-intent", auth_middleware.authenticate, payment_controller.create_payment_intent);

/**
 * @swagger
 * /api/v1/payments/confirm:
 *   post:
 *     summary: Confirm a payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_intent_id
 *             properties:
 *               payment_intent_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/confirm", payment_controller.confirm_payment);

/**
 * @swagger
 * /api/v1/payments/status/{payment_intent_id}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: payment_intent_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment intent ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get("/status/:payment_intent_id", payment_controller.get_payment_status);

module.exports = router;

