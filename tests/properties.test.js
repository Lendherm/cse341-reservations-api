// tests/properties.test.js - Tests para propiedades (rutas públicas)
const request = require('supertest');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');

// Importar la app de testing
const app = require('../server.test');

describe('Properties Collection - GET Endpoints', () => {
  let testUser;
  let testProperty;

  beforeEach(async () => {
    // Clear data and create fresh for each test
    await Property.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      name: 'Property Owner',
      email: 'owner@test.com',
      role: 'provider'
    });

    testProperty = await Property.create({
      ownerId: testUser._id,
      name: 'Test Property',
      description: 'Test description',
      address: {
        city: 'Test City',
        country: 'Test Country'
      },
      rooms: [
        {
          roomId: 'TEST001',
          type: 'double',
          capacity: 2,
          pricePerNight: 100,
          isAvailable: true
        }
      ],
      isActive: true
    });
  });

  afterAll(async () => {
    await Property.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/properties', () => {
    it('should return all active properties', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Property');
    });

    it('should filter properties by city', async () => {
      // Create another property in a different city
      await Property.create({
        ownerId: testUser._id,
        name: 'Other Property',
        description: 'Other description',
        address: {
          city: 'Other City',
          country: 'Test Country'
        },
        rooms: [
          {
            roomId: 'TEST002',
            type: 'single',
            capacity: 1,
            pricePerNight: 50,
            isAvailable: true
          }
        ],
        isActive: true
      });

      const response = await request(app)
        .get('/api/properties?city=Test City')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Property');
    });

    it('should not return inactive properties', async () => {
      // Create an inactive property
      await Property.create({
        ownerId: testUser._id,
        name: 'Inactive Property',
        description: 'Inactive',
        address: {
          city: 'Test City',
          country: 'Test Country'
        },
        rooms: [
          {
            roomId: 'TEST003',
            type: 'suite',
            capacity: 3,
            pricePerNight: 150,
            isAvailable: true
          }
        ],
        isActive: false
      });

      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // Should only return active properties
      expect(response.body.data[0].name).toBe('Test Property');
    });

    it('should return empty array when no properties match filter', async () => {
      const response = await request(app)
        .get('/api/properties?city=Nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent property', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/properties/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Property not found');
    });

    it('should return property details for valid ID', async () => {
      const response = await request(app)
        .get(`/api/properties/${testProperty._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(testProperty._id.toString());
      expect(response.body.data.name).toBe('Test Property');
      expect(response.body.data.address.city).toBe('Test City');
    });

    it('should return 404 for inactive property', async () => {
      // Create and get an inactive property
      const inactiveProperty = await Property.create({
        ownerId: testUser._id,
        name: 'Inactive Property',
        description: 'Inactive',
        address: {
          city: 'Test City',
          country: 'Test Country'
        },
        rooms: [
          {
            roomId: 'TEST004',
            type: 'suite',
            capacity: 3,
            pricePerNight: 150,
            isAvailable: true
          }
        ],
        isActive: false
      });

      const response = await request(app)
        .get(`/api/properties/${inactiveProperty._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Property is not active');
    });
  });
});