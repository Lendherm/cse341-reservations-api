const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('🔗 Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connection successful!');
    
    // List available databases
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.listDatabases();
    console.log('📊 Available databases:', result.databases.map(db => db.name));
    
    await mongoose.connection.close();
    console.log('🔒 Connection closed');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 Tips:');
    console.log('   - Check if your IP is whitelisted in MongoDB Atlas');
    console.log('   - Verify your username and password');
    console.log('   - Make sure the cluster is running');
  }
};

testConnection();