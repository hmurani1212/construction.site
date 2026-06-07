const express = require("express");
const router = express.Router();
const easypaisa_controller = require("../controllers/easypaisa.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: EasyPaisa
 *   description: Easy Paisa payment integration APIs
 */

/**
 * @swagger
 * /api/v1/easypaisa/payment:
 *   post:
 *     summary: Create Easy Paisa payment request
 *     tags: [EasyPaisa]
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
router.post("/payment", auth_middleware.authenticate, easypaisa_controller.create_payment);

/**
 * @swagger
 * /api/v1/easypaisa/callback:
 *   post:
 *     summary: Easy Paisa payment callback (called by Easy Paisa)
 *     tags: [EasyPaisa]
 *     description: This endpoint is called by Easy Paisa after payment completion
 *     responses:
 *       302:
 *         description: Redirects to frontend success/failure page
 */
router.post("/callback", easypaisa_controller.payment_callback);

/**
 * @swagger
 * /api/v1/easypaisa/status/{transaction_ref}:
 *   get:
 *     summary: Get payment status
 *     tags: [EasyPaisa]
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
 *         description: Payment status retrieved
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get("/status/:transaction_ref", auth_middleware.authenticate, easypaisa_controller.get_payment_status);

module.exports = router;

