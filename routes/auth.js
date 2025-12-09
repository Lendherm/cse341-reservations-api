const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { validateUser } = require('../middleware/validation');
const { verifyToken, generateTokenEndpoint, generateTokenFromSession } = require('../middleware/jwtAuth');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - passwordHash
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               passwordHash:
 *                 type: string
 *                 example: "password123"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 enum: [user, admin, provider]
 *                 default: "user"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', validateUser, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - passwordHash
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               passwordHash:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/token:
 *   post:
 *     summary: Generate JWT token
 *     tags: [Authentication]
 *     description: Generate a JWT token using email and password (for API clients)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Token generated successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/token', generateTokenEndpoint);

/**
 * @swagger
 * /api/auth/token-from-session:
 *   get:
 *     summary: Generate JWT token from current session
 *     tags: [Authentication]
 *     description: Generate a JWT token for the currently logged-in user (GitHub OAuth)
 *     responses:
 *       200:
 *         description: Token generated successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/token-from-session', generateTokenFromSession);

/**
 * @swagger
 * /api/auth/jwt-test:
 *   get:
 *     summary: Test JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: JWT token is valid
 *       401:
 *         description: Invalid or expired token
 */
router.get('/jwt-test', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'JWT token is valid!',
    user: req.user
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/me', verifyToken, getMe);

module.exports = router;