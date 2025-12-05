const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Property = require('../models/Property');
const User = require('../models/User');

describe('Property API Endpoints', () => {
  let testUser;

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
    await Property.deleteMany({});
    await User.deleteMany({});
    
    // Create a test user
    testUser = await User.create({
      name: 'Property Owner',
      email: 'owner@test.com',
      passwordHash: 'password123',
      role: 'provider'
    });
  });

  describe('GET /api/properties', () => {
    it('should return all properties with filters', async () => {
      // Create test properties
      const properties = [
        {
          ownerId: testUser._id,
          name: 'Beach Resort',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R1', type: 'double', capacity: 2, pricePerNight: 199.99 }]
        },
        {
          ownerId: testUser._id,
          name: 'Mountain Cabin',
          address: { city: 'Denver', country: 'USA' },
          rooms: [{ roomId: 'R2', type: 'suite', capacity: 4, pricePerNight: 299.99 }]
        }
      ];
      
      await Property.create(properties);

      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('address');
    });

    it('should filter properties by city', async () => {
      await Property.create([
        {
          ownerId: testUser._id,
          name: 'Miami Hotel',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R1', type: 'double', capacity: 2, pricePerNight: 199.99 }]
        },
        {
          ownerId: testUser._id,
          name: 'NYC Apartment',
          address: { city: 'New York', country: 'USA' },
          rooms: [{ roomId: 'R2', type: 'single', capacity: 1, pricePerNight: 149.99 }]
        }
      ]);

      const response = await request(app)
        .get('/api/properties?city=Miami')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].address.city).toBe('Miami');
    });

    it('should filter properties by price range', async () => {
      await Property.create([
        {
          ownerId: testUser._id,
          name: 'Budget Hotel',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R1', type: 'single', capacity: 1, pricePerNight: 99.99 }]
        },
        {
          ownerId: testUser._id,
          name: 'Luxury Resort',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R2', type: 'suite', capacity: 4, pricePerNight: 499.99 }]
        }
      ]);

      const response = await request(app)
        .get('/api/properties?minPrice=100&maxPrice=300')
        .expect(200);

      // Should return no properties in this price range
      expect(response.body.data).toHaveLength(0);
    });

    it('should return properties with minimum capacity', async () => {
      await Property.create([
        {
          ownerId: testUser._id,
          name: 'Small Room',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R1', type: 'single', capacity: 1, pricePerNight: 99.99 }]
        },
        {
          ownerId: testUser._id,
          name: 'Family Suite',
          address: { city: 'Miami', country: 'USA' },
          rooms: [{ roomId: 'R2', type: 'suite', capacity: 4, pricePerNight: 299.99 }]
        }
      ]);

      const response = await request(app)
        .get('/api/properties?minCapacity=4')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Family Suite');
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return a single property by ID', async () => {
      const property = await Property.create({
        ownerId: testUser._id,
        name: 'Test Property',
        address: { city: 'Test City', country: 'Test Country' },
        rooms: [{ roomId: 'TEST1', type: 'double', capacity: 2, pricePerNight: 199.99 }]
      });

      const response = await request(app)
        .get(`/api/properties/${property._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(property._id.toString());
      expect(response.body.data.name).toBe('Test Property');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/properties/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});