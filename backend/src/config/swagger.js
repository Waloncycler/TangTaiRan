const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '唐肽燃管理系统 API',
      version: '1.0.0',
      description: '唐肽燃贸易管理系统的RESTful API文档',
      contact: {
        name: 'TTR Team',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      },
      {
        url: 'https://api.example.com',
        description: '生产服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/app.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;