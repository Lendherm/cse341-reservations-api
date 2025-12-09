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
// Añade esta importación
const { verifyToken } = require('../middleware/jwtAuth');

// Añade middleware de autorización para reservaciones
const authorizeReservation = (req, res, next) => {
  // Si el usuario no está autenticado
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Para POST: verificar que el userId en el cuerpo sea el mismo que el usuario autenticado (a menos que sea admin)
  if (req.method === 'POST') {
    if (req.user.role !== 'admin' && req.body.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create reservations for yourself'
      });
    }
  }

  // Para PUT: la verificación se hará en el controlador ya que necesitamos la reserva
  next();
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
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new reservation. 
 *       Requires JWT authentication.
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
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to create reservation
 */
router.post('/', verifyToken, authorizeReservation, validateReservationCreate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update a reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: MongoDB ObjectId of the reservation to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *           example:
 *             userId: "650a1b2c3d4e5f0012345678"
 *             reservationType: "accommodation"
 *             resourceId: "650a1b2c3d4e5f0012345679"
 *             roomId: "BEACH001"
 *             startDate: "2024-12-20"
 *             endDate: "2024-12-25"
 *             numGuests: 2
 *             totalAmount: 999.95
 *             status: "confirmed"
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not authorized to update this reservation
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', verifyToken, validateObjectId, validateReservationUpdate, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Authentication required
 */
router.delete('/:id', verifyToken, validateObjectId, deleteReservation);

module.exports = router;