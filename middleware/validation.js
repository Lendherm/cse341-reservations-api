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
// Validate Property
// -----------------------------
const validateProperty = (req, res, next) => {
  const schema = Joi.object({
    ownerId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    address: Joi.object({
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      coords: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required()
      }).required()
    }).required()
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
