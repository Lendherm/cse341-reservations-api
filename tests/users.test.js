// tests/users.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const testHelpers = require('./config/test-helpers');

// Import the simplified test server
const app = require('./test-server');

describe('Users Collection - GET Endpoints', () => {
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    await User.deleteMany({});

    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@test.com',
      role: 'user'
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/users', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('should return users list when authenticated as admin', async () => {
      const adminHeaders = testHelpers.getAdminHeaders({
        _id: adminUser._id.toString(),
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/users')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Validation Middleware', () => {
    it('should validate ObjectId format', async () => {
      const adminHeaders = testHelpers.getAdminHeaders({
        _id: adminUser._id.toString(),
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/users/invalid-id')
        .set(adminHeaders)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ID format');
    });
  });
});