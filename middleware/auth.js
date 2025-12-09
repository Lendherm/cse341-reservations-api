// Authentication middleware for session-based authentication

const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub first.',
    loginUrl: '/auth/github'
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
    
    // Para rutas con :id
    if (req.params.id && req.params.id === req.user._id.toString()) {
      return next();
    }
    
    // Para recursos que tienen ownerId en el cuerpo
    if (req.body.ownerId && req.body.ownerId === req.user._id.toString()) {
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