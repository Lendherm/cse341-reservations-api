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

    // Si el usuario no es admin y no especificó userId, mostrar solo sus reservas
    let filter = {};
    if (req.isAuthenticated() && req.user.role !== 'admin') {
      // Si no es admin, solo puede ver sus propias reservas
      filter.userId = req.user._id;
    }
    
    // Aplicar filtros adicionales
    if (userId && req.isAuthenticated() && (req.user.role === 'admin' || userId === req.user._id.toString())) {
      filter.userId = userId;
    }
    
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

    // Verificar que el usuario tenga acceso a esta reserva
    if (req.isAuthenticated() && req.user.role !== 'admin' && 
        reservation.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this reservation'
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
    // El middleware requireAuth ya verificó la autenticación
    // Usar el userId del usuario autenticado (ignorar cualquier userId en el body)
    const reservationData = {
      ...req.body,
      userId: req.user._id  // Forzar el userId del usuario autenticado
    };

    // Check if property exists and room is available
    const property = await Property.findById(reservationData.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check for date conflicts
    const conflictingReservation = await Reservation.findOne({
      propertyId: reservationData.propertyId,
      roomId: reservationData.roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { startDate: { $lt: new Date(reservationData.endDate) }, 
          endDate: { $gt: new Date(reservationData.startDate) } }
      ]
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    const reservation = new Reservation(reservationData);
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
    // Primero obtener la reserva
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Verificar autorización para actualizar
    // Solo admin o el usuario dueño de la reserva
    const canUpdate = req.user.role === 'admin' || 
                     reservation.userId.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reservation'
      });
    }

    const updates = { ...req.body };

    // Si no es admin, no puede cambiar el userId
    if (req.user.role !== 'admin') {
      delete updates.userId;
      delete updates.propertyId;
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('propertyId', 'name address.city');

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: updatedReservation
    });
  } catch (error) {
    next(error);
  }
};

// DELETE reservation
const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Verificar autorización para eliminar
    const canDelete = req.user.role === 'admin' || 
                     reservation.userId.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reservation'
      });
    }

    await Reservation.findByIdAndDelete(req.params.id);

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