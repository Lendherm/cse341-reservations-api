const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Reservations API - Stay & Go",
      version: "2.0.0",
      description: "API completa para reservas de hoteles y transporte. **IMPORTANTE**: Para usar la API, primero debes autenticarte con GitHub en [/auth/github](/auth/github). La autenticación usa sesiones (cookies).",
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
        description: "Servidor de producción (Render)"
      },
      {
        url: "http://localhost:8080",
        description: "Servidor de desarrollo local"
      }
    ],
    components: {
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
              description: "Nombre completo del usuario"
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
              description: "Email del usuario (único)"
            },
            githubId: {
              type: "string",
              example: "1234567",
              description: "ID de GitHub para autenticación"
            },
            username: {
              type: "string",
              example: "johndoe",
              description: "Nombre de usuario de GitHub"
            },
            role: {
              type: "string",
              enum: ["user", "admin", "provider"],
              default: "user",
              example: "user",
              description: "Rol del usuario en el sistema"
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
              description: "ID del propietario (usuario)"
            },
            name: {
              type: "string",
              example: "Luxury Beach Resort",
              description: "Nombre de la propiedad"
            },
            description: {
              type: "string",
              example: "Un resort de lujo con vista al mar",
              description: "Descripción de la propiedad"
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
              description: "ID del usuario que hizo la reserva"
            },
            propertyId: {
              type: "string",
              description: "ID de la propiedad"
            },
            roomId: {
              type: "string",
              description: "ID de la habitación"
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Fecha de inicio de la reserva"
            },
            endDate: {
              type: "string",
              format: "date",
              description: "Fecha de fin de la reserva"
            },
            numGuests: {
              type: "integer",
              description: "Número de huéspedes"
            },
            totalAmount: {
              type: "number",
              description: "Monto total de la reserva"
            },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "completed"],
              default: "pending"
            },
            specialRequests: {
              type: "string",
              description: "Solicitudes especiales"
            }
          }
        },
        Vehicle: {
          type: "object",
          properties: {
            _id: { type: "string" },
            providerId: { type: "string", description: "ID del proveedor" },
            make: { type: "string", example: "Toyota" },
            model: { type: "string", example: "Camry" },
            year: { type: "integer", example: 2022 },
            type: { type: "string", example: "sedan" },
            seats: { type: "integer", example: 5 },
            pricePerDay: { type: "number", example: 49.99 }
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
              example: "Descripción del error"
            },
            loginUrl: {
              type: "string",
              example: "/auth/github",
              description: "URL para iniciar sesión (para errores de autenticación)"
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
              example: "Operación exitosa"
            },
            data: {
              type: "object",
              description: "Datos de respuesta"
            }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: "Autenticación requerida - Primero debes iniciar sesión en /auth/github",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Por favor inicia sesión con GitHub para acceder a este recurso",
                loginUrl: "/auth/github"
              }
            }
          }
        },
        Forbidden: {
          description: "Permisos insuficientes",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Acceso denegado. Se requieren permisos de administrador."
              }
            }
          }
        },
        ValidationError: {
          description: "Error de validación",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error"
              },
              example: {
                success: false,
                message: "Error de validación",
                errors: ["El campo 'nombre' es requerido"]
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: "Autenticación",
        description: "Endpoints de autenticación con GitHub OAuth"
      },
      {
        name: "Usuarios",
        description: "Gestión de usuarios (Administrador)"
      },
      {
        name: "Propiedades",
        description: "Gestión de propiedades hoteleras"
      },
      {
        name: "Reservas",
        description: "Gestión de reservas (Requiere autenticación)"
      },
      {
        name: "Vehículos",
        description: "Gestión de vehículos para transporte"
      }
    ],
    externalDocs: {
      description: "Panel de pruebas interactivo",
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