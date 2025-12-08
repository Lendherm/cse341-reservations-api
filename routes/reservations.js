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

// Middleware temporal para pruebas en desarrollo
const developmentAuth = (req, res, next) => {
  // Si estamos en desarrollo, permitir sin autenticación
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Development mode: Bypassing authentication');
    
    // Mock user para desarrollo
    req.user = {
      _id: '650a1b2c3d4e5f0012345678',
      role: 'user',
      email: 'dev-user@example.com',
      getPublicProfile: function() {
        return {
          id: this._id,
          name: 'Dev User',
          email: this.email,
          role: this.role
        };
      }
    };
    return next();
  }
  
  // En producción, usar autenticación real
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource. Visit /auth/github to login.'
    });
  }
  
  next();
};

// Middleware temporal para admin en desarrollo
const developmentAdminAuth = (req, res, next) => {
  // Si estamos en desarrollo, permitir sin autenticación
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Development mode: Bypassing admin authentication');
    req.user = {
      _id: '650a1b2c3d4e5f0012345678',
      role: 'admin'
    };
    return next();
  }
  
  // En producción, verificar autenticación y rol admin
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource.'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       500:
 *         description: Server error
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Invalid ID format
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
 *       Note: In development mode, no authentication is required.
 *       In production, you must be logged in via GitHub OAuth.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reservation created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required (production only)
 *       409:
 *         description: Room not available for selected dates
 *       500:
 *         description: Server error
 */
router.post('/', developmentAuth, validateReservationCreate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update reservation
 *     tags: [Reservations]
 *     description: |
 *       Update reservation. 
 *       Note: In development mode, no authentication is required.
 *       In production, you must be logged in via GitHub OAuth.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *                 example: "confirmed"
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, refunded, failed]
 *                 example: "paid"
 *               specialRequests:
 *                 type: string
 *                 example: "Add extra towels"
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reservation updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation error or invalid ID
 *       401:
 *         description: Authentication required (production only)
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.put('/:id', developmentAuth, validateObjectId, validateReservationUpdate, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     tags: [Reservations]
 *     description: |
 *       Delete reservation. 
 *       Note: In development mode, no authentication is required.
 *       In production, admin authentication is required.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reservation deleted successfully
 *       400:
 *         description: Invalid ID format
 *       401:
 *         description: Authentication required (production only)
 *       403:
 *         description: Admin access required (production only)
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', developmentAdminAuth, validateObjectId, deleteReservation);

module.exports = router;