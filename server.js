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
    
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

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
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
  },
  proxy: process.env.NODE_ENV === 'production' // Important for Render
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// ========================
// Database Connection
// ========================
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
  process.exit(1);
});

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
  const githubCallbackURL = process.env.NODE_ENV === 'production'
    ? `${process.env.RENDER_EXTERNAL_URL || 'https://cse341-reservations-api.onrender.com'}/auth/github/callback`
    : 'http://localhost:8080/auth/github/callback';

  console.log('GitHub Callback URL:', githubCallbackURL);

  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: githubCallbackURL,
      scope: ['user:email'],
      proxy: process.env.NODE_ENV === 'production'
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
            user.username = profile.username;
            user.avatar = profile.photos?.[0]?.value || '';
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const newUser = new User({
          githubId: profile.id,
          name: profile.displayName || profile.username,
          email: email || `${profile.username}@github.com`,
          username: profile.username,
          avatar: profile.photos?.[0]?.value || ''
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

const isOwnerOrAdmin = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Para rutas con :id (propietario del recurso)
    const resourceId = req.params.id;
    
    // Si hay resourceId, necesitamos verificar si el usuario es el dueño
    // Esta lógica se completará en los controladores específicos
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource.'
  });
};

// Export middleware for use in routes
app.requireAuth = requireAuth;
app.requireAdmin = requireAdmin;
app.requireProviderOrAdmin = requireProviderOrAdmin;
app.isOwnerOrAdmin = isOwnerOrAdmin;

