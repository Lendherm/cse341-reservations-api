const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Reservations API - Stay & Go',
      version: '1.0.0',
      description: 'A comprehensive REST API for managing hotel and transportation reservations',
      contact: {
        name: 'API Support',
        email: 'support@stayandgo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://cse341-code-student.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'passwordHash'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated ID of the user'
            },
            name: {
              type: 'string',
              description: 'User\'s full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address'
            },
            phone: {
              type: 'string',
              description: 'User\'s phone number'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'provider'],
              default: 'user'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          example: {
            _id: '650a1b2c3d4e5f0012345678',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            role: 'user',
            createdAt: '2023-09-20T10:30:00.000Z',
            updatedAt: '2023-09-20T10:30:00.000Z'
          }
        },
        Property: {
          type: 'object',
          required: ['ownerId', 'name', 'address'],
          properties: {
            _id: {
              type: 'string',
              description: 'The auto-generated ID of the property'
            },
            ownerId: {
              type: 'string',
              description: 'ID of the property owner'
            },
            name: {
              type: 'string',
              description: 'Property name'
            },
            description: {
              type: 'string',
              description: 'Property description'
            },
            address: {
              type: 'object',
              properties: {
                city: {
                  type: 'string'
                },
                state: {
                  type: 'string'
                },
                country: {
                  type: 'string'
                },
                coords: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' }
                  }
                }
              }
            },
            amenities: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            rooms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  roomId: { type: 'string' },
                  type: { 
                    type: 'string',
                    enum: ['single', 'double', 'suite', 'deluxe']
                  },
                  capacity: { type: 'number' },
                  pricePerNight: { type: 'number' },
                  images: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  isAvailable: { type: 'boolean' }
                }
              }
            },
            policies: {
              type: 'object',
              properties: {
                cancellation: {
                  type: 'string',
                  enum: ['flexible', 'moderate', 'strict']
                },
                checkIn: { type: 'string' },
                checkOut: { type: 'string' }
              }
            },
            isActive: {
              type: 'boolean'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};