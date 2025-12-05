const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property ID is required']
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  numGuests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'At least 1 guest is required']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reservationSchema.index({ userId: 1 });
reservationSchema.index({ propertyId: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ startDate: 1, endDate: 1 });

// Virtual for reservation duration in days
reservationSchema.virtual('durationDays').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if reservation is active
reservationSchema.methods.isActive = function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'confirmed';
};

module.exports = mongoose.model('Reservation', reservationSchema);