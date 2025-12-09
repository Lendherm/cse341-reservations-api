const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reservations-api';
    
    console.log('🔗 Testing MongoDB connection...');
    console.log(`Connection string: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🎯 Host: ${mongoose.connection.host}`);
    
    // Test basic operations
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    const Property = require('../models/Property');
    const propertyCount = await Property.countDocuments();
    console.log(`🏨 Properties in database: ${propertyCount}`);
    
    await mongoose.connection.close();
    console.log('🔒 Connection closed');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();