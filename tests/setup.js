// tests/setup.js - Simplified setup
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Increase timeout for all tests
jest.setTimeout(30000);

// Suppress Mongoose deprecation warnings
mongoose.set('strictQuery', true);

beforeAll(async () => {
  try {
    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect mongoose
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to in-memory MongoDB for testing');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('✅ Disconnected from in-memory MongoDB');
  } catch (error) {
    console.error('❌ Error cleaning up test database:', error);
  }
});

// Clear all collections between tests
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      try {
        await collections[key].deleteMany();
      } catch (error) {
        // Collection might not exist yet
      }
    }
  }
});