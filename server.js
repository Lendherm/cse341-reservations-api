const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const MongoStore = require('connect-mongo');

dotenv.config();

const app = express();

// ========================
// CONFIGURACIÓN DINÁMICA DE ENTORNO
// ========================
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_URL = 'http://localhost:8080';
const PRODUCTION_URL = 'https://cse341-reservations-api.onrender.com';
const CURRENT_URL = isProduction ? PRODUCTION_URL : LOCAL_URL;

console.log('\n=== 🌍 CONFIGURACIÓN DE ENTORNO ===');
console.log('URL Actual:', CURRENT_URL);
console.log('Es producción:', isProduction);
console.log('====================================\n');

// Trust proxy CRÍTICO para Render
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy habilitado para producción');
}

// ========================
// MIDDLEWARE
// ========================
app.use(express.json());

// CORS CONFIGURADO COMO EL PROYECTO DE LIBROS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://cse341-reservations-api.onrender.com',
      'https://cse341-code-student.onrender.com',
      'http://localhost:8080',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ========================
// SESSION CONFIGURATION - SOLUCIÓN DEFINITIVA
// ========================
app.use(session({
  secret: process.env.SESSION_SECRET || 'cse341-reservations-api-development-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 horas
  }),
  cookie: {
    secure: isProduction,              // HTTPS solo en producción
    httpOnly: true,                    // No accesible desde JavaScript
    maxAge: 24 * 60 * 60 * 1000,       // 24 horas
    sameSite: isProduction ? 'none' : 'lax'  // CRÍTICO para cross-site
  },
  proxy: isProduction                  // CRÍTICO para Render
}));

console.log('✅ Configuración de sesión con MongoDB Store inicializada');

// ========================
// PASSPORT CONFIGURATION
// ========================
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/User');

// GitHub OAuth Strategy - MEJORADA
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || `${CURRENT_URL}/auth/github/callback`,
  scope: ['user:email'],
  proxy: isProduction
},
async function(accessToken, refreshToken, profile, done) {
  try {
    console.log('\n=== 🔐 CALLBACK GITHUB EJECUTADO ===');
    console.log('   GitHub ID:', profile.id);
    console.log('   Username:', profile.username);
    
    // 1. Buscar por GitHub ID primero
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      console.log('✅ Usuario encontrado por GitHub ID:', user.email);
      return done(null, user);
    }

    // 2. Buscar por email
    let userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (!userEmail) {
      userEmail = `${profile.username}@users.noreply.github.com`;
      console.log('   Email generado:', userEmail);
    }

    if (userEmail) {
      user = await User.findOne({ email: userEmail.toLowerCase() });
      
      if (user) {
        console.log('✅ Usuario encontrado por email:', user.email);
        // Actualizar con datos de GitHub
        user.githubId = profile.id;
        user.username = profile.username;
        user.avatar = profile.photos?.[0]?.value || '';
        await user.save();
        return done(null, user);
      }
    }

    // 3. Crear nuevo usuario
    const newUser = new User({
      githubId: profile.id,
      name: profile.displayName || profile.username,
      email: userEmail.toLowerCase(),
      username: profile.username,
      avatar: profile.photos?.[0]?.value || '',
      role: 'user' // Rol por defecto
    });

    await newUser.save();
    console.log('✅ Nuevo usuario creado:', newUser.email);
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Error en estrategia GitHub:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  console.log('💾 Serializando usuario:', user.email);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('📂 Deserializando usuario ID:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('❌ Error deserializando usuario:', error);
    done(error, null);
  }
});

// ========================
// MIDDLEWARE DE LOGS PARA DEBUG
// ========================
app.use((req, res, next) => {
  console.log(`\n=== 📨 ${req.method} ${req.url} ===`);
  console.log('   Origin:', req.headers.origin || 'No origin');
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   Cookies:', req.headers.cookie ? 'Present' : 'Missing');
  console.log('   User:', req.user ? req.user.email : 'No user');
  next();
});

// ========================
// RUTAS BÁSICAS
// ========================
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      message: `Welcome ${req.user.name}!`,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      logoutUrl: '/auth/logout',
      apiDocs: '/api-docs',
      authenticated: true
    });
  } else {
    res.json({
      success: true,
      message: 'Welcome to Reservations API!',
      loginUrl: '/auth/github',
      apiDocs: '/api-docs',
      authenticated: false
    });
  }
});

app.get('/login', (req, res) => {
  res.redirect('/auth/github');
});