// ========================
// OAuth Routes
// ========================
app.get('/auth/github',
  passport.authenticate('github', { 
    scope: ['user:email'],
    failureRedirect: '/'
  })
);

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/',
    session: true
  }),
  (req, res) => {
    console.log('✅ GitHub authentication successful for:', req.user.email);
    // Redirigir al panel o a la página principal
    res.redirect('/api/me');
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
        githubId: req.user.githubId,
        username: req.user.username,
        avatar: req.user.avatar
      }
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Not authenticated. Please log in with GitHub.',
      loginUrl: '/auth/github'
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
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        margin: 0; 
        padding: 20px; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }
      .container { 
        max-width: 1000px; 
        margin: 0 auto; 
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      h1 { 
        color: #333; 
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 15px;
      }
      .auth-status { 
        padding: 25px; 
        border-radius: 10px; 
        margin-bottom: 30px; 
        text-align: center;
        border: 2px solid transparent;
      }
      .authenticated { 
        background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
        color: #155724; 
        border-color: #c3e6cb;
      }
      .not-authenticated { 
        background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); 
        color: #721c24; 
        border-color: #f5c6cb;
      }
      .endpoint { 
        background: #f8f9fa; 
        padding: 20px; 
        margin: 15px 0; 
        border-radius: 8px;
        border-left: 4px solid #667eea;
        transition: transform 0.2s;
      }
      .endpoint:hover {
        transform: translateX(5px);
      }
      h3 { margin-top: 0; color: #495057; }
      button { 
        padding: 12px 20px; 
        margin: 8px; 
        cursor: pointer; 
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        transition: all 0.3s;
        font-size: 14px;
      }
      button:hover {
        background: #5a67d8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      button:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      #result {
        margin-top: 30px; 
        padding: 20px; 
        background: #e9ecef; 
        border-radius: 8px; 
        display: none;
        border: 1px solid #dee2e6;
      }
      pre {
        background: white;
        padding: 15px;
        border-radius: 6px;
        overflow: auto;
        max-height: 400px;
        font-size: 13px;
        border: 1px solid #ddd;
      }
      .user-info {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin-bottom: 15px;
      }
      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Reservations API - Test Panel</h1>
      
      <div class="auth-status ${isAuthenticated ? 'authenticated' : 'not-authenticated'}">
        <h2>Authentication Status: ${isAuthenticated ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}</h2>
        ${isAuthenticated ? `
          <div class="user-info">
            ${user.avatar ? `<img src="${user.avatar}" class="avatar" alt="${user.name}">` : ''}
            <div>
              <p>Welcome, <strong>${user.name}</strong>!</p>
              <p>Email: ${user.email}</p>
              <p>Role: ${user.role}</p>
              <p>GitHub: ${user.username}</p>
            </div>
          </div>
          <button onclick="window.location.href='/auth/logout'">🚪 Logout</button>
        ` : `
          <p>You need to log in with GitHub to use the protected API endpoints.</p>
          <button onclick="window.location.href='/auth/github'">🔑 Login with GitHub</button>
        `}
      </div>
      
      <h2>📡 API Endpoints</h2>
      
      <div class="endpoint">
        <h3>📚 Documentation</h3>
        <button onclick="window.location.href='/api-docs'">📖 Open Swagger Docs</button>
      </div>
      
      <div class="endpoint">
        <h3>👤 User Management (Admin Only)</h3>
        <button onclick="fetchData('/api/users')">Get All Users</button>
      </div>
      
      <div class="endpoint">
        <h3>🏨 Properties</h3>
        <button onclick="fetchData('/api/properties')">Get Properties</button>
        <button onclick="fetchData('/api/properties?city=Miami')">Properties in Miami</button>
        <button onclick="fetchData('/api/properties?minPrice=50&maxPrice=200')">Properties $50-$200</button>
      </div>
      
      <div class="endpoint">
        <h3>📅 Reservations ${isAuthenticated ? '' : '(Login Required)'}</h3>
        <button onclick="fetchData('/api/reservations')" ${!isAuthenticated ? 'disabled' : ''}>My Reservations</button>
        <button onclick="createReservation()" ${!isAuthenticated ? 'disabled' : ''}>Create Reservation</button>
        <button onclick="updateReservation()" ${!isAuthenticated ? 'disabled' : ''}>Update Reservation</button>
      </div>
      
      <div class="endpoint">
        <h3>🚗 Vehicles</h3>
        <button onclick="fetchData('/api/vehicles')">Get All Vehicles</button>
        <button onclick="fetchData('/api/vehicles?type=sedan')">Sedan Vehicles</button>
        <button onclick="fetchData('/api/vehicles?available=true&city=New+York')">Available in NYC</button>
      </div>
      
      <div class="endpoint">
        <h3>⚙️ System Status</h3>
        <button onclick="fetchData('/health')">🩺 Health Check</button>
        <button onclick="fetchData('/api/me')">👤 My Profile</button>
        <button onclick="fetchData('/auth/status')">🔐 Auth Status</button>
      </div>
      
      <div id="result">
        <h3>📄 Response:</h3>
        <pre id="response"></pre>
        <button onclick="document.getElementById('result').style.display='none'">✖️ Close</button>
      </div>
    </div>
    
    <script>
      async function fetchData(url) {
        try {
          showLoading();
          const response = await fetch(url, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          const data = await response.json();
          showResult(data);
        } catch (error) {
          showResult({ 
            error: error.message,
            note: 'Make sure you are logged in for protected endpoints'
          });
        }
      }
      
      async function createReservation() {
        const reservationData = {
          propertyId: "650a1b2c3d4e5f0012345679",
          roomId: "BEACH001",
          startDate: "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
          endDate: "${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
          numGuests: 2,
          totalAmount: 399.99,
          specialRequests: "Early check-in please"
        };
        
        try {
          showLoading();
          const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(reservationData),
            credentials: 'include'
          });
          const data = await response.json();
          showResult(data);
        } catch (error) {
          showResult({ error: error.message });
        }
      }
      
      async function updateReservation() {
        const updateData = {
          status: "confirmed",
          specialRequests: "Updated request: Need extra towels"
        };
        
        try {
          showLoading();
          const response = await fetch('/api/reservations/650a1b2c3d4e5f0012345678', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(updateData),
            credentials: 'include'
          });
          const data = await response.json();
          showResult(data);
        } catch (error) {
          showResult({ error: error.message });
        }
      }
      
      function showLoading() {
        document.getElementById('response').textContent = 'Loading...';
        document.getElementById('result').style.display = 'block';
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
    environment: process.env.NODE_ENV || 'development',
    authentication: 'GitHub OAuth (Session-based only)',
    database: dbStatus,
    session: req.isAuthenticated() ? 'Active' : 'Not active',
    endpoints: {
      login: '/auth/github',
      logout: '/auth/logout',
      current_user: '/api/me',
      docs: '/api-docs',
      panel: '/panel',
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles'
    }
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Reservations API - Stay & Go',
    version: '2.0.0',
    authentication: 'GitHub OAuth (Session-based only)',
    description: 'Complete API for hotel and transportation reservations',
    documentation: '/api-docs',
    test_panel: '/panel',
    login: '/auth/github',
    endpoints: {
      auth: {
        login: '/auth/github',
        logout: '/auth/logout',
        current_user: '/api/me'
      },
      users: '/api/users',
      properties: '/api/properties',
      reservations: '/api/reservations',
      vehicles: '/api/vehicles',
      health: '/health'
    },
    note: 'Use /auth/github to authenticate, then access protected endpoints'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    available_routes: {
      home: '/',
      docs: '/api-docs',
      panel: '/panel',
      login: '/auth/github',
      logout: '/auth/logout',
      me: '/api/me',
      health: '/health'
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
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Authentication: GitHub OAuth (Session-based only)`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔑 GitHub Login: http://localhost:${PORT}/auth/github`);
  console.log(`🔧 Test Panel: http://localhost:${PORT}/panel`);
  
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn('⚠️ WARNING: GitHub OAuth credentials not configured');
    console.warn('   Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables');
  }
});

module.exports = app;