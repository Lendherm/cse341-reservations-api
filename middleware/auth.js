// Authentication middleware for session-based authentication
// Versión mejorada con logs para debugging

const requireAuth = (req, res, next) => {
  console.log(`\n=== 🔐 MIDDLEWARE requireAuth ===`);
  console.log('   URL:', req.originalUrl);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   User:', req.user ? req.user.email : 'No user');
  
  if (req.isAuthenticated()) {
    console.log('   ✅ Authentication passed');
    return next();
  }
  
  console.log('   ❌ Authentication failed');
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub first.',
    loginUrl: '/auth/github'
  });
};

const requireAdmin = (req, res, next) => {
  console.log(`\n=== 👑 MIDDLEWARE requireAdmin ===`);
  console.log('   User Role:', req.user ? req.user.role : 'No user');
  
  if (req.isAuthenticated() && req.user.role === 'admin') {
    console.log('   ✅ Admin access granted');
    return next();
  }
  
  console.log('   ❌ Admin access denied');
  return res.status(403).json({
    success: false,
    message: 'Admin access required.'
  });
};

const requireProviderOrAdmin = (req, res, next) => {
  console.log(`\n=== 🏢 MIDDLEWARE requireProviderOrAdmin ===`);
  console.log('   User Role:', req.user ? req.user.role : 'No user');
  
  if (req.isAuthenticated() && (req.user.role === 'provider' || req.user.role === 'admin')) {
    console.log('   ✅ Provider/Admin access granted');
    return next();
  }
  
  console.log('   ❌ Provider/Admin access denied');
  return res.status(403).json({
    success: false,
    message: 'Provider or admin access required.'
  });
};

const isOwnerOrAdmin = (req, res, next) => {
  console.log(`\n=== 👤 MIDDLEWARE isOwnerOrAdmin ===`);
  console.log('   User Role:', req.user ? req.user.role : 'No user');
  console.log('   Resource ID:', req.params.id);
  console.log('   User ID:', req.user ? req.user._id : 'No user');
  
  if (req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      console.log('   ✅ Admin access granted');
      return next();
    }
    
    // Para rutas con :id
    if (req.params.id && req.params.id === req.user._id.toString()) {
      console.log('   ✅ Owner access granted (by ID)');
      return next();
    }
    
    // Para recursos que tienen ownerId en el cuerpo
    if (req.body.ownerId && req.body.ownerId === req.user._id.toString()) {
      console.log('   ✅ Owner access granted (by ownerId)');
      return next();
    }
  }
  
  console.log('   ❌ Owner/Admin access denied');
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource.'
  });
};

// Middleware opcional para logging de autenticación
const authLogger = (req, res, next) => {
  console.log(`\n[Auth Logger] ${req.method} ${req.url}`);
  console.log(`   Authenticated: ${req.isAuthenticated()}`);
  console.log(`   User: ${req.user ? req.user.email : 'None'}`);
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireProviderOrAdmin,
  isOwnerOrAdmin,
  authLogger
};