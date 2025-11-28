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
 *     summary: Get all properties with filtering and pagination
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
 *           maximum: 50
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
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *         description: Minimum room capacity
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: string
 *         description: Comma-separated list of amenities
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
 *         description: Property not found or not active
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
 *             $ref: '#/components/schemas/Property'
 *           example:
 *             ownerId: "650a1b2c3d4e5f0012345678"
 *             name: "Luxury Beach Resort"
 *             description: "A beautiful resort with ocean views"
 *             address:
 *               city: "Miami"
 *               state: "Florida"
 *               country: "USA"
 *               coords:
 *                 lat: 25.7617
 *                 lng: -80.1918
 *             amenities: ["pool", "wifi", "gym", "spa"]
 *             rooms:
 *               - roomId: "BEACH001"
 *                 type: "double"
 *                 capacity: 2
 *                 pricePerNight: 199
 *                 images: ["image1.jpg", "image2.jpg"]
 *                 isAvailable: true
 *             policies:
 *               cancellation: "moderate"
 *               checkIn: "3:00 PM"
 *               checkOut: "11:00 AM"
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
router.post('/', validateProperty, createProperty);

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
 *             $ref: '#/components/schemas/Property'
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
 *     summary: Delete property (soft delete)
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