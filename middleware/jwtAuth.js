const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token for a user
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    {
      expiresIn: '24h'
    }
  );
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided'
    });
  }
  
  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format. Use: Bearer <token>'
    });
  }
  
  const token = parts[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production'
    );
    
    // Find user
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
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
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Generate JWT endpoint (for development/testing)
const generateTokenEndpoint = async (req, res) => {
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
    const token = generateToken(user);
    
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
};

// Generate token from existing session (for Swagger/API testing)
const generateTokenFromSession = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const token = generateToken(req.user);
    
    res.json({
      success: true,
      message: 'Token generated from session',
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
};

module.exports = {
  generateToken,
  verifyToken,
  generateTokenEndpoint,
  generateTokenFromSession
};