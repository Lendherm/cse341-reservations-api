const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// GET all vehicles with filters
const getAllVehicles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type, city, minSeats, maxPrice, available } = req.query;

    let filter = {};
    if (type) filter.type = type;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (minSeats) filter.seats = { $gte: parseInt(minSeats) };
    if (maxPrice) filter.pricePerDay = { $lte: parseFloat(maxPrice) };
    if (available !== undefined) filter.isAvailable = available === 'true';

    const vehicles = await Vehicle.find(filter)
      .populate('providerId', 'name email')
      .sort({ pricePerDay: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Vehicle.countDocuments(filter);

    res.json({
      success: true,
      count: vehicles.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
};

// GET single vehicle
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('providerId', 'name email phone');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// POST create vehicle
const createVehicle = async (req, res, next) => {
  try {
    // Check if provider exists
    const provider = await User.findById(req.body.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Check if provider has provider role
    if (provider.role !== 'provider' && provider.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only providers or admins can create vehicles'
      });
    }

    const vehicle = new Vehicle(req.body);
    const savedVehicle = await vehicle.save();
    await savedVehicle.populate('providerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: savedVehicle
    });
  } catch (error) {
    next(error);
  }
};

// PUT update vehicle
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('providerId', 'name email');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// DELETE vehicle
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
      deletedVehicle: {
        id: vehicle._id,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};