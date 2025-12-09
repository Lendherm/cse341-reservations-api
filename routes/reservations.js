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

// Middleware de autenticación basado en sesión GitHub
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub.'
  });
};

// Middleware de autorización para reservaciones
const authorizeReservation = (req, res, next) => {
  // Para POST: solo puedes crear reservas para ti mismo (a menos que seas admin)
  if (req.method === 'POST') {
    // El userId debe coincidir con el usuario autenticado o ser admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create reservations for yourself'
      });
    }
  }
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
 *     description: |
 *       Returns a list of reservations.
 *       If authenticated, returns user's reservations.
 *       If not authenticated, returns public reservations (if any) or empty.
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (admin only)
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
 *       500:
 *         description: Server error
 */
router.get('/', (req, res, next) => {
  // Si el usuario está autenticado, podemos filtrar por su ID
  // pero dejamos que el controlador maneje la lógica
  if (req.isAuthenticated()) {
    req.userId = req.user._id;
  }
  getAllReservations(req, res, next);
});

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     tags: [Reservations]
 *     description: |
 *       Returns a single reservation by ID.
 *       Users can only view their own reservations unless they are admin.
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
 *       403:
 *         description: Not authorized to view this reservation
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
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
 *       Requires GitHub OAuth authentication.
 *       The userId will be automatically set to the authenticated user's ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - roomId
 *               - startDate
 *               - endDate
 *               - numGuests
 *               - totalAmount
 *             properties:
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
 *         description: Authentication required. Please log in with GitHub.
 *       403:
 *         description: Not authorized to create reservation
 *       409:
 *         description: Room not available for selected dates
 */
router.post('/', requireAuth, authorizeReservation, validateReservationCreate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update a reservation by ID
 *     tags: [Reservations]
 *     description: |
 *       Update an existing reservation.
 *       Requires GitHub OAuth authentication.
 *       Users can only update their own reservations unless they are admin.
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
 *             startDate: "2024-12-20"
 *             endDate: "2024-12-25"
 *             numGuests: 2
 *             totalAmount: 999.95
 *             status: "confirmed"
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this reservation
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', requireAuth, validateObjectId, validateReservationUpdate, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     tags: [Reservations]
 *     description: |
 *       Delete a reservation by ID.
 *       Requires GitHub OAuth authentication.
 *       Users can only delete their own reservations unless they are admin.
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
 *       403:
 *         description: Not authorized to delete this reservation
 */
router.delete('/:id', requireAuth, validateObjectId, deleteReservation);

module.exports = router;