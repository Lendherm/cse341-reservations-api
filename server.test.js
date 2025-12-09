// server.test.js - Update session configuration
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// For testing, use memory store instead of MongoStore
const sessionStore = process.env.NODE_ENV === 'test' 
  ? new session.MemoryStore() 
  : require('connect-mongo').create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60
    });

dotenv.config();

const app = express();

// ========================
// CONFIGURACIÓN PARA TESTING
// ========================
const LOCAL_URL = 'http://localhost:8080';
const CURRENT_URL = LOCAL_URL;

// ========================
// MIDDLEWARE
// ========================
app.use(express.json());

// CORS CONFIGURADO
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Origin', 'Accept', 'x-test-user'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ========================
// SESSION CONFIGURATION PARA TESTING
// ========================
app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ========================
// PASSPORT CONFIGURATION (MÍNIMO PARA TEST)
// ========================
app.use(passport.initialize());
app.use(passport.session());

// Serialización/deserialización SIMPLE
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ========================
// AUTHENTICATION MIDDLEWARE MOCK FOR TESTING
// ========================
app.use((req, res, next) => {
  // Check for test headers
  if (req.headers['x-test-user']) {
    try {
      const user = JSON.parse(req.headers['x-test-user']);
      req.user = user;
      req.isAuthenticated = () => true;
    } catch (err) {
      req.user = null;
      req.isAuthenticated = () => false;
    }
  } else if (req.headers['x-test-admin']) {
    try {
      const admin = JSON.parse(req.headers['x-test-admin']);
      req.user = admin;
      req.isAuthenticated = () => true;
    } catch (err) {
      req.user = null;
      req.isAuthenticated = () => false;
    }
  } else {
    req.isAuthenticated = () => false;
  }
  next();
});

// ========================
// MOCK AUTHENTICATION MIDDLEWARES
// ========================
const mockRequireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

const mockRequireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

// ========================
// RUTAS BÁSICAS
// ========================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Test API Server',
    authenticated: req.isAuthenticated()
  });
});

// ========================
// RUTA DE DIAGNÓSTICO
// ========================
app.get('/auth/debug', (req, res) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    user: req.user,
    environment: 'testing'
  });
});

// ========================
// HEALTH CHECK
// ========================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    authenticated: req.isAuthenticated(),
    environment: 'testing',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ========================
// IMPORTAR RUTAS CON MOCKED AUTH
// ========================
// We need to patch the routes to use our mocked auth
const usersRoutes = require('./routes/users');
const propertiesRoutes = require('./routes/properties');
const reservationsRoutes = require('./routes/reservations');
const vehiclesRoutes = require('./routes/vehicles');

// Create patched versions of auth middleware
const auth = {
  requireAuth: mockRequireAuth,
  requireAdmin: mockRequireAdmin,
  requireProviderOrAdmin: mockRequireAuth, // For now, use requireAuth
  isOwnerOrAdmin: (modelName) => {
    return async (req, res, next) => {
      if (req.isAuthenticated()) {
        if (req.user.role === 'admin') {
          return next();
        }
        // For testing, allow if user ID matches or we have test headers
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    };
  }
};

// Mock the auth module
jest.mock('./middleware/auth', () => auth);

// Use the routes
app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// ========================
// 404 HANDLER
// ========================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    environment: 'testing'
  });
});

// ========================
// ERROR HANDLER
// ========================
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;