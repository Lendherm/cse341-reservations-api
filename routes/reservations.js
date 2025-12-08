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

// Middleware simple de autenticación
const authMiddleware = (req, res, next) => {
  // EN DESARROLLO: Permitir siempre
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
  
  // EN PRODUCCIÓN: Verificar autenticación básica
  // Esto es temporal - deberías implementar OAuth/JWT en producción
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header required'
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
 *     summary: Get all reservations
 *     tags: [Reservations]
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
 *     security:
 *       - bearerAuth: []
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
 *   put:
 *     summary: Update reservation
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation updated
 */
router.put('/:id', authMiddleware, validateObjectId, validateReservationUpdate, updateReservation);

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
 *     responses:
 *       200:
 *         description: Reservation deleted
 */
router.delete('/:id', authMiddleware, validateObjectId, deleteReservation);

module.exports = router;