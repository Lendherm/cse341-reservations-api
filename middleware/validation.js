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

// -----------------------------
// Validate Create User (POST)
// -----------------------------
const validateUser = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(8).max(20).optional(),
    role: Joi.string().valid("user", "admin", "provider").default("user"),
    passwordHash: Joi.string().min(6).required()
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

    password: Joi.forbidden(),
    githubId: Joi.forbidden()
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
    })).min(1),
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
// Validate Reservation CREATE (POST)
// -----------------------------
const validateReservationCreate = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    propertyId: Joi.string().required(),
    roomId: Joi.string().required(),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    numGuests: Joi.number().integer().min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    specialRequests: Joi.string().max(500).allow(''),
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
// Validate Reservation UPDATE (PUT)
// -----------------------------
const validateReservationUpdate = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'failed'),
    specialRequests: Joi.string().max(500).allow(''),
  }).min(1); // At least one field required.

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
// Validate Vehicle CREATE (POST)
// -----------------------------
const validateVehicleCreate = (req, res, next) => {
  const schema = Joi.object({
    providerId: Joi.string().required(),
    make: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).required(),
    type: Joi.string().valid('sedan', 'suv', 'van', 'luxury', 'economy').required(),
    transmission: Joi.string().valid('automatic', 'manual').optional(),
    seats: Joi.number().integer().min(2).max(15).required(),
    pricePerDay: Joi.number().min(0).required(),
    fuelType: Joi.string().valid('gasoline', 'diesel', 'electric', 'hybrid').optional(),
    location: Joi.object({
      city: Joi.string().required(),
      airportCode: Joi.string().uppercase().trim().optional()
    }).required(),
    features: Joi.array().items(Joi.string()).optional(),
    isAvailable: Joi.boolean().optional().default(true),
    licensePlate: Joi.string().required(),
    images: Joi.array().items(Joi.string()).optional()
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
// Validate Vehicle UPDATE (PUT)
// -----------------------------
const validateVehicleUpdate = (req, res, next) => {
  const schema = Joi.object({
    make: Joi.string().optional(),
    model: Joi.string().optional(),
    year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).optional(),
    type: Joi.string().valid('sedan', 'suv', 'van', 'luxury', 'economy').optional(),
    transmission: Joi.string().valid('automatic', 'manual').optional(),
    seats: Joi.number().integer().min(2).max(15).optional(),
    pricePerDay: Joi.number().min(0).optional(),
    fuelType: Joi.string().valid('gasoline', 'diesel', 'electric', 'hybrid').optional(),
    location: Joi.object({
      city: Joi.string().optional(),
      airportCode: Joi.string().uppercase().trim().optional()
    }).optional(),
    features: Joi.array().items(Joi.string()).optional(),
    isAvailable: Joi.boolean().optional(),
    licensePlate: Joi.string().optional(), // Usually not changed, but allowed
    images: Joi.array().items(Joi.string()).optional()
  }).min(1); // At least one field required for update

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
  validateReservationCreate,
  validateReservationUpdate,
  validateVehicleCreate,    // Changed from validateVehicle
  validateVehicleUpdate,    // New
  validateObjectId
};