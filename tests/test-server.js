// tests/test-server.js - Simplified test server without complex mocking
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');

// Load env variables
dotenv.config();

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(express.json());

// Simple CORS for testing
app.use(cors({
  origin: '*',
  credentials: true
}));

// ========================
// SIMPLE SESSION CONFIGURATION
// ========================
app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new session.MemoryStore(),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ========================
// TEST AUTHENTICATION MIDDLEWARE
// ========================
app.use((req, res, next) => {
  // Check for test headers
  if (req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user']);
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
// SIMPLE MOCKED MIDDLEWARES
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

const mockRequireProviderOrAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && 
      (req.user.role === 'provider' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Provider or admin access required'
  });
};

// ========================
// SIMPLE CONTROLLER MOCKS FOR TESTING
// ========================

// Mock users controller
const mockUsersController = {
  getUsers: (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Return dummy data
    return res.json({
      success: true,
      data: [
        { _id: '1', name: 'User 1', email: 'user1@test.com', role: 'user' },
        { _id: '2', name: 'User 2', email: 'user2@test.com', role: 'admin' }
      ]
    });
  },

  getUserById: (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
    
    return res.json({
      success: true,
      data: { _id: id, name: 'Test User', email: 'test@test.com', role: 'user' }
    });
  }
};

// Mock properties controller
const mockPropertiesController = {
  getProperties: (req, res) => {
    const { city } = req.query;
    const properties = [
      {
        _id: 'property1',
        name: 'Test Property',
        description: 'Test description',
        address: { city: 'Test City', country: 'Test Country' },
        isActive: true
      },
      {
        _id: 'property2',
        name: 'Other Property',
        description: 'Other description',
        address: { city: 'Other City', country: 'Test Country' },
        isActive: true
      }
    ];

    let filtered = properties.filter(p => p.isActive);
    
    if (city) {
      filtered = filtered.filter(p => p.address.city === city);
    }

    return res.json({
      success: true,
      data: filtered,
      pagination: { page: 1, limit: 10, total: filtered.length }
    });
  },

  getPropertyById: (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id) && id !== 'property1' && id !== 'property2') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    if (id === 'inactive') {
      return res.status(404).json({
        success: false,
        message: 'Property is not active'
      });
    }

    return res.json({
      success: true,
      data: {
        _id: id,
        name: 'Test Property',
        description: 'Test description',
        address: { city: 'Test City', country: 'Test Country' },
        isActive: true,
        rooms: [{ roomId: 'TEST001', type: 'double', capacity: 2, pricePerNight: 100 }]
      }
    });
  }
};

// Mock reservations controller
const mockReservationsController = {
  getReservations: async (req, res) => {
    try {
      const { status } = req.query;
      const Reservation = require('../models/Reservation');
      
      let query = {};
      
      // Non-admin users can only see their own reservations
      if (req.user.role !== 'admin') {
        query.userId = req.user._id;
      }
      
      if (status) {
        query.status = status;
      }
      
      const reservations = await Reservation.find(query)
        .sort({ startDate: -1 })
        .populate('propertyId', 'name address')
        .populate('userId', 'name email');
      
      return res.json({
        success: true,
        data: reservations,
        pagination: { page: 1, limit: 10, total: reservations.length }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error fetching reservations'
      });
    }
  },

  getReservationById: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      }
      
      const Reservation = require('../models/Reservation');
      const reservation = await Reservation.findById(id)
        .populate('propertyId', 'name address')
        .populate('userId', 'name email');
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }
      
      // Check authorization
      const isOwner = reservation.userId._id.toString() === req.user._id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this reservation'
        });
      }
      
      return res.json({
        success: true,
        data: reservation
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error fetching reservation'
      });
    }
  },

  createReservation: async (req, res) => {
    try {
      const Reservation = require('../models/Reservation');
      const Property = require('../models/Property');
      
      const reservationData = {
        ...req.body,
        userId: req.user._id,
        status: 'pending'
      };
      
      // Check for date conflicts
      const existingReservation = await Reservation.findOne({
        propertyId: reservationData.propertyId,
        roomId: reservationData.roomId,
        $or: [
          {
            startDate: { $lt: new Date(reservationData.endDate) },
            endDate: { $gt: new Date(reservationData.startDate) }
          }
        ]
      });
      
      if (existingReservation) {
        return res.status(409).json({
          success: false,
          message: 'Room is already reserved for the selected dates'
        });
      }
      
      const reservation = await Reservation.create(reservationData);
      
      return res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Create reservation error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Server error creating reservation'
      });
    }
  },

  updateReservation: async (req, res) => {
    try {
      const { id } = req.params;
      const Reservation = require('../models/Reservation');
      
      const reservation = await Reservation.findById(id);
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Reservation not found'
        });
      }
      
      // Check authorization
      const isOwner = reservation.userId.toString() === req.user._id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this reservation'
        });
      }
      
      // Update reservation
      Object.keys(req.body).forEach(key => {
        reservation[key] = req.body[key];
      });
      
      await reservation.save();
      
      return res.json({
        success: true,
        message: 'Reservation updated successfully',
        data: reservation
      });
    } catch (error) {
      console.error('Update reservation error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}`
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Server error updating reservation'
      });
    }
  }
};

