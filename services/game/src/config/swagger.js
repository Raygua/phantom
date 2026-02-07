import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Game Service API',
      version: '1.0.0',
      description: 'Gestion du jeu',
    },
    servers: [
      {
        url: '/api/game',
        description: 'Gateway Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], 
};

export const specs = swaggerJsdoc(options);