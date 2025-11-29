// middleware/validateOwnerExists.js - Versión mejorada

const User = require('../models/User');

const validateOwnerExists = async (req, res, next) => {
  try {
    const ownerId = req.body.ownerId;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID is required'
      });
    }

    // Validar formato del ID
    if (!ownerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Owner ID format'
      });
    }

    const owner = await User.findById(ownerId);

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID does not belong to any existing user'
      });
    }

    // Verificar que el usuario tenga el rol adecuado para ser propietario
    if (!owner.isProvider() && !owner.isAdmin()) {
      return res.status(400).json({
        success: false,
        message: 'Owner must have provider or admin role to create properties'
      });
    }

    // Adjuntar información del propietario al request para uso posterior
    req.owner = owner;
    next();
  } catch (error) {
    console.error('validateOwnerExists error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error validating owner'
    });
  }
};

module.exports = validateOwnerExists;