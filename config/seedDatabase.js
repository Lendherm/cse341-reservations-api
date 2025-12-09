const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');
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
    name: 'Vehicle Provider',
    email: 'provider@stayandgo.com',
    passwordHash: 'hashedpassword123',
    role: 'provider',
    phone: '+1555666777'
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
  },
  {
    ownerId: null,
    name: 'Mountain View Hotel',
    description: 'Cozy hotel with beautiful mountain views',
    address: {
      city: 'Denver',
      state: 'Colorado',
      country: 'USA',
      coords: { lat: 39.7392, lng: -104.9903 }
    },
    amenities: ['wifi', 'parking', 'breakfast', 'hot tub'],
    rooms: [
      {
        roomId: 'MTN001',
        type: 'single',
        capacity: 1,
        pricePerNight: 89,
        images: ['mountain1.jpg'],
        isAvailable: true
      },
      {
        roomId: 'MTN002',
        type: 'double',
        capacity: 2,
        pricePerNight: 129,
        images: ['mountain2.jpg'],
        isAvailable: true
      }
    ],
    policies: {
      cancellation: 'flexible',
      checkIn: '4:00 PM',
      checkOut: '10:00 AM'
    }
  }
];

const seedVehicles = [
  {
    providerId: null, // Will be set after user creation
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    type: 'sedan',
    transmission: 'automatic',
    seats: 5,
    pricePerDay: 49.99,
    fuelType: 'gasoline',
    location: {
      city: 'Miami',
      airportCode: 'MIA'
    },
    features: ['GPS', 'Bluetooth', 'Backup Camera'],
    isAvailable: true,
    licensePlate: 'ABC123',
    images: ['camry1.jpg', 'camry2.jpg']
  },
  {
    providerId: null,
    make: 'Ford',
    model: 'Explorer',
    year: 2021,
    type: 'suv',
    transmission: 'automatic',
    seats: 7,
    pricePerDay: 79.99,
    fuelType: 'gasoline',
    location: {
      city: 'Miami',
      airportCode: 'MIA'
    },
    features: ['Sunroof', 'Leather Seats', 'Third Row'],
    isAvailable: true,
    licensePlate: 'XYZ789',
    images: ['explorer1.jpg']
  },
  {
    providerId: null,
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    type: 'luxury',
    transmission: 'automatic',
    seats: 5,
    pricePerDay: 129.99,
    fuelType: 'electric',
    location: {
      city: 'Denver',
      airportCode: 'DEN'
    },
    features: ['Autopilot', 'Premium Sound', 'Glass Roof'],
    isAvailable: true,
    licensePlate: 'TESLA1',
    images: ['tesla1.jpg', 'tesla2.jpg']
  }
];

const seedReservations = [
  {
    userId: null, // Will be set after user creation
    propertyId: null, // Will be set after property creation
    roomId: 'BEACH001',
    startDate: new Date('2023-12-15'),
    endDate: new Date('2023-12-20'),
    numGuests: 2,
    totalAmount: 995, // 199 * 5 nights
    status: 'confirmed',
    paymentStatus: 'paid',
    specialRequests: 'Please provide early check-in if possible'
  },
  {
    userId: null,
    propertyId: null,
    roomId: 'MTN002',
    startDate: new Date('2023-12-10'),
    endDate: new Date('2023-12-12'),
    numGuests: 2,
    totalAmount: 258, // 129 * 2 nights
    status: 'pending',
    paymentStatus: 'pending',
    specialRequests: 'Need a room with mountain view'
  },
  {
    userId: null,
    propertyId: null,
    roomId: 'BEACH002',
    startDate: new Date('2024-01-05'),
    endDate: new Date('2024-01-10'),
    numGuests: 4,
    totalAmount: 1495, // 299 * 5 nights
    status: 'confirmed',
    paymentStatus: 'paid',
    specialRequests: 'Celebrating anniversary'
  }
];

const seedDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reservations_db';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    await Vehicle.deleteMany({});
    await Reservation.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = await User.insertMany(seedUsers);
    console.log(`👥 Created ${createdUsers.length} users`);

    // Update properties with owner IDs
    seedProperties[0].ownerId = createdUsers[1]._id; // Property Owner
    seedProperties[1].ownerId = createdUsers[1]._id; // Property Owner
    
    const createdProperties = await Property.insertMany(seedProperties);
    console.log(`🏨 Created ${createdProperties.length} properties`);

    // Update vehicles with provider IDs
    seedVehicles[0].providerId = createdUsers[2]._id; // Vehicle Provider
    seedVehicles[1].providerId = createdUsers[2]._id; // Vehicle Provider
    seedVehicles[2].providerId = createdUsers[2]._id; // Vehicle Provider
    
    const createdVehicles = await Vehicle.insertMany(seedVehicles);
    console.log(`🚗 Created ${createdVehicles.length} vehicles`);

    // Update reservations with user and property IDs
    seedReservations[0].userId = createdUsers[3]._id; // Regular Customer
    seedReservations[0].propertyId = createdProperties[0]._id; // Luxury Beach Resort
    seedReservations[1].userId = createdUsers[3]._id; // Regular Customer
    seedReservations[1].propertyId = createdProperties[1]._id; // Mountain View Hotel
    seedReservations[2].userId = createdUsers[0]._id; // Admin User
    seedReservations[2].propertyId = createdProperties[0]._id; // Luxury Beach Resort
    
    const createdReservations = await Reservation.insertMany(seedReservations);
    console.log(`📅 Created ${createdReservations.length} reservations`);

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Sample Data Created:');
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Properties: ${createdProperties.length}`);
    console.log(`   - Vehicles: ${createdVehicles.length}`);
    console.log(`   - Reservations: ${createdReservations.length}`);
    
    await mongoose.connection.close();
    console.log('🔒 Connection closed');
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

module.exports = { 
  seedUsers, 
  seedProperties, 
  seedVehicles, 
  seedReservations, 
  seedDatabase 
};