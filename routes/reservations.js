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

// Middleware de autenticación
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub first.',
    loginUrl: '/auth/github'
  });
};

// Middleware de autorización para reservas
const authorizeReservation = (req, res, next) => {
  // Si es admin, tiene acceso completo
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Para POST: el usuario solo puede crear reservas para sí mismo
  if (req.method === 'POST') {
    // El userId se establece automáticamente desde req.user._id en el controlador
    return next();
  }
  
  // Para otras operaciones, la autorización se maneja en el controlador
  next();
};

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Obtener todas las reservas
 *     tags: [Reservas]
 *     description: Los administradores ven todas las reservas, los usuarios solo las suyas.
 *     responses:
 *       200:
 *         description: Lista de reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', requireAuth, getAllReservations);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Obtener una reserva por ID
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID de MongoDB de la reserva
 *     responses:
 *       200:
 *         description: Detalles de la reserva
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Reserva no encontrada
 */
router.get('/:id', requireAuth, validateObjectId, getReservationById);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Crear una nueva reserva
 *     tags: [Reservas]
 *     description: Crea una nueva reserva. Requiere autenticación con GitHub.
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
 *                 example: "Por favor, check-in temprano si es posible"
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', requireAuth, authorizeReservation, validateReservationCreate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Actualizar una reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: ID de MongoDB de la reserva a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               numGuests:
 *                 type: integer
 *               totalAmount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *               specialRequests:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reserva actualizada exitosamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Reserva no encontrada
 */
router.put('/:id', requireAuth, validateObjectId, validateReservationUpdate, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Eliminar una reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID de MongoDB de la reserva a eliminar
 *     responses:
 *       200:
 *         description: Reserva eliminada exitosamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Reserva no encontrada
 */
router.delete('/:id', requireAuth, validateObjectId, deleteReservation);

module.exports = router;