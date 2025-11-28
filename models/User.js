const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    minlength: [6, 'Password hash must be at least 6 characters long']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'provider'],
      message: 'Role must be either user, admin, or provider'
    },
    default: 'user'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  }
});

// Index for better query performance (removed duplicate email index)
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for user's display name
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Instance method to check if user is provider
userSchema.methods.isProvider = function() {
  return this.role === 'provider';
};

module.exports = mongoose.model('User', userSchema);