const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
require('dotenv').config();

const { specs, swaggerUi } = require('./swagger');
const errorHandler = require('./middleware/errorHandler');

// Import models
const User = require('./models/User');

const app = express();

// ========================
// Middleware Configuration
// ========================
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://cse341-reservations-api.onrender.com', 'https://cse341-code-student.onrender.com']
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// ========================
// Database Connection (NO conectar en modo test)
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
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
} else {
  console.log('🧪 Test mode: MongoDB connection skipped');
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

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:8080/auth/github/callback',
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('GitHub profile received:', {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });

      // Find or create user
      const user = await User.findOrCreateFromGitHub(profile);
      
      // Update last login
      await user.updateLastLogin();
      
      console.log('User authenticated via GitHub:', user.email);
      return done(null, user);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return done(error, null);
    }
  }
));

// ========================
// OAuth Routes
// ========================
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    session: true
  }),
  (req, res) => {
    console.log('GitHub authentication successful for user:', req.user.email);
    res.redirect('/api-docs');
  }
);

// Logout route
app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    
    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

// Current user route
app.get('/auth/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile()
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
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
// Authentication Middleware
// ========================
const { ensureAuthenticated, ensureAdmin, ensureProviderOrAdmin } = require('./middleware/auth');

app.get('/api/protected', ensureAuthenticated, (req, res) => {
  res.json({
    success: true,
    message: 'You have accessed a protected route!',
    user: req.user.getPublicProfile()
  });
});

app.get('/api/admin-only', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome, Admin!',
    user: req.user.getPublicProfile()
  });
});

// ========================
// Swagger Documentation
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Reservations API - Stay & Go',
  swaggerOptions: {
    persistAuthorization: true,
    authAction: {
      bearerAuth: {
        name: 'bearerAuth',
        schema: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'JWT or OAuth token'
        },
        value: 'Bearer <token>'
      }
    }
  }
}));

// ========================
// Utility Routes
// ========================
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    success: true, 
    message: 'Reservations API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    oauth: {
      github: process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not Configured'
    }
  });
});

// Home route
app.get('/', (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  
  res.json({
    success: true,
    message: 'Welcome to Reservations API - Stay & Go',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    authenticated: isAuthenticated,
    user: isAuthenticated ? req.user.getPublicProfile() : null,
    endpoints: {
      documentation: '/api-docs',
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles',
      health: '/health',
      auth: {
        github: '/auth/github',
        logout: '/auth/logout',
        current: '/auth/current'
      }
    }
  });
});

// ========================
// Error Handling
// ========================
app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      documentation: '/api-docs',
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles',
      health: '/health',
      auth: {
        github: '/auth/github',
        logout: '/auth/logout',
        current: '/auth/current'
      }
    }
  });
});

// ========================
// Start Server (solo si no es test)
// ========================
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not Configured'}`);
    console.log(`📚 API Documentation: /api-docs`);
    console.log(`🔑 GitHub Login: /auth/github`);
    console.log(`🏥 Health check: /health`);
  });
} else {
  console.log('🧪 Test mode: Server not started');
}

module.exports = app;
