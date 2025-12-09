const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   nullable: true
 *                 message:
 *                   type: string
 *                 loginUrl:
 *                   type: string
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile(),
      message: 'Authenticated with GitHub',
      loginUrl: null
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null,
      message: 'Not authenticated. Please visit /auth/github',
      loginUrl: '/auth/github'
    });
  }
});

module.exports = router;