const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: GitHub OAuth authentication endpoints
 */

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     description: |
 *       Returns the current authentication status and user profile
 *       if authenticated via GitHub OAuth.
 *     responses:
 *       200:
 *         description: Authentication status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile()
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null,
      message: 'Not authenticated. Please log in with GitHub.'
    });
  }
});

module.exports = router;