const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true // Para permitir usuarios sin GitHub ID
  },
  username: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'provider'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Métodos de instancia para verificar roles
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

userSchema.methods.isProvider = function() {
  return this.role === 'provider';
};

userSchema.methods.isUser = function() {
  return this.role === 'user';
};

// Método para obtener perfil público (sin información sensible)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    avatar: this.avatar
  };
};

module.exports = mongoose.model('User', userSchema);