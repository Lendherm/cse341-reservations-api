const Reservation = require('../models/Reservation');
const Property = require('../models/Property');

// GET all reservations with filters
const getAllReservations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { userId, propertyId, status, startDate, endDate } = req.query;

    // Construir filtro
    let filter = {};
    
    // Si no es admin, solo puede ver sus propias reservas
    if (!req.user.isAdmin()) {
      filter.userId = req.user._id;
    } else {
      // Si es admin y se especifica userId, usar ese filtro
      if (userId) {
        filter.userId = userId;
      }
    }
    
    // Otros filtros
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

    // Verificar autorización
    if (!req.user.isAdmin() && 
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
    // Crear datos de reserva con el userId del usuario autenticado
    const reservationData = {
      ...req.body,
      userId: req.user._id  // Siempre usar el usuario autenticado
    };

    // Verificar que la propiedad exista
    const property = await Property.findById(reservationData.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Verificar que la habitación exista en la propiedad
    const room = property.rooms.find(r => r.roomId === reservationData.roomId);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Room not found in this property'
      });
    }

    // Verificar que la habitación esté disponible
    if (!room.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      });
    }

    // Verificar que el número de huéspedes no exceda la capacidad
    if (reservationData.numGuests > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests exceeds room capacity (max: ${room.capacity})`
      });
    }

    // Verificar conflictos de fechas
    const conflictingReservation = await Reservation.findOne({
      propertyId: reservationData.propertyId,
      roomId: reservationData.roomId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        {
          startDate: { $lt: new Date(reservationData.endDate) },
          endDate: { $gt: new Date(reservationData.startDate) }
        }
      ]
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Room is already reserved for the selected dates'
      });
    }

    // Crear la reserva
    const reservation = new Reservation(reservationData);
    const savedReservation = await reservation.save();

    // Poblar referencias para la respuesta
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
    // Obtener la reserva
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Verificar autorización
    if (!req.user.isAdmin() && 
        reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reservation'
      });
    }

    // Preparar actualizaciones
    const updates = { ...req.body };

    // Si no es admin, no puede cambiar ciertos campos
    if (!req.user.isAdmin()) {
      delete updates.userId;
      delete updates.propertyId;
      delete updates.roomId;
      
      // Usuarios regulares solo pueden cancelar sus reservas
      if (updates.status && updates.status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can change reservation status'
        });
      }
    }

    // Actualizar la reserva
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

    // Verificar autorización
    if (!req.user.isAdmin() && 
        reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reservation'
      });
    }

    // Solo admin puede eliminar reservas confirmadas/completadas
    if (!req.user.isAdmin() && 
        (reservation.status === 'confirmed' || reservation.status === 'completed')) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete confirmed or completed reservations'
      });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Reservation deleted successfully',
      deletedReservation: {
        id: reservation._id,
        propertyId: reservation.propertyId,
        roomId: reservation.roomId,
        status: reservation.status
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