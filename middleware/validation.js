const Joi = require('joi');
const mongoose = require('mongoose');

// -----------------------------
// Validate MongoDB ObjectId
// -----------------------------
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  next();
};



// Validate Create User (POST)
// -----------------------------
const validateUser = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(8).max(20).optional(),
    role: Joi.string().valid("user", "admin", "provider").default("user"),
    passwordHash: Joi.string().min(6).required()  // Changed to match model
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map(d => d.message)
    });
  }

  next();
};
// -----------------------------
// Validate Update User (PUT)
// -----------------------------
// - No password required
// - Cannot update passwordHash
// -----------------------------
const validateUserUpdate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().min(8).max(20).optional(),
    role: Joi.string().valid("user", "admin", "provider").optional(),

    // Forbidden fields
    passwordHash: Joi.forbidden().messages({
      "any.unknown": "Password cannot be updated here"
    }),

    password: Joi.forbidden()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map(d => d.message)
    });
  }

  next();
};

// -----------------------------
// Validate Property (Permissive Version)
// -----------------------------
const validateProperty = (req, res, next) => {
  const schema = Joi.object({
    ownerId: Joi.string().required(),
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).allow(''),
    address: Joi.object({
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().required(),
      coords: Joi.object({
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180)
      }).optional()
    }).required(),
    amenities: Joi.array().items(Joi.string()),
    rooms: Joi.array().items(Joi.object({
      roomId: Joi.string().required(),
      type: Joi.string().valid('single', 'double', 'suite', 'deluxe').required(),
      capacity: Joi.number().integer().min(1).max(10).required(),
      pricePerNight: Joi.number().min(0).required(),
      images: Joi.array().items(Joi.string()),
      isAvailable: Joi.boolean()
    })),
    policies: Joi.object({
      cancellation: Joi.string().valid('flexible', 'moderate', 'strict'),
      checkIn: Joi.string(),
      checkOut: Joi.string()
    }),
    isActive: Joi.boolean(),
    rating: Joi.number().min(0).max(5),
    reviewCount: Joi.number().integer().min(0)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map(d => d.message)
    });
  }

  next();
};
// -----------------------------
// EXPORTS
// -----------------------------
module.exports = {
  validateUser,
  validateUserUpdate,
  validateProperty,
  validateObjectId
};
