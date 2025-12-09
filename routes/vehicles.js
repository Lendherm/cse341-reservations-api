const express = require('express');
const router = express.Router();
const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehiclesController');
// Updated imports for separate validation
const { validateVehicleCreate, validateVehicleUpdate, validateObjectId } = require('../middleware/validation');
// Añade esta importación para JWT
const { verifyToken } = require('../middleware/jwtAuth');

// Añade middleware de autorización específico para vehículos
const authorizeVehicle = (req, res, next) => {
  // Si el usuario no está autenticado
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Para rutas POST: verificar que el usuario sea admin o provider
  if (req.method === 'POST') {
    if (req.user.role !== 'admin' && req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators or providers can create vehicles'
      });
    }
    
    // Asegurar que el providerId sea el mismo que el usuario autenticado (a menos que sea admin)
    if (req.user.role !== 'admin' && req.body.providerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create vehicles for your own account'
      });
    }
  }

  // Para rutas PUT: verificar que el usuario sea admin, provider del vehículo o propietario
  if (req.method === 'PUT') {
    // Esta verificación se hará en el controlador ya que necesitamos el vehículo
    next();
  }

  next();
};

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management endpoints
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles with filters
 *     tags: [Vehicles]
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sedan, suv, van, luxury, economy]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: minSeats
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum number of seats
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price per day
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *     responses:
 *       200:
 *         description: List of vehicles
 *       500:
 *         description: Server error
 */
router.get('/', getAllVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
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
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.get('/:id', validateObjectId, getVehicleById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
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
 *               transmission:
 *                 type: string
 *                 example: "automatic"
 *               fuelType:
 *                 type: string
 *                 example: "gasoline"
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Miami"
 *                   airportCode:
 *                     type: string
 *                     example: "MIA"
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only providers or admins can create vehicles
 *       500:
 *         description: Server error
 */
// Proteger con JWT y autorización
router.post('/', verifyToken, authorizeVehicle, validateVehicleCreate, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 example: "Camry"
 *               pricePerDay:
 *                 type: number
 *                 example: 54.99
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["GPS", "Bluetooth", "Backup Camera"]
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not authorized to update this vehicle
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
// Proteger con JWT
router.put('/:id', verifyToken, validateObjectId, validateVehicleUpdate, updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Vehicles]
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
 *         description: Vehicle deleted successfully
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', validateObjectId, deleteVehicle);

module.exports = router;