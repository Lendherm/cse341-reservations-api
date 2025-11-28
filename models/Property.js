const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: {
      values: ['single', 'double', 'suite', 'deluxe'],
      message: 'Room type must be single, double, suite, or deluxe'
    },
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [10, 'Capacity cannot exceed 10']
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [0, 'Price cannot be negative'],
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  images: [{
    type: String,
    trim: true
  }],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  name: {
    type: String,
    required: [true, 'Property name is required'],
    trim: true,
    minlength: [2, 'Property name must be at least 2 characters long'],
    maxlength: [200, 'Property name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    coords: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  amenities: [{
    type: String,
    trim: true
  }],
  rooms: [roomSchema],
  policies: {
    cancellation: {
      type: String,
      enum: {
        values: ['flexible', 'moderate', 'strict'],
        message: 'Cancellation policy must be flexible, moderate, or strict'
      },
      default: 'moderate'
    },
    checkIn: {
      type: String,
      default: '3:00 PM'
    },
    checkOut: {
      type: String,
      default: '11:00 AM'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
propertySchema.index({ ownerId: 1 });
propertySchema.index({ 'address.city': 1 });
propertySchema.index({ 'address.country': 1 });
propertySchema.index({ isActive: 1 });
propertySchema.index({ rating: -1 });
propertySchema.index({ 'rooms.pricePerNight': 1 });
propertySchema.index({ 'rooms.capacity': 1 });

// Virtual for minimum price
propertySchema.virtual('minPrice').get(function() {
  if (!this.rooms || this.rooms.length === 0) return 0;
  return Math.min(...this.rooms.map(room => room.pricePerNight));
});

// Virtual for maximum capacity
propertySchema.virtual('maxCapacity').get(function() {
  if (!this.rooms || this.rooms.length === 0) return 0;
  return Math.max(...this.rooms.map(room => room.capacity));
});

// Method to check availability
propertySchema.methods.hasAvailableRooms = function() {
  return this.rooms.some(room => room.isAvailable);
};

// Static method to find by city
propertySchema.statics.findByCity = function(city) {
  return this.find({ 
    'address.city': new RegExp(city, 'i'),
    isActive: true 
  });
};

// Static method to find affordable properties
propertySchema.statics.findAffordable = function(maxPrice) {
  return this.find({
    'rooms.pricePerNight': { $lte: maxPrice },
    isActive: true
  });
};

module.exports = mongoose.model('Property', propertySchema);