const express = require("express");
const router = express.Router();
const notification_controller = require("../controllers/notification.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification settings management APIs
 */

/**
 * @swagger
 * /api/v1/notifications/settings:
 *   get:
 *     summary: Get user notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/settings", auth_middleware.authenticate, notification_controller.get_settings);

/**
 * @swagger
 * /api/v1/notifications/settings:
 *   put:
 *     summary: Update user notification settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email_notifications:
 *                 type: object
 *                 properties:
 *                   weekly_notification:
 *                     type: boolean
 *                   account_summary:
 *                     type: boolean
 *                   order_updates:
 *                     type: boolean
 *               text_messages:
 *                 type: object
 *                 properties:
 *                   call_before_checkout:
 *                     type: boolean
 *                   order_updates:
 *                     type: boolean
 *               website_notifications:
 *                 type: object
 *                 properties:
 *                   new_follower:
 *                     type: boolean
 *                   post_like:
 *                     type: boolean
 *                   someone_followed_posted:
 *                     type: boolean
 *                   post_added_to_collection:
 *                     type: boolean
 *                   order_delivery:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/settings", auth_middleware.authenticate, notification_controller.update_settings);

module.exports = router;

