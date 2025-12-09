const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name must be less than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  username: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'provider'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Método para obtener perfil público
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    githubId: this.githubId,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Método para verificar si es admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Método para verificar si es provider
userSchema.methods.isProvider = function() {
  return this.role === 'provider';
};

// Static method para buscar o crear usuario desde GitHub
userSchema.statics.findOrCreateFromGitHub = async function(profile) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  
  // Primero buscar por githubId
  let user = await this.findOne({ githubId: profile.id });
  
  if (user) {
    return user;
  }
  
  // Si no, buscar por email
  if (email) {
    user = await this.findOne({ email: email.toLowerCase() });
    if (user) {
      // Actualizar con githubId
      user.githubId = profile.id;
      user.username = profile.username;
      await user.save();
      return user;
    }
  }
  
  // Crear nuevo usuario
  user = new this({
    githubId: profile.id,
    name: profile.displayName || profile.username,
    email: email || `${profile.username}@github.com`,
    username: profile.username,
    role: 'user'
  });
  
  await user.save();
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;