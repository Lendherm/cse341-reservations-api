const express = require('express');
const router = express.Router();
const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehiclesController');
const { validateVehicleCreate, validateVehicleUpdate, validateObjectId } = require('../middleware/validation');

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

// Middleware de autorización para vehículos
const authorizeVehicle = (req, res, next) => {
  // Si es admin, tiene acceso completo
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Para POST: solo admin o provider pueden crear vehículos
  if (req.method === 'POST') {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators or providers can create vehicles'
      });
    }
    
    // Providers solo pueden crear vehículos para sí mismos
    if (req.body.providerId && req.body.providerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create vehicles for your own account'
      });
    }
  }
  
  next();
};

/**
 * @swagger
 * tags:
 *   name: Vehículos
 *   description: Gestión de vehículos para transporte
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Obtener todos los vehículos
 *     tags: [Vehículos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de resultados por página
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sedan, suv, van, luxury, economy]
 *         description: Filtrar por tipo de vehículo
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtrar por ciudad
 *       - in: query
 *         name: minSeats
 *         schema:
 *           type: integer
 *         description: Número mínimo de asientos
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filtrar por disponibilidad
 *     responses:
 *       200:
 *         description: Lista de vehículos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 */
router.get('/', getAllVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Obtener un vehículo por ID
 *     tags: [Vehículos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID de MongoDB del vehículo
 *     responses:
 *       200:
 *         description: Detalles del vehículo
 *       404:
 *         description: Vehículo no encontrado
 */
router.get('/:id', validateObjectId, getVehicleById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Crear un nuevo vehículo
 *     tags: [Vehículos]
 *     description: Crear un nuevo vehículo. Requiere autenticación y rol de admin o provider.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - make
 *               - model
 *               - year
 *               - type
 *               - seats
 *               - pricePerDay
 *               - licensePlate
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: "650a1b2c3d4e5f0012345678"
 *               make:
 *                 type: string
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 example: "Camry"
 *               year:
 *                 type: integer
 *                 example: 2022
 *               type:
 *                 type: string
 *                 example: "sedan"
 *               seats:
 *                 type: integer
 *                 example: 5
 *               pricePerDay:
 *                 type: number
 *                 example: 49.99
 *               licensePlate:
 *                 type: string
 *                 example: "ABC123"
 *               city:
 *                 type: string
 *                 example: "Miami"
 *     responses:
 *       201:
 *         description: Vehículo creado exitosamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requireAuth, authorizeVehicle, validateVehicleCreate, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Actualizar un vehículo
 *     tags: [Vehículos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID de MongoDB del vehículo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               pricePerDay:
 *                 type: number
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Vehículo actualizado exitosamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Vehículo no encontrado
 */
router.put('/:id', requireAuth, validateObjectId, validateVehicleUpdate, updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Eliminar un vehículo
 *     tags: [Vehículos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: ID de MongoDB del vehículo
 *     responses:
 *       200:
 *         description: Vehículo eliminado exitosamente
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Vehículo no encontrado
 */
router.delete('/:id', requireAuth, validateObjectId, deleteVehicle);

module.exports = router;