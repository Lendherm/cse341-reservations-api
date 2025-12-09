const Reservation = require('../models/Reservation');
const Property = require('../models/Property');

// GET all reservations with filters
const getAllReservations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, startDate, endDate, propertyId, userId } = req.query;

    // Build filter object
    let filter = {};
    
    // If user is not admin, only show their reservations
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    } else {
      // Admin can filter by user
      if (userId) {
        filter.userId = userId;
      }
    }
    
    // Apply other filters
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;
    
    if (startDate) {
      filter.startDate = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      filter.endDate = { $lte: new Date(endDate) };
    }

    // Execute query with pagination
    const reservations = await Reservation.find(filter)
      .populate('userId', 'name email')
      .populate('propertyId', 'name address.city address.country')
      .sort({ createdAt: -1 })
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
      data: reservations.map(reservation => ({
        ...reservation.toObject(),
        durationDays: reservation.durationDays
      }))
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
      .populate('propertyId', 'name address rooms');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        reservation.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this reservation'
      });
    }

    res.json({
      success: true,
      data: {
        ...reservation.toObject(),
        durationDays: reservation.durationDays,
        isActive: reservation.isActive()
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST create reservation
const createReservation = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create reservations'
      });
    }

    // Create reservation data with authenticated user's ID
    const reservationData = {
      ...req.body,
      userId: req.user._id,  // Always use authenticated user
      status: 'pending'      // Default status
    };

    // Validate dates
    const startDate = new Date(reservationData.startDate);
    const endDate = new Date(reservationData.endDate);
    
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    // Verify property exists and is active
    const property = await Property.findOne({ 
      _id: reservationData.propertyId,
      isActive: true 
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or not active'
      });
    }

    // Verify room exists in property
    const room = property.rooms.find(r => r.roomId === reservationData.roomId);
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Room not found in this property'
      });
    }

    // Verify room is available
    if (!room.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for booking'
      });
    }

    // Verify that the number of guests doesn't exceed capacity
    if (reservationData.numGuests > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests exceeds room capacity (max: ${room.capacity})`
      });
    }

    // Check for date conflicts
    const conflictingReservation = await Reservation.findOne({
      propertyId: reservationData.propertyId,
      roomId: reservationData.roomId,
      status: { $in: ['confirmed', 'pending'] }, // Only check confirmed and pending reservations
      $or: [
        {
          // New reservation starts during existing reservation
          startDate: { $lt: endDate },
          endDate: { $gt: startDate }
        },
        {
          // Existing reservation starts during new reservation
          $and: [
            { startDate: { $gte: startDate } },
            { startDate: { $lt: endDate } }
          ]
        }
      ]
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: 'Room is already reserved for the selected dates',
        conflictingDates: {
          start: conflictingReservation.startDate,
          end: conflictingReservation.endDate
        }
      });
    }

    // Calculate duration and validate price
    const durationMs = endDate - startDate;
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    
    // Validate total amount matches expected price
    const expectedAmount = room.pricePerNight * durationDays;
    const providedAmount = reservationData.totalAmount;
    
    // Allow small rounding differences
    if (Math.abs(expectedAmount - providedAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Total amount does not match expected price ($${expectedAmount.toFixed(2)} for ${durationDays} nights)`
      });
    }

    // Create reservation
    const reservation = new Reservation(reservationData);
    const savedReservation = await reservation.save();

    // Populate references for response
    await savedReservation.populate('userId', 'name email');
    await savedReservation.populate('propertyId', 'name address.city address.country');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        ...savedReservation.toObject(),
        durationDays,
        roomDetails: {
          type: room.type,
          capacity: room.capacity,
          pricePerNight: room.pricePerNight
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT update reservation
const updateReservation = async (req, res, next) => {
  try {
    // Get reservation
    const reservation = await Reservation.findById(req.params.id)
      .populate('propertyId', 'rooms');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reservation'
      });
    }

    // Prepare updates
    const updates = { ...req.body };

    // If not admin, restrict what can be updated
    if (req.user.role !== 'admin') {
      // Non-admin users can only update:
      // - specialRequests
      // - status (only to 'cancelled')
      // - numGuests (if not exceeding room capacity)
      
      const allowedUpdates = {};
      
      if (updates.specialRequests !== undefined) {
        allowedUpdates.specialRequests = updates.specialRequests;
      }
      
      if (updates.status === 'cancelled') {
        allowedUpdates.status = 'cancelled';
      }
      
      if (updates.numGuests !== undefined) {
        // Check room capacity if changing numGuests
        const property = await Property.findById(reservation.propertyId);
        const room = property.rooms.find(r => r.roomId === reservation.roomId);
        
        if (updates.numGuests > room.capacity) {
          return res.status(400).json({
            success: false,
            message: `Number of guests exceeds room capacity (max: ${room.capacity})`
          });
        }
        
        allowedUpdates.numGuests = updates.numGuests;
      }
      
      // Replace updates with allowed updates only
      Object.keys(updates).forEach(key => {
        if (!(key in allowedUpdates)) {
          delete updates[key];
        }
      });
    } else {
      // Admin can update everything except userId, propertyId, roomId
      delete updates.userId;
      delete updates.propertyId;
      delete updates.roomId;
      
      // If admin is changing dates, check for conflicts
      if (updates.startDate || updates.endDate) {
        const newStartDate = updates.startDate ? new Date(updates.startDate) : reservation.startDate;
        const newEndDate = updates.endDate ? new Date(updates.endDate) : reservation.endDate;
        
        if (newStartDate >= newEndDate) {
          return res.status(400).json({
            success: false,
            message: 'End date must be after start date'
          });
        }
        
        // Check for conflicts (excluding current reservation)
        const conflictingReservation = await Reservation.findOne({
          _id: { $ne: reservation._id },
          propertyId: reservation.propertyId,
          roomId: reservation.roomId,
          status: { $in: ['confirmed', 'pending'] },
          $or: [
            {
              startDate: { $lt: newEndDate },
              endDate: { $gt: newStartDate }
            }
          ]
        });

        if (conflictingReservation) {
          return res.status(409).json({
            success: false,
            message: 'Room is already reserved for the selected dates'
          });
        }
      }
    }

    // Update reservation
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('userId', 'name email')
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

    // Check authorization
    if (req.user.role !== 'admin' && 
        reservation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reservation'
      });
    }

    // Additional restrictions for non-admin users
    if (req.user.role !== 'admin') {
      // Non-admin can only delete pending or cancelled reservations
      if (!['pending', 'cancelled'].includes(reservation.status)) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can delete confirmed or completed reservations'
        });
      }
      
      // Non-admin can only delete reservations that haven't started yet
      if (reservation.startDate <= new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete reservation that has already started'
        });
      }
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Reservation deleted successfully',
      deletedReservation: {
        id: reservation._id,
        propertyId: reservation.propertyId,
        roomId: reservation.roomId,
        status: reservation.status,
        startDate: reservation.startDate,
        endDate: reservation.endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET user's reservations (convenience endpoint)
const getMyReservations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    let filter = { userId: req.user._id };
    if (status) filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate('propertyId', 'name address.city address.country')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments(filter);

    // Group by status for summary
    const statusCounts = await Reservation.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      count: reservations.length,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      summary: {
        total,
        byStatus: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      data: reservations.map(reservation => ({
        ...reservation.toObject(),
        durationDays: reservation.durationDays,
        isActive: reservation.isActive()
      }))
    });
  } catch (error) {
    next(error);
  }
};

// PATCH update reservation status
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Only admin can change status (except user cancelling their own)
    if (req.user.role !== 'admin') {
      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can change reservation status'
        });
      }
      
      // User can only cancel their own reservation
      if (reservation.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this reservation'
        });
      }
      
      // User can only cancel if it hasn't started yet
      if (reservation.startDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel reservation that has already started'
        });
      }
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email');

    res.json({
      success: true,
      message: `Reservation status updated to ${status}`,
      data: updatedReservation
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
  deleteReservation,
  getMyReservations,
  updateReservationStatus
};