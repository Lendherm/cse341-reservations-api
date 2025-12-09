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

// Import authentication middleware
const { requireAuth, requireProviderOrAdmin, isOwnerOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management for transportation
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
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
 *         description: Minimum number of seats
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per day
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *     responses:
 *       200:
 *         description: List of vehicles
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
 *                     $ref: '#/components/schemas/Vehicle'
 */
router.get('/', getAllVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the vehicle
 *     responses:
 *       200:
 *         description: Vehicle details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId, getVehicleById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicles]
 *     description: Create a new vehicle. Requires authentication and admin or provider role.
 *     security:
 *       - sessionAuth: []
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
 *                 minimum: 2000
 *               type:
 *                 type: string
 *                 enum: [sedan, suv, van, luxury, economy]
 *                 example: "sedan"
 *               seats:
 *                 type: integer
 *                 example: 5
 *                 minimum: 2
 *                 maximum: 15
 *               pricePerDay:
 *                 type: number
 *                 example: 49.99
 *                 minimum: 0
 *               licensePlate:
 *                 type: string
 *                 example: "ABC123"
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Miami"
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', requireAuth, requireProviderOrAdmin, validateVehicleCreate, createVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the vehicle
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
 *                 minimum: 2000
 *               pricePerDay:
 *                 type: number
 *                 minimum: 0
 *               isAvailable:
 *                 type: boolean
 *               location:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', requireAuth, validateObjectId, isOwnerOrAdmin, validateVehicleUpdate, updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the vehicle
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', requireAuth, validateObjectId, isOwnerOrAdmin, deleteVehicle);

module.exports = router;