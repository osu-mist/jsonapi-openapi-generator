const init = (config: any) => ({
  openapi: '3.0.0',
  info: {
    title: config.title,
    description: 'REPLACEME',
    version: config.version,
    license: {
      name: 'REPLACEME',
      url: 'REPLACEME',
    },
    contact: {
      name: 'IS Data Architecture Team',
      url: 'https://is.oregonstate.edu/data-architecture',
      email: 'isdataarchitecture@oregonstate.edu',
    },
  },
  externalDocs: {
    description: 'GitHub Repository',
    url: config.githubUrl,
  },
  servers: [
    {
      url: `https://api.oregonstate.edu/${config.version}`,
    },
  ],
  security: [
    {
      OAuth2: ['full'],
    },
  ],
  paths: {},
  components: {
    securitySchemes: {
      OAuth2: {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            tokenUrl: 'https://api.oregonstate.edu/oauth2/token',
            scopes: {
              full: 'Full access to the API',
            },
          },
        },
      },
    },
    parameters: {},
    responses: {
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResult',
            },
          },
        },
      },
    },
    schemas: {
      SelfLink: {
        properties: {
          self: {
            type: 'string',
            format: 'url',
            description: 'Self-link of current resource',
          },
        },
      },
      ErrorObject: {
        properties: {
          status: {
            type: 'string',
            description: 'HTTP status code',
            example: '123',
          },
          title: {
            type: 'string',
            description: 'A short, user readable summary of the error',
            example: 'Not Found',
          },
          code: {
            type: 'string',
            description: 'An application-specific error code',
            example: '1234',
          },
          detail: {
            type: 'string',
            description:
              'A long description of the error that may contain instance-specific details',
          },
          links: {
            properties: {
              about: {
                type: 'string',
                format: 'url',
                description: 'A link to further information about the error',
                example:
                  'https://developer.oregonstate.edu/documentation/error-reference#1234',
              },
            },
          },
        },
      },
      ErrorResult: {
        properties: {
          errors: {
            type: 'array',
            items: { $ref: '#/components/schemas/ErrorObject' },
          },
        },
      },
    },
  },
});

export { init };
