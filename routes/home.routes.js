const express = require("express");
const router = express.Router();
const home_controller = require("../controllers/home.controller");

/**
 * @swagger
 * /api/v1/home:
 *   get:
 *     summary: Get home page data (Popular Categories, Popular Products, and Daily Best Sells)
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: Home data retrieved successfully
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
 *                     Popular_Categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: List of active categories
 *                     Popular_Products:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: List of popular products (sorted by price high)
 *                     Daily_Best_Sells:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Today's best selling products (up to 4 products). Shows products with most sales today, fills remaining slots with other products if needed.
 *       500:
 *         description: Internal server error
 */
router.get("/", home_controller.get_home_data);

module.exports = router;

