const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

describe('Vehicle API Endpoints', () => {
  let testProvider;

  //beforeAll(async () => {
    //await mongoose.connect(process.env.MONGODB_URI_TEST, {
      //useNewUrlParser: true,
      //useUnifiedTopology: true,
    //});
  //});
//
  //afterAll(async () => {
    //await mongoose.connection.close();
  //});

  beforeEach(async () => {
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    
    // Create test provider
    testProvider = await User.create({
      name: 'Vehicle Provider',
      email: 'provider@test.com',
      passwordHash: 'password123',
      role: 'provider'
    });
  });

  describe('GET /api/vehicles', () => {
    it('should return all vehicles', async () => {
      // Create test vehicles
      await Vehicle.create([
        {
          providerId: testProvider._id,
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          type: 'sedan',
          seats: 5,
          pricePerDay: 49.99,
          licensePlate: 'ABC123',
          location: { city: 'Miami' }
        },
        {
          providerId: testProvider._id,
          make: 'Ford',
          model: 'Explorer',
          year: 2021,
          type: 'suv',
          seats: 7,
          pricePerDay: 79.99,
          licensePlate: 'XYZ789',
          location: { city: 'Orlando' }
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('make');
      expect(response.body.data[0]).toHaveProperty('model');
    });

    it('should filter vehicles by type', async () => {
      await Vehicle.create([
        {
          providerId: testProvider._id,
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          type: 'sedan',
          seats: 5,
          pricePerDay: 49.99,
          licensePlate: 'ABC123',
          location: { city: 'Miami' }
        },
        {
          providerId: testProvider._id,
          make: 'Ford',
          model: 'Explorer',
          year: 2021,
          type: 'suv',
          seats: 7,
          pricePerDay: 79.99,
          licensePlate: 'XYZ789',
          location: { city: 'Miami' }
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles?type=sedan')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('sedan');
    });

    it('should filter vehicles by city', async () => {
      await Vehicle.create([
        {
          providerId: testProvider._id,
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          type: 'sedan',
          seats: 5,
          pricePerDay: 49.99,
          licensePlate: 'ABC123',
          location: { city: 'Miami' }
        },
        {
          providerId: testProvider._id,
          make: 'Ford',
          model: 'Explorer',
          year: 2021,
          type: 'suv',
          seats: 7,
          pricePerDay: 79.99,
          licensePlate: 'XYZ789',
          location: { city: 'Orlando' }
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles?city=Miami')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].location.city).toBe('Miami');
    });

    it('should filter vehicles by price range', async () => {
      await Vehicle.create([
        {
          providerId: testProvider._id,
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          type: 'sedan',
          seats: 5,
          pricePerDay: 49.99,
          licensePlate: 'ABC123',
          location: { city: 'Miami' }
        },
        {
          providerId: testProvider._id,
          make: 'Mercedes',
          model: 'S-Class',
          year: 2023,
          type: 'luxury',
          seats: 5,
          pricePerDay: 199.99,
          licensePlate: 'LUX456',
          location: { city: 'Miami' }
        }
      ]);

      const response = await request(app)
        .get('/api/vehicles?maxPrice=100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].pricePerDay).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/vehicles/:id', () => {
    it('should return a single vehicle by ID', async () => {
      const vehicle = await Vehicle.create({
        providerId: testProvider._id,
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        type: 'sedan',
        seats: 5,
        pricePerDay: 49.99,
        licensePlate: 'ABC123',
        location: { city: 'Miami' }
      });

      const response = await request(app)
        .get(`/api/vehicles/${vehicle._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(vehicle._id.toString());
      expect(response.body.data.make).toBe('Toyota');
      expect(response.body.data.model).toBe('Camry');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/vehicles/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/vehicles/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});