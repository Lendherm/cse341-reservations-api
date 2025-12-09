// tests/auth.test.js
const request = require('supertest');
const testHelpers = require('./config/test-helpers');

// Import the simplified test server
const app = require('./test-server');

describe('Authentication Middleware', () => {
  describe('Public Routes', () => {
    it('should allow access to /api/properties without authentication', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow access to /api/vehicles without authentication', async () => {
      const response = await request(app)
        .get('/api/vehicles')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 for /api/users without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('should return 401 for /api/reservations without authentication', async () => {
      const response = await request(app)
        .get('/api/reservations')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('should allow access to /api/users with admin authentication', async () => {
      const adminHeaders = testHelpers.getAdminHeaders();

      const response = await request(app)
        .get('/api/users')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});