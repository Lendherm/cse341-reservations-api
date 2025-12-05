const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  make: {
    type: String,
    required: [true, 'Make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2000, 'Year must be 2000 or later'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  type: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: {
      values: ['sedan', 'suv', 'van', 'luxury', 'economy'],
      message: 'Vehicle type must be sedan, suv, van, luxury, or economy'
    }
  },
  transmission: {
    type: String,
    enum: ['automatic', 'manual'],
    default: 'automatic'
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [2, 'Vehicle must have at least 2 seats'],
    max: [15, 'Vehicle cannot have more than 15 seats']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price cannot be negative']
  },
  fuelType: {
    type: String,
    enum: ['gasoline', 'diesel', 'electric', 'hybrid'],
    default: 'gasoline'
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required']
    },
    airportCode: {
      type: String,
      uppercase: true,
      trim: true
    }
  },
  features: [{
    type: String,
    trim: true
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  licensePlate: {
    type: String,
    required: [true, 'License plate is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
vehicleSchema.index({ providerId: 1 });
vehicleSchema.index({ type: 1 });
vehicleSchema.index({ location: 1 });
vehicleSchema.index({ isAvailable: 1 });
vehicleSchema.index({ pricePerDay: 1 });

// Virtual for display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

module.exports = mongoose.model('Vehicle', vehicleSchema);