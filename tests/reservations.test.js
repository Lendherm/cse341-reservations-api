// tests/reservations.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Property = require('../models/Property');
const User = require('../models/User');

// Import the simplified test server
const app = require('./test-server');
const testHelpers = require('./config/test-helpers');

describe('Reservations Collection - GET, POST, PUT', () => {
  let testUser;
  let testProperty;
  let testReservation;

  beforeEach(async () => {
    await Reservation.deleteMany({});
    await Property.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      role: 'user'
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

    testReservation = await Reservation.create({
      userId: testUser._id,
      propertyId: testProperty._id,
      roomId: 'TEST001',
      startDate: new Date('2024-12-25'),
      endDate: new Date('2024-12-28'),
      numGuests: 2,
      totalAmount: 300,
      status: 'confirmed'
    });
  });

  afterAll(async () => {
    await Reservation.deleteMany({});
    await Property.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/reservations', () => {
    it('should return user reservations when authenticated', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      const response = await request(app)
        .get('/api/reservations')
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return all reservations for admin', async () => {
      const adminHeaders = testHelpers.getAdminHeaders();

      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        role: 'user'
      });

      await Reservation.create({
        userId: otherUser._id,
        propertyId: testProperty._id,
        roomId: 'TEST001',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-03'),
        numGuests: 2,
        totalAmount: 200,
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/reservations')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      await Reservation.create({
        userId: testUser._id,
        propertyId: testProperty._id,
        roomId: 'TEST001',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-03'),
        numGuests: 1,
        totalAmount: 200,
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/reservations?status=confirmed')
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should return 400 for invalid ID', async () => {
      const authHeaders = testHelpers.getAuthHeaders({ role: 'user' });

      const response = await request(app)
        .get('/api/reservations/invalid-id')
        .set(authHeaders)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent ID', async () => {
      const authHeaders = testHelpers.getAuthHeaders({ role: 'user' });

      const id = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/reservations/${id}`)
        .set(authHeaders)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Reservation not found');
    });

    it('should return reservation details for valid ID', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(testReservation._id.toString());
    });

    it('should return 403 when non-owner tries to access', async () => {
      const otherUserHeaders = testHelpers.getAuthHeaders({
        _id: new mongoose.Types.ObjectId().toString(),
        role: 'user'
      });

      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set(otherUserHeaders)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should allow admin to access any reservation', async () => {
      const adminHeaders = testHelpers.getAdminHeaders();

      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(testReservation._id.toString());
    });
  });

  describe('POST /api/reservations', () => {
    it('should create reservation when authenticated', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      const newReservation = {
        propertyId: testProperty._id.toString(),
        roomId: 'TEST001',
        startDate: '2024-12-29',
        endDate: '2024-12-31',
        numGuests: 2,
        totalAmount: 200,
        specialRequests: 'Test request'
      };

      const response = await request(app)
        .post('/api/reservations')
        .set(authHeaders)
        .send(newReservation)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation created successfully');
      expect(response.body.data.status).toBe('pending');
    });

    it('should detect date conflicts', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      const conflicting = {
        propertyId: testProperty._id.toString(),
        roomId: 'TEST001',
        startDate: '2024-12-26',
        endDate: '2024-12-27',
        numGuests: 2,
        totalAmount: 100
      };

      const response = await request(app)
        .post('/api/reservations')
        .set(authHeaders)
        .send(conflicting)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already reserved');
    });
  });

  describe('PUT /api/reservations/:id', () => {
    it('should update reservation by owner', async () => {
      const authHeaders = testHelpers.getAuthHeaders({
        _id: testUser._id.toString(),
        role: 'user'
      });

      const updateData = {
        specialRequests: 'Updated request',
        numGuests: 1
      };

      const response = await request(app)
        .put(`/api/reservations/${testReservation._id}`)
        .set(authHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reservation updated successfully');
      expect(response.body.data.specialRequests).toBe('Updated request');
    });

    it('should allow admin to update any reservation', async () => {
      const adminHeaders = testHelpers.getAdminHeaders();

      const updateData = {
        status: 'completed',
        paymentStatus: 'paid'
      };

      const response = await request(app)
        .put(`/api/reservations/${testReservation._id}`)
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });
});