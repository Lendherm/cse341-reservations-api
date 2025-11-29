const express = require('express');
const router = express.Router();
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty
} = require('../controllers/propertiesController');
const { validateProperty, validateObjectId } = require('../middleware/validation');
const validateOwnerExists = require('../middleware/validateOwnerExists');

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management endpoints
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties with pagination and filters
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of properties per page
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price per night
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price per night
 *       - in: query
 *         name: minCapacity
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum room capacity
 *     responses:
 *       200:
 *         description: List of properties retrieved successfully
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
 *                   description: Number of properties in current page
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       500:
 *         description: Server error
 */
router.get('/', getAllProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
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
 *         description: Property details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.get('/:id', validateObjectId, getPropertyById);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerId
 *               - name
 *               - address
 *               - rooms
 *             properties:
 *               ownerId:
 *                 type: string
 *                 example: "650a1b2c3d4e5f0012345678"
 *               name:
 *                 type: string
 *                 example: "Luxury Beach Resort"
 *               description:
 *                 type: string
 *                 example: "A beautiful resort with stunning ocean views"
 *               address:
 *                 type: object
 *                 required:
 *                   - city
 *                   - country
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Miami"
 *                   state:
 *                     type: string
 *                     example: "Florida"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   coords:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 25.7617
 *                       lng:
 *                         type: number
 *                         example: -80.1918
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pool", "wifi", "gym"]
 *               rooms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - roomId
 *                     - type
 *                     - capacity
 *                     - pricePerNight
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       example: "BEACH001"
 *                     type:
 *                       type: string
 *                       enum: [single, double, suite, deluxe]
 *                       example: "double"
 *                     capacity:
 *                       type: integer
 *                       example: 2
 *                     pricePerNight:
 *                       type: number
 *                       example: 199.99
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["room1.jpg"]
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *               policies:
 *                 type: object
 *                 properties:
 *                   cancellation:
 *                     type: string
 *                     enum: [flexible, moderate, strict]
 *                     example: "moderate"
 *                   checkIn:
 *                     type: string
 *                     example: "3:00 PM"
 *                   checkOut:
 *                     type: string
 *                     example: "11:00 AM"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Property created successfully
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
 *                   example: Property created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', validateProperty, validateOwnerExists, createProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update property
 *     tags: [Properties]
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
 *               ownerId:
 *                 type: string
 *                 example: "650a1b2c3d4e5f0012345678"
 *               name:
 *                 type: string
 *                 example: "Luxury Beach Resort"
 *               description:
 *                 type: string
 *                 example: "A beautiful resort with stunning ocean views"
 *               address:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Miami"
 *                   state:
 *                     type: string
 *                     example: "Florida"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   coords:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 25.7617
 *                       lng:
 *                         type: number
 *                         example: -80.1918
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pool", "wifi", "gym"]
 *               rooms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       example: "BEACH001"
 *                     type:
 *                       type: string
 *                       example: "double"
 *                     capacity:
 *                       type: integer
 *                       example: 2
 *                     pricePerNight:
 *                       type: number
 *                       example: 199.99
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["room1.jpg"]
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *               policies:
 *                 type: object
 *                 properties:
 *                   cancellation:
 *                     type: string
 *                     example: "moderate"
 *                   checkIn:
 *                     type: string
 *                     example: "3:00 PM"
 *                   checkOut:
 *                     type: string
 *                     example: "11:00 AM"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Property updated successfully
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
 *                   example: Property updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Validation error or invalid ID
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */

router.put('/:id', validateObjectId, validateProperty, updateProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property (soft delete by setting isActive to false)
 *     tags: [Properties]
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
 *         description: Property deleted successfully
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
 *                   example: Property deleted successfully
 *       400:
 *         description: Invalid ID format
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', validateObjectId, deleteProperty);

module.exports = router;