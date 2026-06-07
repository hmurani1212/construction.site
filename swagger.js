const swagger_jsdoc = require("swagger-jsdoc");
const swagger_ui = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BuildMart Construction Materials API",
      version: "1.0.0",
      description: "API documentation for construction materials e-commerce platform",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:6160",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js", "./app.js"],
};

const swagger_spec = swagger_jsdoc(options);

module.exports = { swagger_ui, swagger_spec };