// Mock vehicles controller
const mockVehiclesController = {
  getVehicles: (req, res) => {
    const { type, city, available } = req.query;
    
    const vehicles = [
      {
        _id: 'vehicle1',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        type: 'sedan',
        seats: 5,
        pricePerDay: 49.99,
        location: { city: 'Test City' },
        isAvailable: true
      },
      {
        _id: 'vehicle2',
        make: 'Ford',
        model: 'Explorer',
        year: 2023,
        type: 'suv',
        seats: 7,
        pricePerDay: 79.99,
        location: { city: 'Other City' },
        isAvailable: false
      },
      {
        _id: 'vehicle3',
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        type: 'economy',
        seats: 5,
        pricePerDay: 39.99,
        location: { city: 'Test City' },
        isAvailable: true
      }
    ];
    
    let filtered = vehicles;
    
    if (type) {
      filtered = filtered.filter(v => v.type === type);
    }
    
    if (city) {
      filtered = filtered.filter(v => v.location.city === city);
    }
    
    if (available === 'true') {
      filtered = filtered.filter(v => v.isAvailable);
    } else if (available === 'false') {
      filtered = filtered.filter(v => !v.isAvailable);
    }
    
    return res.json({
      success: true,
      data: filtered,
      pagination: { page: 1, limit: 10, total: filtered.length }
    });
  },

  getVehicleById: (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id) && 
        id !== 'vehicle1' && id !== 'vehicle2' && id !== 'vehicle3') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
    
    const vehicle = {
      _id: id,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      type: 'sedan',
      seats: 5,
      pricePerDay: 49.99,
      location: { city: 'Test City' },
      isAvailable: true,
      licensePlate: 'TEST001'
    };
    
    return res.json({
      success: true,
      data: vehicle
    });
  }
};

// ========================
// ROUTES
// ========================

// Users routes
app.get('/api/users', mockRequireAuth, mockRequireAdmin, mockUsersController.getUsers);
app.get('/api/users/:id', mockRequireAuth, mockUsersController.getUserById);

// Properties routes (public)
app.get('/api/properties', mockPropertiesController.getProperties);
app.get('/api/properties/:id', mockPropertiesController.getPropertyById);

// Reservations routes (protected)
app.get('/api/reservations', mockRequireAuth, mockReservationsController.getReservations);
app.get('/api/reservations/:id', mockRequireAuth, mockReservationsController.getReservationById);
app.post('/api/reservations', mockRequireAuth, mockReservationsController.createReservation);
app.put('/api/reservations/:id', mockRequireAuth, mockReservationsController.updateReservation);

// Vehicles routes (public)
app.get('/api/vehicles', mockVehiclesController.getVehicles);
app.get('/api/vehicles/:id', mockVehiclesController.getVehicleById);

// ========================
// BASIC ROUTES
// ========================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Test API Server',
    authenticated: req.isAuthenticated()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// ========================
// ERROR HANDLING
// ========================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;