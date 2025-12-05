const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('User API Endpoints', () => {
  //beforeAll(async () => {
    //// Connect to a test database
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
    await User.deleteMany({});
  });

  describe('GET /api/users', () => {
    it('should return all users with pagination', async () => {
      // Create test users
      await User.create([
        { name: 'User 1', email: 'user1@test.com', passwordHash: 'password123' },
        { name: 'User 2', email: 'user2@test.com', passwordHash: 'password123' },
        { name: 'User 3', email: 'user3@test.com', passwordHash: 'password123' }
      ]);

      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('total', 3);
    });

    it('should filter users by role', async () => {
      await User.create([
        { name: 'Admin', email: 'admin@test.com', passwordHash: 'password123', role: 'admin' },
        { name: 'User', email: 'user@test.com', passwordHash: 'password123', role: 'user' },
        { name: 'Provider', email: 'provider@test.com', passwordHash: 'password123', role: 'provider' }
      ]);

      const response = await request(app)
        .get('/api/users?role=admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe('admin');
    });

    it('should handle pagination correctly', async () => {
      // Create more than 10 users (default limit)
      const users = Array.from({ length: 15 }, (_, i) => ({
        name: `User ${i + 1}`,
        email: `user${i + 1}@test.com`,
        passwordHash: 'password123'
      }));
      
      await User.create(users);

      const response = await request(app)
        .get('/api/users?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.pages).toBe(3); // 15/5 = 3 pages
    });

    it('should return 500 on server error', async () => {
      // Mock a database error
      jest.spyOn(User, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/users')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a single user by ID', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123'
      });

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(user._id.toString());
      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });
});