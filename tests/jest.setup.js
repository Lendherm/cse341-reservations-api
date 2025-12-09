// tests/jest.setup.js - Minimal Jest setup
console.log('✅ Jest setup complete');

// Optional: suppress non-essential logs during tests
if (process.env.NODE_ENV === 'test') {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args.some(arg => typeof arg === 'string' && (arg.includes('✅') || arg.includes('❌')))) {
      originalConsoleLog(...args);
    }
    // Otherwise ignore logs to reduce noise
  };
}

// Simple mock for auth middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    if (req.headers['x-test-user']) {
      req.user = JSON.parse(req.headers['x-test-user']);
      req.isAuthenticated = () => true;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required' });
  },
  requireAdmin: (req, res, next) => {
    if (req.headers['x-test-admin']) {
      req.user = JSON.parse(req.headers['x-test-admin']);
      req.isAuthenticated = () => true;
      return next();
    }
    return res.status(403).json({ success: false, message: 'Admin access required' });
  },
  isOwnerOrAdmin: () => (req, res, next) => {
    if (req.headers['x-test-user'] || req.headers['x-test-admin']) {
      req.user = JSON.parse(req.headers['x-test-user'] || req.headers['x-test-admin']);
      req.isAuthenticated = () => true;
      return next();
    }
    return res.status(403).json({ success: false, message: 'Not authorized to access this resource' });
  }
}));

// Minimal passport mock
jest.mock('passport', () => ({
  initialize: () => (req, res, next) => next(),
  session: () => (req, res, next) => next(),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
  authenticate: jest.fn()
}));
