const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateUser } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication endpoints (GitHub OAuth and JWT for API clients)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (for direct registration)
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
router.post('/register', validateUser, async (req, res, next) => {
  try {
    const { name, email, passwordHash, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone ? phone.trim() : undefined,
      role: role || 'user'
    });

    const savedUser = await user.save();
    
    // Generate JWT token for immediate use
    const token = jwt.sign(
      {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        name: savedUser.name
      },
      process.env.JWT_SECRET || 'default-jwt-secret',
      {
        expiresIn: '24h'
      }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user (for API clients)
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
router.post('/login', async (req, res, next) => {
  try {
    const { email, passwordHash } = req.body;

    if (!email || !passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'default-jwt-secret',
      {
        expiresIn: '24h'
      }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/token:
 *   post:
 *     summary: Generate JWT token (for API clients)
 *     tags: [Authentication]
 *     description: Generate a JWT token using email and password (for API clients like Swagger)
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
router.post('/token', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'default-jwt-secret',
      {
        expiresIn: '24h'
      }
    );
    
    res.json({
      success: true,
      message: 'Token generated successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating token'
    });
  }
});

/**
 * @swagger
 * /api/auth/token-from-session:
 *   get:
 *     summary: Generate JWT token from current GitHub session
 *     tags: [Authentication]
 *     description: Generate a JWT token for the currently logged-in user (GitHub OAuth)
 *     responses:
 *       200:
 *         description: Token generated successfully
 *       401:
 *         description: Not authenticated with GitHub
 */
router.get('/token-from-session', (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with GitHub'
      });
    }
    
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name
      },
      process.env.JWT_SECRET || 'default-jwt-secret',
      {
        expiresIn: '24h'
      }
    );
    
    res.json({
      success: true,
      message: 'Token generated from GitHub session',
      token,
      user: req.user.getPublicProfile(),
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Token generation from session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating token'
    });
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     description: Verify a JWT token and return the user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or missing token
 */
router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default-jwt-secret'
    );
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      authenticated: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

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
router.get('/jwt-test', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default-jwt-secret'
    );
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'JWT token is valid!',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('JWT verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile (works with GitHub session OR JWT)
 *     tags: [Authentication]
 *     description: |
 *       Returns the current user profile.
 *       Works with GitHub OAuth session OR JWT token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/me', async (req, res) => {
  // 1. Try GitHub session first
  if (req.isAuthenticated()) {
    return res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile(),
      authMethod: 'github-session'
    });
  }
  
  // 2. Try JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default-jwt-secret'
      );
      
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      return res.json({
        success: true,
        authenticated: true,
        user: user.getPublicProfile(),
        authMethod: 'jwt'
      });
    } catch (error) {
      // JWT verification failed, continue to return not authenticated
    }
  }
  
  // 3. Not authenticated
  res.status(401).json({
    success: false,
    authenticated: false,
    message: 'Not authenticated. Please log in with GitHub or provide a valid JWT token.'
  });
});

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Check GitHub OAuth authentication status
 *     tags: [Authentication]
 *     description: |
 *       Returns the current GitHub OAuth authentication status and user profile.
 *       Only works with GitHub session (cookies), not with JWT.
 *     responses:
 *       200:
 *         description: Authentication status retrieved
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile(),
      authMethod: 'github-session'
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null,
      message: 'Not authenticated. Please log in with GitHub.',
      authMethod: 'github-session'
    });
  }
});

module.exports = router;