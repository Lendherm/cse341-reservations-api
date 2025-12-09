// tests/vehicles.test.js - Tests para vehículos (rutas públicas)
const request = require('supertest');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// Importar la app de testing
const app = require('../server.test');

describe('Vehicles Collection - GET Endpoints', () => {
  let testUser;
  let testVehicle;

  beforeEach(async () => {
    // Clear data and create fresh for each test
    await Vehicle.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      name: 'Vehicle Provider',
      email: 'provider@test.com',
      role: 'provider'
    });

    testVehicle = await Vehicle.create({
      providerId: testUser._id,
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      type: 'sedan',
      seats: 5,
      pricePerDay: 49.99,
      location: {
        city: 'Test City'
      },
      licensePlate: 'TEST001',
      isAvailable: true
    });
  });

  afterAll(async () => {
    await Vehicle.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/vehicles', () => {
    it('should return all vehicles', async () => {
      // Create more vehicles
      await Vehicle.create([
        {
          providerId: testUser._id,
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          type: 'economy',
          seats: 5,
          pricePerDay: 39.99,
          location: { city: 'Test City' },
          licensePlate: 'TEST002',
          isAvailable: true
        },
        {
          providerId: testUser._id,
          make: 'Ford',
          model: 'Explorer',
          year: 2023,
          type: 'suv',
          seats: 7,
          pricePerDay: 79.99,
          location: { city: 'Other City' },
          licensePlate: 'TEST003',
          isAvailable: false
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter vehicles by type', async () => {
      // Create another vehicle of different type
      await Vehicle.create({
        providerId: testUser._id,
        make: 'Ford',
        model: 'Explorer',
        year: 2023,
        type: 'suv',
        seats: 7,
        pricePerDay: 79.99,
        location: { city: 'Test City' },
        licensePlate: 'TEST002',
        isAvailable: true
      });

      const response = await request(app)
        .get('/api/vehicles?type=sedan')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('sedan');
      expect(response.body.data[0].make).toBe('Toyota');
    });

    it('should filter vehicles by city', async () => {
      await Vehicle.create({
        providerId: testUser._id,
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        type: 'economy',
        seats: 5,
        pricePerDay: 39.99,
        location: { city: 'Other City' },
        licensePlate: 'TEST002',
        isAvailable: true
      });

      const response = await request(app)
        .get('/api/vehicles?city=Test City')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].location.city).toBe('Test City');
    });

    it('should filter vehicles by availability', async () => {
      await Vehicle.create({
        providerId: testUser._id,
        make: 'Ford',
        model: 'Explorer',
        year: 2023,
        type: 'suv',
        seats: 7,
        pricePerDay: 79.99,
        location: { city: 'Test City' },
        licensePlate: 'TEST002',
        isAvailable: false
      });

      const response = await request(app)
        .get('/api/vehicles?available=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isAvailable).toBe(true);
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/vehicles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/vehicles/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Vehicle not found');
    });

    it('should return vehicle details for valid ID', async () => {
      const response = await request(app)
        .get(`/api/vehicles/${testVehicle._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(testVehicle._id.toString());
      expect(response.body.data.make).toBe('Toyota');
      expect(response.body.data.model).toBe('Camry');
      expect(response.body.data.type).toBe('sedan');
    });
  });
});