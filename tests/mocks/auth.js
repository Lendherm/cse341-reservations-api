// tests/mocks/auth.js - Mocks mejorados para middleware de autenticación

const mockAuth = {
  // ===========================
  // requireAuth
  // ===========================
  requireAuth: jest.fn((req, res, next) => {
    // Permitir header para testing
    if (req.headers['x-test-user']) {
      try {
        req.user = JSON.parse(req.headers['x-test-user']);
        req.isAuthenticated = () => true;
        return next();
      } catch {}
    }

    // Mock por defecto (usuario normal)
    if (!req.user) {
      req.user = {
        _id: '650a1b2c3d4e5f0012345678',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };
    }

    req.isAuthenticated = () => true;
    next();
  }),

  // ===========================
  // requireAdmin
  // ===========================
  requireAdmin: jest.fn((req, res, next) => {
    if (req.headers['x-test-admin']) {
      try {
        req.user = JSON.parse(req.headers['x-test-admin']);
        req.isAuthenticated = () => true;
        return next();
      } catch {}
    }

    req.user = {
      _id: '650a1b2c3d4e5f0012345679',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    };

    req.isAuthenticated = () => true;
    next();
  }),

  // ===========================
  // requireProviderOrAdmin
  // ===========================
  requireProviderOrAdmin: jest.fn((req, res, next) => {
    // Permitir header provider
    if (req.headers['x-test-provider']) {
      try {
        req.user = JSON.parse(req.headers['x-test-provider']);
        req.isAuthenticated = () => true;
        return next();
      } catch {}
    }

    req.user = {
      _id: '650a1b2c3d4e5f0012345680',
      name: 'Provider User',
      email: 'provider@example.com',
      role: 'provider'
    };

    req.isAuthenticated = () => true;
    next();
  }),

  // ===========================
  // isOwnerOrAdmin
  // ===========================
  isOwnerOrAdmin: jest.fn((modelName = 'Reservation') => {
    return jest.fn(async (req, res, next) => {
      try {
        const Model = require(`../../models/${modelName}`);
        const item = await Model.findById(req.params.id);

        if (!item) {
          return res.status(404).json({
            success: false,
            message: `${modelName} not found`
          });
        }

        const isOwner =
          item.userId?.toString() === req.user?._id?.toString();
        const isAdmin =
          req.user?.role === 'admin';

        if (isOwner || isAdmin) {
          req.item = item;
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Server error'
        });
      }
    });
  }),

  // ===========================
  // Helper para mockear un usuario específico
  // ===========================
  setMockUser: (userData) => (req, res, next) => {
    req.user = {
      _id: userData._id || '650a1b2c3d4e5f0012345678',
      name: userData.name || 'Test User',
      email: userData.email || 'test@example.com',
      role: userData.role || 'user'
    };
    req.isAuthenticated = () => true;
    next();
  },

  // ===========================
  // Mock usuario NO autenticado
  // ===========================
  mockUnauthenticated: jest.fn((req, res, next) => {
    req.user = null;
    req.isAuthenticated = () => false;
    next();
  })
};

// ===========================
// Reset automático después de cada test
// ===========================
afterEach(() => {
  Object.values(mockAuth).forEach(fn => {
    if (jest.isMockFunction(fn)) fn.mockClear();
  });
});

module.exports = mockAuth;
