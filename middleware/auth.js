// Authentication middleware

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in to access this resource.'
  });
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Admin access required.'
  });
};

const isProviderOrAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'provider' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Provider or admin access required.'
  });
};

const isOwnerOrAdmin = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      return next();
    }
    // Check if user is the owner of the resource
    const resourceId = req.params.id || req.body.ownerId;
    if (req.user._id.toString() === resourceId) {
      return next();
    }
  }
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource.'
  });
};

// Middleware to check API key for external access
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required.'
    });
  }
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key.'
    });
  }
  
  next();
};

// Combine authentication methods
const ensureAuthenticated = isAuthenticated;
const ensureAdmin = isAdmin;
const ensureProviderOrAdmin = isProviderOrAdmin;
const ensureOwnerOrAdmin = isOwnerOrAdmin;

module.exports = {
  isAuthenticated,
  isAdmin,
  isProviderOrAdmin,
  isOwnerOrAdmin,
  checkApiKey,
  ensureAuthenticated,
  ensureAdmin,
  ensureProviderOrAdmin,
  ensureOwnerOrAdmin
};