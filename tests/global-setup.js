// tests/global-setup.js
module.exports = async () => {
  console.log('🚀 Global test setup starting...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.SESSION_SECRET = 'test-session-secret';
  
  // Ensure test database URL is set
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-reservations';
  }
  
  console.log('✅ Global test setup complete');
};