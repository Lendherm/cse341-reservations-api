const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');  // VERSIÓN 6.x - API diferente
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
// Configuración de CORS simplificada
app.use(cors({
  origin: function(origin, callback) {
    // En desarrollo, permitir cualquier origen
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, solo orígenes específicos
    const allowedOrigins = [
      'https://cse341-reservations-api.onrender.com',
      'https://cse341-code-student.onrender.com',
      'http://localhost:3000',
      'http://localhost:8080'
    ];
    
    // Permitir solicitudes sin origen
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS bloqueado para origen: ${origin}`);
      // Temporalmente permitir todos los orígenes para pruebas
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ¡¡¡IMPORTANTE!!! Configuración CORRECTA para connect-mongo v6.x
// En v6.x, MongoStore.create() NO ES UNA FUNCIÓN
// En su lugar, se pasa directamente como store
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({  // ¡SÍ es una función en v6.x!
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
        console.log('GitHub profile received');

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
      console.log('GitHub authentication successful');
      res.redirect('/api-docs');
    }
  );
}

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

// Test authentication endpoint
app.get('/auth/test', (req, res) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    sessionId: req.sessionID,
    user: req.user ? req.user.getPublicProfile() : null
  });
});

// ========================
// API Routes
// ========================
const usersRoutes = require('./routes/users');
const propertiesRoutes = require('./routes/properties');
const reservationsRoutes = require('./routes/reservations');
const vehiclesRoutes = require('./routes/vehicles');
const authRoutes = require('./routes/auth');

app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/auth', authRoutes); // Nuevo: rutas de autenticación

// ========================
// Authentication Middleware (opcional)
// ========================
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');

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
    tryItOutEnabled: true,
    displayRequestDuration: true
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
    session: {
      enabled: true,
      cookie: req.session.cookie
    },
    oauth: {
      github: process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not Configured'
    }
  });
});

// Session debug endpoint
app.get('/session/debug', (req, res) => {
  res.json({
    success: true,
    sessionId: req.sessionID,
    session: req.session,
    authenticated: req.isAuthenticated(),
    cookies: req.headers.cookie
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
      auth: '/api/auth',
      health: '/health',
      oauth: {
        current: '/auth/current',
        test: '/auth/test',
        logout: '/auth/logout'
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
      auth: '/api/auth',
      health: '/health'
    }
  });
});

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 10000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Not Configured'}`);
    console.log(`🔐 JWT Authentication: Available at /api/auth/token`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔑 GitHub Login: http://localhost:${PORT}/auth/github`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
} else {
  console.log('🧪 Test mode: Server not started');
}

module.exports = app;