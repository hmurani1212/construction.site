const express = require("express");
const router = express.Router();
const category_controller = require("../controllers/category.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *         - image
 *       properties:
 *         name:
 *           type: string
 *           description: Category name
 *         image:
 *           type: string
 *           description: Category image URL
 *         is_active:
 *           type: number
 *           enum: [0, 1]
 *           description: Category status (0=Inactive, 1=Active)
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: number
 *           enum: [0, 1]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of categories
 *       400:
 *         description: Bad request
 */
router.get("/", category_controller.get_all_categories);

/**
 * @swagger
 * /api/v1/categories/{category_id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get("/:category_id", category_controller.get_category_by_id);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post("/", auth_middleware.authenticate, auth_middleware.is_admin, category_controller.create_category);

/**
 * @swagger
 * /api/v1/categories/{category_id}:
 *   put:
 *     summary: Update a category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put("/:category_id", auth_middleware.authenticate, auth_middleware.is_admin, category_controller.update_category);

/**
 * @swagger
 * /api/v1/categories/{category_id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete("/:category_id", auth_middleware.authenticate, auth_middleware.is_admin, category_controller.delete_category);

module.exports = router;

