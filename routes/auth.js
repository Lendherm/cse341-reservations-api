const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Verificar estado de autenticación
 *     tags: [Autenticación]
 *     responses:
 *       200:
 *         description: Estado de autenticación
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? req.user.getPublicProfile() : null,
    message: req.isAuthenticated() 
      ? 'Authenticated with GitHub' 
      : 'Not authenticated. Please visit /auth/github',
    loginUrl: '/auth/github'
  });
});

module.exports = router;