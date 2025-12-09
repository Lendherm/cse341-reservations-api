const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://cse341-reservations-api.onrender.com',
      'https://cse341-code-student.onrender.com',
      'http://localhost:3000',
      'http://localhost:8080'
    ];
    
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log(`CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión - CRUCIAL PARA RENDER
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 horas
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  proxy: process.env.NODE_ENV === 'production' // Importante para Render
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
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
}

// ========================
// Passport Configuration - SOLO GITHUB
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
        console.log('GitHub profile received:', profile.username);

        // Buscar usuario por GitHub ID
        let user = await User.findOne({ githubId: profile.id });

        if (user) {
          console.log('Usuario encontrado por GitHub ID:', user.email);
          return done(null, user);
        }

        // Buscar por email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            console.log('Usuario encontrado por email, actualizando GitHub ID:', user.email);
            user.githubId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // Crear nuevo usuario
        const newUser = new User({
          githubId: profile.id,
          name: profile.displayName || profile.username,
          email: email || `${profile.username}@github.com`,
          username: profile.username
        });

        await newUser.save();
        console.log('Nuevo usuario creado:', newUser.email);
        return done(null, newUser);
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }
  ));
} else {
  console.log('⚠️ GitHub OAuth not configured - check environment variables');
}

// ========================
// OAuth Routes
// ========================
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/',
    session: true
  }),
  (req, res) => {
    console.log('✅ GitHub authentication successful for:', req.user.email);
    // Redirigir a panel de pruebas
    res.redirect('/panel');
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
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        githubId: req.user.githubId
      }
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Not authenticated. Please log in with GitHub.'
    });
  }
});

// ========================
// Middleware de Autenticación SIMPLIFICADO
// ========================
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub first.',
    loginUrl: '/auth/github'
  });
};

const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'Admin access required.'
  });
};

// ========================
// Import Routes
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
// Swagger Documentation - ACTUALIZAR SIN JWT
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Reservations API - Stay & Go (GitHub OAuth)'
}));

// ========================
// Panel de Pruebas Web - MANTENER
// ========================
app.get('/panel', (req, res) => {
  // ... (mantener el mismo HTML)
  // Solo cambiar las URLs para usar solo sesiones
});

// ========================
// Health & Status
// ========================
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    success: true, 
    message: 'Reservations API is running',
    timestamp: new Date().toISOString(),
    authentication: 'GitHub OAuth only (no JWT)',
    database: dbStatus,
    endpoints: {
      login: '/auth/github',
      logout: '/auth/logout',
      current_user: '/api/me',
      docs: '/api-docs',
      panel: '/panel'
    }
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Reservations API - Stay & Go',
    version: '2.0.0',
    authentication: 'GitHub OAuth (Session-based) - NO JWT',
    endpoints: {
      login: '/auth/github',
      logout: '/auth/logout',
      current_user: '/api/me',
      documentation: '/api-docs',
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles',
      health: '/health',
      panel: '/panel'
    }
  });
});

// ========================
// Error Handling
// ========================
app.use(errorHandler);

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 10000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Authentication: GitHub OAuth only (no JWT)`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔑 GitHub Login: http://localhost:${PORT}/auth/github`);
    console.log(`🔧 Test Panel: http://localhost:${PORT}/panel`);
  });
}

module.exports = app;