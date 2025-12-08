const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
require('dotenv').config();

// Para connect-mongo v6.x
const MongoStore = require('connect-mongo');

const { specs, swaggerUi } = require('./swagger');
const errorHandler = require('./middleware/errorHandler');

// Import models
const User = require('../models/User');

const app = express();

// ========================
// Middleware Configuration
// ========================
// Configuración de CORS simplificada
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://cse341-reservations-api.onrender.com', 'https://cse341-code-student.onrender.com']
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones para connect-mongo v6
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 días en segundos
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 días en milisegundos
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// ========================
// Database Connection
// ========================
if (process.env.NODE_ENV !== 'test') {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ReservationsAPI`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
}

// ========================
// Passport Configuration
// ========================

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GitHub OAuth Strategy (opcional - solo si está configurado)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://cse341-reservations-api.onrender.com/auth/github/callback'
        : 'http://localhost:8080/auth/github/callback',
      scope: ['user:email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        const user = await User.findOrCreateFromGitHub(profile);
        console.log('User authenticated via GitHub:', user.email);
        return done(null, user);
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }
  ));
} else {
  console.log('⚠️ GitHub OAuth not configured');
}

// ========================
// OAuth Routes
// ========================
if (process.env.GITHUB_CLIENT_ID) {
  app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get('/auth/github/callback',
    passport.authenticate('github', {
      failureRedirect: '/api-docs',
      session: true
    }),
    (req, res) => {
      res.redirect('/api-docs');
    }
  );
}

// Current user route
app.get('/auth/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
});

// Auth test endpoint
app.get('/auth/test', (req, res) => {
  res.json({
    success: true,
    sessionId: req.sessionID,
    authenticated: req.isAuthenticated(),
    user: req.user
  });
});

// ========================
// API Routes
// ========================
const usersRoutes = require('./routes/users');
const propertiesRoutes = require('./routes/properties');
const reservationsRoutes = require('./routes/reservations');
const vehiclesRoutes = require('./routes/vehicles');

app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// ========================
// Swagger Documentation
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customSiteTitle: 'Reservations API - Stay & Go'
}));

// ========================
// Utility Routes
// ========================
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test route
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    environment: process.env.NODE_ENV
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Reservations API',
    version: '2.0.0',
    endpoints: {
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles',
      docs: '/api-docs',
      health: '/health'
    }
  });
});

// ========================
// Error Handling
// ========================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 10000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;