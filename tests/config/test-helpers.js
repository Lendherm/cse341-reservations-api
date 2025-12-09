// tests/config/test-helpers.js
const mongoose = require('mongoose');

const testHelpers = {
  // For regular authenticated user
  getAuthHeaders: (user = {}) => {
    const defaultUser = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };
    
    return {
      'x-test-user': JSON.stringify({ ...defaultUser, ...user })
    };
  },

  // For admin user (also sets x-test-user header with admin role)
  getAdminHeaders: () => {
    return {
      'x-test-user': JSON.stringify({
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      })
    };
  },

  // Helper to create test data
  createTestReservation: async (userId, propertyId, data = {}) => {
    const Reservation = require('../models/Reservation');
    const defaultData = {
      userId,
      propertyId,
      roomId: 'TEST001',
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 86400000 * 3),
      numGuests: 2,
      totalAmount: 200,
      status: 'pending'
    };
    
    return await Reservation.create({ ...defaultData, ...data });
  },

  // Validate error response
  validateErrorResponse: (response, expectedStatus, expectedMessage) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  },

  // Validate success response
  validateSuccessResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
  }
};

module.exports = testHelpers;