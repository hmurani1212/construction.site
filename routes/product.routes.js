const express = require("express");
const router = express.Router();
const product_controller = require("../controllers/product.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     AdditionalItem:
 *       type: object
 *       required:
 *         - name
 *         - image
 *         - price
 *       properties:
 *         name:
 *           type: string
 *           example: Matching Belt
 *         image:
 *           type: string
 *           example: https://example.com/item-image.jpg
 *         price:
 *           type: number
 *           example: 500
 *         original_price:
 *           type: number
 *           example: 700
 *         stock_quantity:
 *           type: number
 *           example: 5
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - main_image
 *         - category_id
 *       properties:
 *         name:
 *           type: string
 *           example: Haldiram's Sev Bhujia
 *         description:
 *           type: string
 *           example: Delicious crispy snack
 *         price:
 *           type: number
 *           example: 18
 *         original_price:
 *           type: number
 *           example: 24
 *         image:
 *           type: string
 *           example: https://example.com/image.jpg
 *           description: Deprecated - use main_image instead (kept for backward compatibility)
 *         main_image:
 *           type: string
 *           example: https://example.com/main-image.jpg
 *           description: Main product image (required)
 *         category:
 *           type: string
 *           example: Snack & Munchies
 *           description: Deprecated - use category_id instead
 *         category_id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: MongoDB ObjectId of the category
 *         additional_items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AdditionalItem'
 *           description: Additional items that can be added to the product
 *         label:
 *           type: string
 *           enum: [Sale, Hot, New]
 *           example: Sale
 *         discount_percentage:
 *           type: number
 *           example: 14
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           example: 4.5
 *         reviews_count:
 *           type: number
 *           example: 149
 *         stock_quantity:
 *           type: number
 *           example: 100
 *         unit:
 *           type: string
 *           example: 1kg
 */

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with pagination, filtering, and sorting
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest]
 *           default: newest
 *         description: Sort products
 *     responses:
 *       200:
 *         description: List of products
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         total_pages:
 *                           type: number
 */
router.get("/", product_controller.get_all_products);

/**
 * @swagger
 * /api/v1/products/list:
 *   get:
 *     summary: Get products list (name and id only, no pagination)
 *     tags: [Products]
 *     description: Returns a simple list of all active products with only _id, name, and price fields
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 STATUS:
 *                   type: string
 *                   example: SUCCESSFUL
 *                 DB_DATA:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 */
// IMPORTANT: This route must come before /:product_id to avoid "list" being treated as product_id
router.get("/list", product_controller.get_products_list);

/**
 * @swagger
 * /api/v1/products/ramzan:
 *   get:
 *     summary: Get all Ramzan package products
 *     tags: [Products]
 *     description: Returns all products where ramzan_product is true
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, newest]
 *           default: newest
 *         description: Sort products
 *     responses:
 *       200:
 *         description: List of Ramzan package products
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
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         total_pages:
 *                           type: number
 */
// IMPORTANT: This route must come before /:product_id to avoid "ramzan" being treated as product_id
router.get("/ramzan", product_controller.get_ramzan_products);
router.get("/bulk-materials", product_controller.get_ramzan_products);

/**
 * @swagger
 * /api/v1/products/{product_id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 STATUS:
 *                   type: string
 *                 DB_DATA:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get("/:product_id", product_controller.get_product_by_id);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post("/", auth_middleware.authenticate, auth_middleware.is_admin, product_controller.create_product);

/**
 * @swagger
 * /api/v1/products/{product_id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put("/:product_id", auth_middleware.authenticate, auth_middleware.is_admin, product_controller.update_product);

/**
 * @swagger
 * /api/v1/products/{product_id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete("/:product_id", auth_middleware.authenticate, auth_middleware.is_admin, product_controller.delete_product);

/**
 * @swagger
 * /api/v1/products/{product_id}/rate:
 *   post:
 *     summary: Rate a product (Authenticated users only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Rating value (1-5 stars)
 *     responses:
 *       200:
 *         description: Product rated successfully
 *       400:
 *         description: Validation error or user has already rated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post("/:product_id/rate", auth_middleware.authenticate, product_controller.rate_product);

module.exports = router;

