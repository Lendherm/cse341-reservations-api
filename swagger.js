const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Reservations API - Stay & Go",
      version: "2.0.0",
      description: "Complete API for hotel and transportation reservations. **IMPORTANT**: To use protected endpoints, you must first authenticate with GitHub at [/auth/github](/auth/github). Authentication uses session cookies.",
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
        url: "http://localhost:8080",
        description: "Local development server"
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description: "Session cookie for authenticated users. Login at /auth/github first."
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId",
              example: "650a1b2c3d4e5f0012345678"
            },
            name: {
              type: "string",
              example: "John Doe",
              description: "User's full name"
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
              description: "User email (unique)"
            },
            githubId: {
              type: "string",
              example: "1234567",
              description: "GitHub ID for authentication"
            },
            username: {
              type: "string",
              example: "johndoe",
              description: "GitHub username"
            },
            role: {
              type: "string",
              enum: ["user", "admin", "provider"],
              default: "user",
              example: "user",
              description: "User role in the system"
            }
          }
        },
        Property: {
          type: "object",
          required: ["ownerId", "name", "address"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            ownerId: {
              type: "string",
              example: "650a1b2c3d4e5f0012345678",
              description: "ID of the owner (user)"
            },
            name: {
              type: "string",
              example: "Luxury Beach Resort",
              description: "Property name"
            },
            description: {
              type: "string",
              example: "A luxury resort with ocean view",
              description: "Property description"
            },
            address: {
              type: "object",
              required: ["city", "country"],
              properties: {
                city: {
                  type: "string",
                  example: "Miami"
                },
                state: {
                  type: "string",
                  example: "Florida"
                },
                country: {
                  type: "string",
                  example: "USA"
                }
              }
            },
            amenities: {
              type: "array",
              items: { type: "string" },
              example: ["pool", "wifi", "gym"]
            },
            rooms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  roomId: { type: "string", example: "BEACH001" },
                  type: { type: "string", example: "double" },
                  capacity: { type: "number", example: 2 },
                  pricePerNight: { type: "number", example: 199.99 }
                }
              }
            },
            isActive: {
              type: "boolean",
              example: true,
              default: true
            }
          }
        },
        Reservation: {
          type: "object",
          required: ["propertyId", "roomId", "startDate", "endDate", "numGuests", "totalAmount"],
          properties: {
            _id: {
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            userId: {
              type: "string",
              description: "ID of the user who made the reservation"
            },
            propertyId: {
              type: "string",
              description: "Property ID"
            },
            roomId: {
              type: "string",
              description: "Room ID"
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
            specialRequests: {
              type: "string",
              description: "Special requests"
            }
          }
        },
        Vehicle: {
          type: "object",
          required: ["providerId", "make", "model", "year", "type", "seats", "pricePerDay", "licensePlate"],
          properties: {
            _id: { 
              type: "string",
              description: "Auto-generated MongoDB ObjectId"
            },
            providerId: { 
              type: "string", 
              description: "Provider ID" 
            },
            make: { 
              type: "string", 
              example: "Toyota" 
            },
            model: { 
              type: "string", 
              example: "Camry" 
            },
            year: { 
              type: "integer", 
              example: 2022 
            },
            type: { 
              type: "string", 
              enum: ["sedan", "suv", "van", "luxury", "economy"],
              example: "sedan" 
            },
            seats: { 
              type: "integer", 
              example: 5 
            },
            pricePerDay: { 
              type: "number", 
              example: 49.99 
            },
            licensePlate: {
              type: "string",
              example: "ABC123"
            },
            location: {
              type: "object",
              properties: {
                city: { type: "string", example: "Miami" }
              }
            },
            isAvailable: {
              type: "boolean",
              example: true,
              default: true
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
            loginUrl: {
              type: "string",
              example: "/auth/github",
              description: "URL to login (for authentication errors)"
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
              example: "Operation successful"
            },
            data: {
              type: "object",
              description: "Response data"
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: "Authentication required - First log in at /auth/github",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Please log in with GitHub to access this resource",
                loginUrl: "/auth/github"
              }
            }
          }
        },
        Forbidden: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Access denied. Admin permissions required."
              }
            }
          }
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Validation error",
                errors: ["The 'name' field is required"]
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
                message: "Resource not found"
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: "Authentication",
        description: "GitHub OAuth authentication endpoints"
      },
      {
        name: "Users",
        description: "User management (Admin)"
      },
      {
        name: "Properties",
        description: "Hotel properties management"
      },
      {
        name: "Reservations",
        description: "Reservations management (Requires authentication)"
      },
      {
        name: "Vehicles",
        description: "Vehicles management for transportation"
      }
    ],
    externalDocs: {
      description: "Interactive test panel",
      url: "/panel"
    }
  },
  apis: ["./routes/*.js"]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi: require('swagger-ui-express')
};