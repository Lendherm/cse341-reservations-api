const express = require('express');
const router = express.Router();
const {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation
} = require('../controllers/reservationsController');
const { validateReservationCreate, validateReservationUpdate, validateObjectId } = require('../middleware/validation');

// Middleware simplificado - PERMITIR SIN AUTENTICACIÓN TEMPORALMENTE
const authMiddleware = (req, res, next) => {
  // TEMPORALMENTE: Permitir siempre sin autenticación
  console.log('🔓 Authentication bypassed for testing');
  req.user = {
    _id: '650a1b2c3d4e5f0012345678',
    role: 'user',
    getPublicProfile: function() {
      return {
        id: this._id,
        role: this.role
      };
    }
  };
  return next();
  
  // Si quieres mantener autenticación en producción, descomenta esto:
  /*
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔓 Development mode - authentication bypassed');
    req.user = {
      _id: '650a1b2c3d4e5f0012345678',
      role: 'user',
      getPublicProfile: function() {
        return {
          id: this._id,
          role: this.role
        };
      }
    };
    return next();
  }
  
  // EN PRODUCCIÓN: Verificar si hay sesión (GitHub OAuth)
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Si no hay sesión, verificar header de autorización
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login via GitHub OAuth or provide Authorization header'
    });
  }
  
  // Token simple temporal
  if (authHeader === 'Bearer test-token-123') {
    req.user = {
      _id: '650a1b2c3d4e5f0012345678',
      role: 'user'
    };
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Invalid token. Use: Bearer test-token-123'
  });
  */
};

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management endpoints
 */

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations with filters
 *     tags: [Reservations]
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by property ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of reservations
 */
router.get('/', getAllReservations);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Reservation details
 */
router.get('/:id', validateObjectId, getReservationById);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     description: |
 *       Create a new reservation. 
 *       Note: Authentication is temporarily disabled for testing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - propertyId
 *               - roomId
 *               - startDate
 *               - endDate
 *               - numGuests
 *               - totalAmount
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "650a1b2c3d4e5f0012345678"
 *               propertyId:
 *                 type: string
 *                 example: "650a1b2c3d4e5f0012345679"
 *               roomId:
 *                 type: string
 *                 example: "BEACH001"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-12-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-12-05"
 *               numGuests:
 *                 type: integer
 *                 example: 2
 *               totalAmount:
 *                 type: number
 *                 example: 799.96
 *               specialRequests:
 *                 type: string
 *                 example: "Please provide early check-in if possible"
 *     responses:
 *       201:
 *         description: Reservation created successfully
 */
router.post('/', authMiddleware, validateReservationCreate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 * put:
 * summary: Update a reservation by ID
 * tags: [Reservations]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * pattern: "^[0-9a-fA-F]{24}$"
 * description: MongoDB ObjectId of the reservation to update
 * requestBody: 
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Reservation'
 * example:
 * userId: "650a1b2c3d4e5f0012345678"
 * reservationType: "accommodation"
 * resourceId: "650a1b2c3d4e5f0012345679"
 * roomId: "BEACH001"
 * startDate: "2024-12-20"
 * endDate: "2024-12-25"
 * numGuests: 2
 * totalAmount: 999.95
 * status: "confirmed"
 * responses:
 * 200:
 * description: Reservation updated successfully
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Reservation'
 * 400:
 * $ref: '#/components/responses/ValidationError'
 * 401:
 * $ref: '#/components/responses/Unauthorized'
 * 404:
 * $ref: '#/components/responses/NotFound'
 * x-controller: updateReservation
 */
router.put('/:id', authMiddleware, validateObjectId, validateReservationUpdate, updateReservation); // <-- Asegúrate de que esta línea exista

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 */
router.delete('/:id', authMiddleware, validateObjectId, deleteReservation);

module.exports = router;