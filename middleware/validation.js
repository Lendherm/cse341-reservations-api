const Joi = require('joi');

const validateUser = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    passwordHash: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password hash is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional().messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
    role: Joi.string().valid('user', 'admin', 'provider').default('user').messages({
      'any.only': 'Role must be one of: user, admin, provider'
    })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateProperty = (req, res, next) => {
  const roomSchema = Joi.object({
    roomId: Joi.string().required().messages({
      'any.required': 'Room ID is required'
    }),
    type: Joi.string().valid('single', 'double', 'suite', 'deluxe').required().messages({
      'any.only': 'Room type must be one of: single, double, suite, deluxe',
      'any.required': 'Room type is required'
    }),
    capacity: Joi.number().min(1).max(10).required().messages({
      'number.min': 'Capacity must be at least 1',
      'number.max': 'Capacity cannot exceed 10',
      'any.required': 'Capacity is required'
    }),
    pricePerNight: Joi.number().min(0).required().messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price per night is required'
    }),
    images: Joi.array().items(Joi.string()).optional(),
    isAvailable: Joi.boolean().default(true)
  });

  const schema = Joi.object({
    ownerId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Owner ID must be a valid hexadecimal',
      'string.length': 'Owner ID must be 24 characters long',
      'any.required': 'Owner ID is required'
    }),
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Property name must be at least 2 characters long',
      'string.max': 'Property name cannot exceed 200 characters',
      'any.required': 'Property name is required'
    }),
    description: Joi.string().max(1000).optional().messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    address: Joi.object({
      city: Joi.string().required().messages({
        'any.required': 'City is required'
      }),
      state: Joi.string().optional(),
      country: Joi.string().required().messages({
        'any.required': 'Country is required'
      }),
      coords: Joi.object({
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180)
      }).optional()
    }).required(),
    amenities: Joi.array().items(Joi.string()).optional(),
    rooms: Joi.array().items(roomSchema).min(1).required().messages({
      'array.min': 'At least one room is required',
      'any.required': 'Rooms are required'
    }),
    policies: Joi.object({
      cancellation: Joi.string().valid('flexible', 'moderate', 'strict').default('moderate'),
      checkIn: Joi.string().optional(),
      checkOut: Joi.string().optional()
    }).optional(),
    isActive: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};

const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  next();
};

module.exports = {
  validateUser,
  validateProperty,
  validateObjectId
};