const Reservation = require('../models/Reservation');
const Property = require('../models/Property');
const User = require('../models/User');

// GET all reservations with filters
const getAllReservations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { userId, propertyId, status, startDate, endDate } = req.query;

    // Build filter
    let filter = {};
    if (userId) filter.userId = userId;
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { $lte: new Date(endDate) };

    const reservations = await Reservation.find(filter)
      .populate('userId', 'name email')
      .populate('propertyId', 'name address.city')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments(filter);

    res.json({
      success: true,
      count: reservations.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// GET single reservation
const getReservationById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('propertyId', 'name address');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// POST create reservation
const createReservation = async (req, res, next) => {
  try {
    // Check if property exists and room is available
    const property = await Property.findById(req.body.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user exists
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for date conflicts
    const conflictingReservation = await Reservation.findOne({
      propertyId: req.body.propertyId,
      roomId: req.body.roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { startDate: { $lt: new Date(req.body.endDate) }, endDate: { $gt: new Date(req.body.startDate) } }
      ]
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    const reservation = new Reservation(req.body);
    const savedReservation = await reservation.save();

    // Populate references
    await savedReservation.populate('userId', 'name email');
    await savedReservation.populate('propertyId', 'name address.city');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: savedReservation
    });
  } catch (error) {
    next(error);
  }
};

// PUT update reservation
const updateReservation = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // Don't allow changing user or property
    delete updates.userId;
    delete updates.propertyId;

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('propertyId', 'name address.city');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// DELETE reservation
const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.json({
      success: true,
      message: 'Reservation deleted successfully',
      deletedReservation: {
        id: reservation._id,
        userId: reservation.userId,
        propertyId: reservation.propertyId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation
};