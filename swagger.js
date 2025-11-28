const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Reservations API - Stay & Go",
      version: "2.0.0",
      description: "A comprehensive REST API for managing hotel and transportation reservations with full CRUD operations, authentication, and advanced filtering capabilities.",
      contact: {
        name: "API Support",
        email: "support@stayandgo.com"
      },
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html"
      }
    },
    servers: [
      {
        url: "https://cse341-reservations-api.onrender.com",
        description: "Production server (Render)"
      },
      {
        url: process.env.BASE_URL || "http://localhost:8080",
        description: "Development server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for authenticated users. Use the format: Bearer <token>"
        }
      },
      schemas: {
        User: {
          type: "object",
          required: ["name", "email", "passwordHash"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId",
              example: "650a1b2c3d4e5f0012345678"
            },
            name: {
              type: "string",
              example: "John Doe",
              description: "User's full name",
              minLength: 2,
              maxLength: 100
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
              description: "User's email address (unique)"
            },
            passwordHash: {
              type: "string",
              example: "hashedpassword123",
              description: "Hashed password (min 6 characters)",
              writeOnly: true
            },
            phone: {
              type: "string",
              example: "+1234567890",
              description: "User's phone number in international format"
            },
            role: {
              type: "string",
              enum: ["user", "admin", "provider"],
              default: "user",
              example: "user",
              description: "User role in the system"
            },
            displayName: {
              type: "string",
              description: "User's display name (virtual field)",
              readOnly: true
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              readOnly: true
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              readOnly: true
            }
          },
          example: {
            _id: "650a1b2c3d4e5f0012345678",
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            role: "user",
            createdAt: "2023-09-20T10:30:00.000Z",
            updatedAt: "2023-09-20T10:30:00.000Z"
          }
        },
        Property: {
          type: "object",
          required: ["ownerId", "name", "address"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId",
              example: "650a1b2c3d4e5f0012345679"
            },
            ownerId: {
              type: "string",
              example: "650a1b2c3d4e5f0012345678",
              description: "MongoDB ObjectId of the property owner"
            },
            name: {
              type: "string",
              example: "Luxury Beach Resort",
              description: "Property name",
              minLength: 2,
              maxLength: 200
            },
            description: {
              type: "string",
              example: "A beautiful resort with stunning ocean views and premium amenities",
              description: "Property description",
              maxLength: 1000
            },
            address: {
              type: "object",
              required: ["city", "country"],
              properties: {
                city: {
                  type: "string",
                  example: "Miami",
                  description: "City where the property is located"
                },
                state: {
                  type: "string",
                  example: "Florida",
                  description: "State or province"
                },
                country: {
                  type: "string",
                  example: "USA",
                  description: "Country where the property is located"
                },
                coords: {
                  type: "object",
                  properties: {
                    lat: {
                      type: "number",
                      format: "float",
                      example: 25.7617,
                      minimum: -90,
                      maximum: 90
                    },
                    lng: {
                      type: "number",
                      format: "float",
                      example: -80.1918,
                      minimum: -180,
                      maximum: 180
                    }
                  },
                  description: "Geographic coordinates"
                }
              }
            },
            amenities: {
              type: "array",
              items: {
                type: "string",
                example: "pool"
              },
              example: ["pool", "wifi", "gym", "spa", "restaurant"],
              description: "List of available amenities"
            },
            rooms: {
              type: "array",
              items: {
                type: "object",
                required: ["roomId", "type", "capacity", "pricePerNight"],
                properties: {
                  roomId: {
                    type: "string",
                    example: "BEACH001",
                    description: "Unique room identifier"
                  },
                  type: {
                    type: "string",
                    enum: ["single", "double", "suite", "deluxe"],
                    example: "double",
                    description: "Room type"
                  },
                  capacity: {
                    type: "integer",
                    example: 2,
                    minimum: 1,
                    maximum: 10,
                    description: "Maximum number of guests"
                  },
                  pricePerNight: {
                    type: "number",
                    format: "float",
                    example: 199.99,
                    minimum: 0,
                    description: "Price per night in USD"
                  },
                  images: {
                    type: "array",
                    items: {
                      type: "string",
                      example: "room1.jpg"
                    },
                    description: "Room images URLs"
                  },
                  isAvailable: {
                    type: "boolean",
                    example: true,
                    default: true,
                    description: "Room availability status"
                  }
                }
              },
              minItems: 1,
              description: "List of rooms in the property"
            },
            policies: {
              type: "object",
              properties: {
                cancellation: {
                  type: "string",
                  enum: ["flexible", "moderate", "strict"],
                  default: "moderate",
                  example: "moderate",
                  description: "Cancellation policy"
                },
                checkIn: {
                  type: "string",
                  example: "3:00 PM",
                  default: "3:00 PM",
                  description: "Check-in time"
                },
                checkOut: {
                  type: "string",
                  example: "11:00 AM",
                  default: "11:00 AM",
                  description: "Check-out time"
                }
              }
            },
            isActive: {
              type: "boolean",
              example: true,
              default: true,
              description: "Property active status"
            },
            rating: {
              type: "number",
              format: "float",
              example: 4.5,
              minimum: 0,
              maximum: 5,
              default: 0,
              description: "Average property rating"
            },
            reviewCount: {
              type: "integer",
              example: 127,
              default: 0,
              description: "Number of reviews",
              readOnly: true
            },
            minPrice: {
              type: "number",
              description: "Minimum room price (virtual field)",
              readOnly: true
            },
            maxCapacity: {
              type: "number",
              description: "Maximum room capacity (virtual field)",
              readOnly: true
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              readOnly: true
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              readOnly: true
            }
          },
          example: {
            _id: "650a1b2c3d4e5f0012345679",
            ownerId: "650a1b2c3d4e5f0012345678",
            name: "Luxury Beach Resort",
            description: "A beautiful resort with stunning ocean views and premium amenities",
            address: {
              city: "Miami",
              state: "Florida",
              country: "USA",
              coords: {
                lat: 25.7617,
                lng: -80.1918
              }
            },
            amenities: ["pool", "wifi", "gym", "spa", "restaurant"],
            rooms: [
              {
                roomId: "BEACH001",
                type: "double",
                capacity: 2,
                pricePerNight: 199.99,
                images: ["room1.jpg", "room2.jpg"],
                isAvailable: true
              }
            ],
            policies: {
              cancellation: "moderate",
              checkIn: "3:00 PM",
              checkOut: "11:00 AM"
            },
            isActive: true,
            rating: 4.5,
            reviewCount: 127,
            createdAt: "2023-09-20T10:30:00.000Z",
            updatedAt: "2023-09-20T10:30:00.000Z"
          }
        },
        Reservation: {
          type: "object",
          required: ["userId", "reservationType", "resourceId", "startDate", "endDate"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            userId: {
              type: "string",
              description: "User who made the reservation"
            },
            reservationType: {
              type: "string",
              enum: ["accommodation", "transport"],
              description: "Type of reservation"
            },
            resourceId: {
              type: "string",
              description: "Property ID or Vehicle ID"
            },
            roomId: {
              type: "string",
              description: "Room ID (if accommodation reservation)"
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Reservation start date"
            },
            endDate: {
              type: "string",
              format: "date",
              description: "Reservation end date"
            },
            numGuests: {
              type: "integer",
              description: "Number of guests"
            },
            totalAmount: {
              type: "number",
              description: "Total reservation amount"
            },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "completed"],
              default: "pending"
            },
            paymentId: {
              type: "string",
              description: "Associated payment ID"
            }
          }
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false
            },
            message: {
              type: "string",
              example: "Error description"
            },
            errors: {
              type: "array",
              items: { type: "string" },
              description: "Detailed validation errors",
              example: ["Name is required", "Email must be valid"]
            },
            stack: {
              type: "string",
              description: "Error stack trace (development only)"
            }
          }
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              example: 1,
              minimum: 1
            },
            limit: {
              type: "integer",
              example: 10,
              minimum: 1,
              maximum: 100
            },
            total: {
              type: "integer",
              example: 100
            },
            pages: {
              type: "integer",
              example: 10
            }
          }
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Operation completed successfully"
            },
            data: {
              type: "object",
              description: "Response data"
            },
            count: {
              type: "integer",
              description: "Number of items returned"
            },
            pagination: {
              $ref: "#/components/schemas/Pagination"
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Authentication required. Please provide a valid JWT token."
              }
            }
          }
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Validation failed",
                errors: [
                  "Name must be at least 2 characters long",
                  "Email must be a valid email address",
                  "Password hash must be at least 6 characters long"
                ]
              }
            }
          }
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "User not found with the specified ID"
              }
            }
          }
        },
        Conflict: {
          description: "Resource conflict",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "User with this email already exists"
              }
            }
          }
        },
        Success: {
          description: "Operation completed successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuccessResponse"
              },
              example: {
                success: true,
                message: "User created successfully",
                data: {
                  _id: "650a1b2c3d4e5f0012345678",
                  name: "John Doe",
                  email: "john@example.com",
                  role: "user"
                }
              }
            }
          }
        }
      },
      parameters: {
        userId: {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
            pattern: "^[0-9a-fA-F]{24}$"
          },
          description: "User MongoDB ObjectId"
        },
        propertyId: {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
            pattern: "^[0-9a-fA-F]{24}$"
          },
          description: "Property MongoDB ObjectId"
        },
        pageParam: {
          name: "page",
          in: "query",
          schema: {
            type: "integer",
            default: 1,
            minimum: 1
          },
          description: "Page number for pagination"
        },
        limitParam: {
          name: "limit",
          in: "query",
          schema: {
            type: "integer",
            default: 10,
            minimum: 1,
            maximum: 100
          },
          description: "Number of items per page"
        }
      }
    },
    tags: [
      {
        name: "Users",
        description: "User management endpoints"
      },
      {
        name: "Properties",
        description: "Property management endpoints"
      },
      {
        name: "Authentication",
        description: "JWT authentication endpoints (coming soon)"
      },
      {
        name: "Reservations",
        description: "Reservation management endpoints (coming soon)"
      }
    ]
  },
  apis: ["./routes/*.js", "./controllers/*.js"]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};