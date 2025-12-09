// tests/setup.js - Updated with version fix
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Increase timeout for all tests
jest.setTimeout(30000);

// Suppress Mongoose deprecation warnings
mongoose.set('strictQuery', true);

beforeAll(async () => {
  try {
    // Create in-memory MongoDB server with compatible version for Debian 12
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.3' // Explicitly use version compatible with Debian 12
      }
    });
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
    
    // Fallback: Use MONGO_URI from environment or skip in-memory DB for tests
    if (process.env.MONGO_URI) {
      console.log('⚠️  Falling back to MONGO_URI from environment');
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } else {
      throw error;
    }
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