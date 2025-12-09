// Authentication middleware for session-based authentication

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in to access this resource.'
  });
};

const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Admin access required.'
  });
};

const requireProviderOrAdmin = (req, res, next) => {
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

module.exports = {
  requireAuth,
  requireAdmin,
  requireProviderOrAdmin,
  isOwnerOrAdmin
};