// ========================
// RUTAS DE AUTHENTICACIÓN
// ========================
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/?error=auth_failed'
  }),
  (req, res) => {
    console.log('\n=== ✅ LOGIN EXITOSO - Redirigiendo ===');
    console.log('   User:', req.user.email);
    console.log('   Session ID:', req.sessionID);
    
    // Forzar guardado de sesión en MongoDB
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
      } else {
        console.log('✅ Sesión guardada en MongoDB');
      }
      res.redirect('/api/me');
    });
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false,
        message: 'Error al cerrar sesión' 
      });
    }
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

// ========================
// RUTA DE DIAGNÓSTICO MEJORADA
// ========================
app.get('/auth/debug', (req, res) => {
  console.log('\n=== 🐛 DIAGNÓSTICO SESIÓN ===');
  console.log('   Session ID:', req.sessionID);
  console.log('   Authenticated:', req.isAuthenticated());
  console.log('   User:', req.user);
  console.log('   Cookies recibidas:', req.headers.cookie || 'None');
  console.log('   Environment:', isProduction ? 'production' : 'development');
  
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    user: req.user,
    sessionId: req.sessionID,
    cookiesReceived: req.headers.cookie || 'None',
    environment: isProduction ? 'production' : 'development',
    sessionStore: 'MongoDB',
    isProduction: isProduction,
    cookieConfig: {
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      httpOnly: true
    }
  });
});

// ========================
// CURRENT USER ROUTE (API/ME)
// ========================
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
// HEALTH CHECK
// ========================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    authenticated: req.isAuthenticated(),
    sessionId: req.sessionID,
    sessionStore: 'MongoDB',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ========================
// IMPORTAR RUTAS
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
// SWAGGER DOCUMENTATION
// ========================
const { specs, swaggerUi } = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customSiteTitle: 'Reservations API - Stay & Go (GitHub OAuth)'
}));

// ========================
// TEST PANEL WEB
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
      .info-box {
        background: #e9ecef;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Reservations API - Test Panel</h1>
      
      <div class="info-box">
        <strong>Server URL:</strong> ${CURRENT_URL}<br>
        <strong>Environment:</strong> ${isProduction ? 'Production' : 'Development'}<br>
        <strong>Session Store:</strong> MongoDB<br>
        <strong>GitHub Callback:</strong> ${CURRENT_URL}/auth/github/callback
      </div>
      
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
          <button onclick="window.location.href='/api/me'">👤 Check Session</button>
        ` : `
          <p>You need to log in with GitHub to use the protected API endpoints.</p>
          <button onclick="window.location.href='/auth/github'">🔑 Login with GitHub</button>
          <button onclick="window.location.href='/auth/debug'">🐛 Debug Session</button>
        `}
      </div>
      
      <h2>📡 API Endpoints</h2>
      
      <div class="endpoint">
        <h3>📚 Documentation</h3>
        <button onclick="window.location.href='/api-docs'">📖 Open Swagger Docs</button>
        <button onclick="window.location.href='${CURRENT_URL}/api-docs'">🌐 Open in New Tab</button>
      </div>
      
      <div class="endpoint">
        <h3>👤 User Management (Admin Only)</h3>
        <button onclick="fetchData('/api/users')">Get All Users</button>
        <button onclick="fetchData('/api/me')">Get My Profile</button>
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
        <button onclick="fetchData('/auth/debug')">🔐 Auth Debug</button>
        <button onclick="testCookie()">🍪 Test Cookie</button>
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
      
      async function testCookie() {
        try {
          showLoading();
          const response = await fetch('/auth/debug', {
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
            note: 'Check if cookies are enabled and sameSite is configured correctly'
          });
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
// 404 HANDLER
// ========================
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
      debug: '/auth/debug',
      health: '/health'
    }
  });
});

// ========================
// ERROR HANDLER
// ========================
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ========================
// DATABASE CONNECTION
// ========================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    console.log('   Base de datos:', mongoose.connection.db?.databaseName);
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err);
    process.exit(1);
  });

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== 🚀 SERVIDOR INICIADO CON MONGODB STORE ===');
  console.log('   URL:', CURRENT_URL);
  console.log('   Login:', `${CURRENT_URL}/auth/github`);
  console.log('   Diagnóstico:', `${CURRENT_URL}/auth/debug`);
  console.log('   My Profile:', `${CURRENT_URL}/api/me`);
  console.log('   Swagger Docs:', `${CURRENT_URL}/api-docs`);
  console.log('   Test Panel:', `${CURRENT_URL}/panel`);
  console.log('   Session Store: MongoDB (Solución definitiva)');
  console.log('   Cookie Settings:');
  console.log('     - secure:', isProduction);
  console.log('     - sameSite:', isProduction ? 'none' : 'lax');
  console.log('     - httpOnly: true');
  console.log('================================\n');
});

module.exports = app;