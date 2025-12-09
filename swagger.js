const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Reservations API - Stay & Go",
      version: "2.0.0",
      description: "Complete API for hotel and transportation reservations. **IMPORTANT**: To use protected endpoints, you must first authenticate with GitHub at [/auth/github](/auth/github). Authentication uses session cookies stored in MongoDB for production reliability.",
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
        description: "Production server (Render) - Sessions stored in MongoDB"
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
          description: "Session cookie for authenticated users. Login at /auth/github first. Cookies are configured for cross-site use in production (sameSite: none, secure: true)."
        }
      },
      schemas: {
        // Tus schemas existentes...
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
        // Tus otras respuestas...
      }
    },
    tags: [
      {
        name: "Authentication",
        description: "GitHub OAuth authentication endpoints. **Must authenticate before accessing protected routes.**"
      },
      // Tus otros tags...
    ],
    externalDocs: {
      description: "Interactive test panel with authentication debugging",
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