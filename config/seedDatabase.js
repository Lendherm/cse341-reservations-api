const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
require('dotenv').config();

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@stayandgo.com',
    passwordHash: 'hashedpassword123',
    role: 'admin',
    phone: '+1234567890'
  },
  {
    name: 'Property Owner',
    email: 'owner@stayandgo.com',
    passwordHash: 'hashedpassword123',
    role: 'provider',
    phone: '+1987654321'
  },
  {
    name: 'Regular Customer',
    email: 'customer@stayandgo.com',
    passwordHash: 'hashedpassword123',
    role: 'user',
    phone: '+1122334455'
  }
];

const seedProperties = [
  {
    ownerId: null, // Will be set after user creation
    name: 'Luxury Beach Resort',
    description: 'A beautiful resort with stunning ocean views and premium amenities',
    address: {
      city: 'Miami',
      state: 'Florida',
      country: 'USA',
      coords: { lat: 25.7617, lng: -80.1918 }
    },
    amenities: ['pool', 'wifi', 'gym', 'spa', 'restaurant', 'bar'],
    rooms: [
      {
        roomId: 'BEACH001',
        type: 'double',
        capacity: 2,
        pricePerNight: 199,
        images: ['room1.jpg', 'room2.jpg'],
        isAvailable: true
      },
      {
        roomId: 'BEACH002',
        type: 'suite',
        capacity: 4,
        pricePerNight: 299,
        images: ['suite1.jpg', 'suite2.jpg'],
        isAvailable: true
      }
    ],
    policies: {
      cancellation: 'moderate',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM'
    }
  }
];

const seedDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reservations-api';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = await User.insertMany(seedUsers);
    console.log(`👥 Created ${createdUsers.length} users`);

    // Update properties with owner IDs
    seedProperties[0].ownerId = createdUsers[1]._id; // Property Owner
    
    const createdProperties = await Property.insertMany(seedProperties);
    console.log(`🏨 Created ${createdProperties.length} properties`);

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Sample Data Created:');
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Properties: ${createdProperties.length}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedUsers, seedProperties, seedDatabase };