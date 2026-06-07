const express = require("express");
const router = express.Router();
const user_controller = require("../controllers/user.controller");
const auth_middleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: password123
 *         phone:
 *           type: string
 *           example: +1234567890
 *         address:
 *           type: string
 *           example: 123 Main Street, City, State, ZIP
 *     Login:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *     UserResponse:
 *       type: object
 *       properties:
 *         STATUS:
 *           type: string
 *           example: SUCCESSFUL
 *         DB_DATA:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 address:
 *                   type: string
 *                 role:
 *                   type: string
 *                 created_at:
 *                   type: number
 *             token:
 *               type: string
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *                 description: Optional email address
 *               phone:
 *                 type: string
 *                 pattern: '^03\d{9}$'
 *                 example: "030xxxxxxxxxxx"
 *                 description: Pakistani phone number format (11 digits starting with 03, must be unique)
 *               address:
 *                 type: string
 *                 example: 123 Main Street, City, State, ZIP
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or phone number already exists
 */
router.post("/register", user_controller.register);

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login user with phone number (password required for protected accounts)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^03\d{9}$'
 *                 example: "03047949332"
 *                 description: Pakistani phone number format (11 digits starting with 03)
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "yourPassword123"
 *                 description: Required only for protected accounts listed in auth.config.js (e.g. 03047949332). Other numbers can login with phone only.
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid phone number, missing password for protected account, or user not found
 */
router.post("/login", user_controller.login);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", auth_middleware.authenticate, user_controller.get_profile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put("/profile", auth_middleware.authenticate, user_controller.update_profile);

/**
 * @swagger
 * /api/v1/users/list:
 *   get:
 *     summary: Get all users list (name and id only) - Admin only
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get("/list", auth_middleware.authenticate, auth_middleware.is_admin, user_controller.get_all_users_list);

/**
 * @swagger
 * /api/v1/users/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
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
 *                       example: If an account exists with this email, a password reset email has been sent.
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post("/forgot-password", user_controller.forgot_password);

/**
 * @swagger
 * /api/v1/users/favorites:
 *   post:
 *     summary: Add product to favorites
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *             properties:
 *               product_id:
 *                 type: string
 *                 example: 69786c0d1c7b16e7d8d31988
 *     responses:
 *       200:
 *         description: Product added to favorites successfully
 *       400:
 *         description: Product already in favorites or validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/favorites", auth_middleware.authenticate, user_controller.add_to_favorites);

/**
 * @swagger
 * /api/v1/users/favorites/{product_id}:
 *   delete:
 *     summary: Remove product from favorites
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to remove from favorites
 *     responses:
 *       200:
 *         description: Product removed from favorites successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.delete("/favorites/:product_id", auth_middleware.authenticate, user_controller.remove_from_favorites);

/**
 * @swagger
 * /api/v1/users/favorites:
 *   get:
 *     summary: Get user's favorite products
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorite products retrieved successfully
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
 *                     favorites:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/favorites", auth_middleware.authenticate, user_controller.get_favorites);

module.exports = router;

