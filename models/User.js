const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    required: function () {
      return !this.githubId; // Email optional for OAuth users
    },
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true, // Required so null emails don't break `unique`
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },

  passwordHash: {
    type: String,
    required: function () {
      // Only for non-OAuth new accounts
      return !this.githubId && this.isNew;
    },
    minlength: [6, 'Password hash must be at least 6 characters long'],
    select: false
  },

  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },

  role: {
    type: String,
    enum: ['user', 'admin', 'provider'],
    default: 'user'
  },

  // OAuth fields
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  githubUsername: { type: String, sparse: true },
  githubProfileUrl: { type: String, sparse: true },
  avatarUrl: { type: String },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  },

  // Email verification (non-OAuth)
  isEmailVerified: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  },
  toObject: {
    transform(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ githubId: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Virtuals
userSchema.virtual('displayName').get(function () {
  return this.name;
});

userSchema.virtual('isOAuthUser').get(function () {
  return !!this.githubId;
});

// Password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// OAuth: find or create
userSchema.statics.findOrCreateFromGitHub = async function (profile) {
  // 1. Try to find by GitHub ID
  let user = await this.findOne({ githubId: profile.id });

  if (user) return user;

  // 2. Try to match an existing account by email
  const email = profile.emails?.[0]?.value;

  if (email) {
    user = await this.findOne({ email });

    if (user) {
      // Link GitHub to existing account
      user.githubId = profile.id;
      user.githubUsername = profile.username;
      user.githubProfileUrl = profile.profileUrl;
      user.avatarUrl = profile.photos?.[0]?.value;
      await user.save();
      return user;
    }
  }

  // 3. Create new OAuth user
  user = new this({
    name: profile.displayName || profile.username,
    email: email || `${profile.username}@github.com`, // fallback
    githubId: profile.id,
    githubUsername: profile.username,
    githubProfileUrl: profile.profileUrl,
    avatarUrl: profile.photos?.[0]?.value,
    isEmailVerified: true,
    isActive: true
  });

  await user.save();
  return user;
};

// Check roles
userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

userSchema.methods.isProvider = function () {
  return this.role === 'provider';
};

// Last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return this.save();
};

// Public profile
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatarUrl: this.avatarUrl,
    githubUsername: this.githubUsername,
    isOAuthUser: this.isOAuthUser,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
