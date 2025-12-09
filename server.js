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
      console.log(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration - CRITICAL FOR RENDER
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: process.env.NODE_ENV === 'production' // Important for Render
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
// Passport Configuration - GITHUB ONLY
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

        // Find user by GitHub ID
        let user = await User.findOne({ githubId: profile.id });

        if (user) {
          console.log('User found by GitHub ID:', user.email);
          return done(null, user);
        }

        // Find by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            console.log('User found by email, updating GitHub ID:', user.email);
            user.githubId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const newUser = new User({
          githubId: profile.id,
          name: profile.displayName || profile.username,
          email: email || `${profile.username}@github.com`,
          username: profile.username
        });

        await newUser.save();
        console.log('New user created:', newUser.email);
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
// Authentication Middleware (EXPORTED)
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

const requireProviderOrAdmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'provider' || req.user.role === 'admin')) {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'Provider or admin access required.'
  });
};

// Export for use in routes
app.requireAuth = requireAuth;
app.requireAdmin = requireAdmin;
app.requireProviderOrAdmin = requireProviderOrAdmin;

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
// Swagger Documentation
// ========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Reservations API - Stay & Go (GitHub OAuth)'
}));

// ========================
// Web Test Panel
// ========================
app.get('/panel', (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const user = req.user || {};
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Reservations API Test Panel</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .container { max-width: 800px; margin: 0 auto; }
      .auth-status { padding: 20px; border-radius: 5px; margin-bottom: 20px; }
      .authenticated { background-color: #d4edda; color: #155724; }
      .not-authenticated { background-color: #f8d7da; color: #721c24; }
      .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
      button { padding: 10px 15px; margin: 5px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Reservations API - Test Panel</h1>
      
      <div class="auth-status ${isAuthenticated ? 'authenticated' : 'not-authenticated'}">
        <h2>Authentication Status: ${isAuthenticated ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}</h2>
        ${isAuthenticated ? `
          <p>Welcome, <strong>${user.name}</strong>!</p>
          <p>Email: ${user.email}</p>
          <p>Role: ${user.role}</p>
          <button onclick="window.location.href='/auth/logout'">Logout</button>
        ` : `
          <p>You need to log in with GitHub to use the API.</p>
          <button onclick="window.location.href='/auth/github'">Login with GitHub</button>
        `}
      </div>
      
      <h2>API Endpoints</h2>
      
      <div class="endpoint">
        <h3>📚 Documentation</h3>
        <button onclick="window.location.href='/api-docs'">Open Swagger Docs</button>
      </div>
      
      <div class="endpoint">
        <h3>👤 User Management (Admin Only)</h3>
        <button onclick="fetchData('/api/users')">Get All Users</button>
      </div>
      
      <div class="endpoint">
        <h3>🏨 Properties</h3>
        <button onclick="fetchData('/api/properties')">Get Properties</button>
        <button onclick="fetchData('/api/properties?city=Miami')">Properties in Miami</button>
      </div>
      
      <div class="endpoint">
        <h3>📅 Reservations ${isAuthenticated ? '' : '(Login Required)'}</h3>
        <button onclick="fetchData('/api/reservations')" ${!isAuthenticated ? 'disabled' : ''}>My Reservations</button>
        <button onclick="createReservation()" ${!isAuthenticated ? 'disabled' : ''}>Create Reservation</button>
      </div>
      
      <div class="endpoint">
        <h3>🚗 Vehicles</h3>
        <button onclick="fetchData('/api/vehicles')">Get All Vehicles</button>
        <button onclick="fetchData('/api/vehicles?type=sedan')">Sedan Vehicles</button>
      </div>
      
      <div class="endpoint">
        <h3>System Status</h3>
        <button onclick="fetchData('/health')">Health Check</button>
        <button onclick="fetchData('/api/me')">My Profile</button>
      </div>
      
      <div id="result" style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; display: none;">
        <h3>Response:</h3>
        <pre id="response"></pre>
      </div>
    </div>
    
    <script>
      async function fetchData(url) {
        try {
          const response = await fetch(url, {
            credentials: 'include'
          });
          const data = await response.json();
          showResult(data);
        } catch (error) {
          showResult({ error: error.message });
        }
      }
      
      async function createReservation() {
        const reservationData = {
          propertyId: "650a1b2c3d4e5f0012345679",
          roomId: "BEACH001",
          startDate: "2023-12-01",
          endDate: "2023-12-05",
          numGuests: 2,
          totalAmount: 799.96
        };
        
        try {
          const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservationData),
            credentials: 'include'
          });
          const data = await response.json();
          showResult(data);
        } catch (error) {
          showResult({ error: error.message });
        }
      }
      
      function showResult(data) {
        document.getElementById('response').textContent = JSON.stringify(data, null, 2);
        document.getElementById('result').style.display = 'block';
      }
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
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
    authentication: 'GitHub OAuth (Session-based only)',
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
    authentication: 'GitHub OAuth (Session-based only) - NO JWT',
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
    console.log(`🔐 Authentication: GitHub OAuth (Session-based only)`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔑 GitHub Login: http://localhost:${PORT}/auth/github`);
    console.log(`🔧 Test Panel: http://localhost:${PORT}/panel`);
  });
}

module.exports = app;