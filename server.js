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

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this-in-production',
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

// Current user route (para API)
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      authenticated: true,
      user: req.user.getPublicProfile()
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Not authenticated. Please log in with GitHub.'
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
app.use('/api/auth', authRoutes);

// ========================
// Authentication Middleware Example
// ========================
app.get('/api/protected', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in with GitHub.'
    });
  }
  
  res.json({
    success: true,
    message: 'You have accessed a protected route!',
    user: req.user.getPublicProfile()
  });
});

app.get('/api/admin-only', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
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
    persistAuthorization: false, // No necesitamos persistir porque usamos sesiones
    tryItOutEnabled: true,
    displayRequestDuration: true
  }
}));

// ========================
// Panel de Pruebas Web
// ========================
app.get('/panel', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Panel de Pruebas - Reservations API</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .card { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .success { background: #d4edda; }
      .error { background: #f8d7da; }
      pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
      button { padding: 10px 15px; margin: 5px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
      button:hover { background: #0056b3; }
      button.secondary { background: #6c757d; }
      button.secondary:hover { background: #545b62; }
      .user-info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
  </head>
  <body>
    <h1>🔧 Panel de Pruebas - Reservations API (GitHub OAuth)</h1>
    
    <div class="card">
      <h2>1. Autenticación con GitHub</h2>
      <button onclick="window.location.href='/auth/github'">🔑 Login with GitHub</button>
      <button onclick="checkAuth()" class="secondary">Verificar Estado</button>
      <button onclick="logout()" class="secondary">Logout</button>
      <div id="authStatus" class="user-info"></div>
    </div>
    
    <div class="card">
      <h2>2. Crear Reserva de Prueba</h2>
      <button onclick="createTestReservation()">Crear Reserva</button>
      <div id="reservationResult"></div>
    </div>
    
    <div class="card">
      <h2>3. Ver Mis Reservas</h2>
      <button onclick="getMyReservations()">Obtener Mis Reservas</button>
      <div id="reservationsList"></div>
    </div>
    
    <div class="card">
      <h2>4. Ver Propiedades Disponibles</h2>
      <button onclick="getProperties()">Obtener Propiedades</button>
      <div id="propertiesList"></div>
    </div>
    
    <script>
      async function checkAuth() {
        try {
          const response = await fetch('/api/me', { credentials: 'include' });
          const data = await response.json();
          
          const statusDiv = document.getElementById('authStatus');
          if (data.authenticated) {
            statusDiv.innerHTML = \`
              <div class="success">
                <p><strong>✅ Autenticado como:</strong> \${data.user.name}</p>
                <p><strong>Email:</strong> \${data.user.email}</p>
                <p><strong>Rol:</strong> \${data.user.role}</p>
                <p><strong>ID:</strong> \${data.user._id}</p>
              </div>
            \`;
          } else {
            statusDiv.innerHTML = \`
              <div class="error">
                <p>❌ No autenticado. <a href="/auth/github">Login with GitHub</a></p>
                <p>\${data.message}</p>
              </div>
            \`;
          }
        } catch (error) {
          document.getElementById('authStatus').innerHTML = \`
            <div class="error">
              <p>❌ Error: \${error.message}</p>
            </div>
          \`;
        }
      }
      
      async function logout() {
        try {
          const response = await fetch('/auth/logout', { credentials: 'include' });
          const data = await response.json();
          
          if (data.success) {
            alert('Logged out successfully');
            checkAuth();
          }
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
      
      async function getProperties() {
        try {
          const response = await fetch('/api/properties', { credentials: 'include' });
          const data = await response.json();
          
          const listDiv = document.getElementById('propertiesList');
          if (data.success && data.data.length > 0) {
            listDiv.innerHTML = \`
              <h3>Propiedades Disponibles (\${data.data.length}):</h3>
              \${data.data.map(prop => \`
                <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0; border-radius: 5px;">
                  <strong>\${prop.name}</strong> (ID: \${prop._id})<br>
                  <small>\${prop.address.city}, \${prop.address.country}</small><br>
                  <small>Habitaciones: \${prop.rooms.length}</small><br>
                  <button onclick="usePropertyForReservation('\${prop._id}', '\${prop.rooms[0]?.roomId || ''}')">
                    Usar para Reserva
                  </button>
                </div>
              \`).join('')}
            \`;
          } else {
            listDiv.innerHTML = '<p>No hay propiedades disponibles.</p>';
          }
        } catch (error) {
          document.getElementById('propertiesList').innerHTML = \`
            <div class="error">
              <p>❌ Error: \${error.message}</p>
            </div>
          \`;
        }
      }
      
      function usePropertyForReservation(propertyId, roomId) {
        sessionStorage.setItem('testPropertyId', propertyId);
        sessionStorage.setItem('testRoomId', roomId);
        alert(\`Property ID \${propertyId} guardado para prueba\`);
      }
      
      async function createTestReservation() {
        // Primero verificar autenticación
        const authResponse = await fetch('/api/me', { credentials: 'include' });
        const authData = await authResponse.json();
        
        if (!authData.authenticated) {
          alert('Por favor, inicia sesión con GitHub primero');
          window.location.href = '/auth/github';
          return;
        }
        
        // Usar propertyId guardado o pedir uno
        let propertyId = sessionStorage.getItem('testPropertyId');
        let roomId = sessionStorage.getItem('testRoomId');
        
        if (!propertyId) {
          propertyId = prompt('Property ID:', '650a1b2c3d4e5f0012345679');
          roomId = prompt('Room ID:', 'BEACH001');
        }
        
        const reservationData = {
          propertyId: propertyId,
          roomId: roomId,
          startDate: prompt('Fecha de inicio (YYYY-MM-DD):', '2024-01-15'),
          endDate: prompt('Fecha de fin (YYYY-MM-DD):', '2024-01-20'),
          numGuests: parseInt(prompt('Número de huéspedes:', '2')),
          totalAmount: parseFloat(prompt('Monto total:', '500.00')),
          specialRequests: prompt('Solicitudes especiales:', 'Reserva de prueba con GitHub OAuth')
        };
        
        try {
          const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include', // IMPORTANTE: envía las cookies de sesión
            body: JSON.stringify(reservationData)
          });
          
          const result = await response.json();
          const resultDiv = document.getElementById('reservationResult');
          
          if (result.success) {
            resultDiv.innerHTML = \`
              <div class="success">
                <p><strong>✅ Reserva creada exitosamente!</strong></p>
                <pre>\${JSON.stringify(result.data, null, 2)}</pre>
              </div>
            \`;
          } else {
            resultDiv.innerHTML = \`
              <div class="error">
                <p><strong>❌ Error:</strong> \${result.message}</p>
                <pre>\${JSON.stringify(result, null, 2)}</pre>
              </div>
            \`;
          }
        } catch (error) {
          document.getElementById('reservationResult').innerHTML = \`
            <div class="error">
              <p>❌ Error: \${error.message}</p>
            </div>
          \`;
        }
      }
      
      async function getMyReservations() {
        try {
          const response = await fetch('/api/reservations', {
            credentials: 'include'
          });
          const data = await response.json();
          
          const listDiv = document.getElementById('reservationsList');
          if (data.success && data.data.length > 0) {
            listDiv.innerHTML = \`
              <h3>Tus Reservas (\${data.data.length}):</h3>
              \${data.data.map(res => \`
                <div style="border-bottom: 1px solid #eee; padding: 10px;">
                  <strong>\${res.propertyId?.name || 'Propiedad'}</strong><br>
                  Habitación: \${res.roomId}<br>
                  Fechas: \${new Date(res.startDate).toLocaleDateString()} a \${new Date(res.endDate).toLocaleDateString()}<br>
                  Estado: \${res.status}<br>
                  Huéspedes: \${res.numGuests}<br>
                  <button onclick="deleteReservation('\${res._id}')">Eliminar</button>
                </div>
              \`).join('')}
            \`;
          } else {
            listDiv.innerHTML = '<p>No tienes reservas.</p>';
          }
        } catch (error) {
          document.getElementById('reservationsList').innerHTML = \`
            <div class="error">
              <p>❌ Error: \${error.message}</p>
            </div>
          \`;
        }
      }
      
      async function deleteReservation(reservationId) {
        if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;
        
        try {
          const response = await fetch(\`/api/reservations/\${reservationId}\`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const data = await response.json();
          if (data.success) {
            alert('Reserva eliminada exitosamente');
            getMyReservations();
          } else {
            alert('Error: ' + data.message);
          }
        } catch (error) {
          alert('Error: ' + error.message);
        }
      }
      
      // Verificar autenticación al cargar la página
      window.onload = checkAuth;
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

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
      auth: '/api/auth/status',
      health: '/health',
      panel: '/panel',
      oauth: {
        login: '/auth/github',
        current: '/api/me',
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
      auth: '/api/auth/status',
      health: '/health',
      panel: '/panel'
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
    console.log(`🔐 Authentication: GitHub OAuth only (no JWT)`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔑 GitHub Login: http://localhost:${PORT}/auth/github`);
    console.log(`🔧 Test Panel: http://localhost:${PORT}/panel`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
} else {
  console.log('🧪 Test mode: Server not started');
}

module.exports = app;