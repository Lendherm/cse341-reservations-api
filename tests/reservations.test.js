const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Property = require('../models/Property');

describe('Reservation API Endpoints', () => {
  let testUser;
  let testProperty;

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
    await Reservation.deleteMany({});
    await User.deleteMany({});
    await Property.deleteMany({});
    
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      passwordHash: 'password123'
    });

    // Create test property
    testProperty = await Property.create({
      ownerId: testUser._id,
      name: 'Test Hotel',
      address: { city: 'Test City', country: 'Test Country' },
      rooms: [{ roomId: 'TEST123', type: 'double', capacity: 2, pricePerNight: 150 }]
    });
  });

  describe('GET /api/reservations', () => {
    it('should return all reservations', async () => {
      // Create test reservations
      await Reservation.create([
        {
          userId: testUser._id,
          propertyId: testProperty._id,
          roomId: 'TEST123',
          startDate: new Date('2023-12-01'),
          endDate: new Date('2023-12-05'),
          numGuests: 2,
          totalAmount: 600,
          status: 'confirmed'
        },
        {
          userId: testUser._id,
          propertyId: testProperty._id,
          roomId: 'TEST123',
          startDate: new Date('2023-12-10'),
          endDate: new Date('2023-12-15'),
          numGuests: 2,
          totalAmount: 750,
          status: 'pending'
        }
      ]);

      const response = await request(app)
        .get('/api/reservations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('should filter reservations by status', async () => {
      await Reservation.create([
        {
          userId: testUser._id,
          propertyId: testProperty._id,
          roomId: 'TEST123',
          startDate: new Date('2023-12-01'),
          endDate: new Date('2023-12-05'),
          numGuests: 2,
          totalAmount: 600,
          status: 'confirmed'
        },
        {
          userId: testUser._id,
          propertyId: testProperty._id,
          roomId: 'TEST123',
          startDate: new Date('2023-12-10'),
          endDate: new Date('2023-12-15'),
          numGuests: 2,
          totalAmount: 750,
          status: 'pending'
        }
      ]);

      const response = await request(app)
        .get('/api/reservations?status=confirmed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('confirmed');
    });

    it('should handle pagination', async () => {
      // Create multiple reservations
      const reservations = Array.from({ length: 15 }, (_, i) => ({
        userId: testUser._id,
        propertyId: testProperty._id,
        roomId: 'TEST123',
        startDate: new Date(`2023-12-${i + 1}`),
        endDate: new Date(`2023-12-${i + 3}`),
        numGuests: 2,
        totalAmount: 300 + (i * 50),
        status: 'confirmed'
      }));
      
      await Reservation.create(reservations);

      const response = await request(app)
        .get('/api/reservations?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should return 500 on server error', async () => {
      jest.spyOn(Reservation, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/reservations')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should return a single reservation by ID', async () => {
      const reservation = await Reservation.create({
        userId: testUser._id,
        propertyId: testProperty._id,
        roomId: 'TEST123',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-05'),
        numGuests: 2,
        totalAmount: 600,
        status: 'confirmed'
      });

      const response = await request(app)
        .get(`/api/reservations/${reservation._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(reservation._id.toString());
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/reservations/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent reservation', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/reservations/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});