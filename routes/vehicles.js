const express = require('express');
const router = express.Router();
const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehiclesController');
const { validateVehicle, validateObjectId } = require('../middleware/validation');

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
 *       403:
 *         description: Only providers can create vehicles
 *       500:
 *         description: Server error
 */
router.post('/', validateVehicle, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
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
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.put('/:id', validateObjectId, validateVehicle, updateVehicle);

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