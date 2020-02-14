import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';

import { Config } from './types';

const paginationSchemas = {
  Meta: {
    properties: {
      totalResults: {
        type: 'integer',
        description: 'Total number of results',
        example: 10,
      },
      totalPages: {
        type: 'integer',
        description: 'Total number of pages',
        example: 10,
      },
      currentPageNumber: {
        type: 'integer',
        description: 'Page number of the returned results',
        example: 1,
      },
      currentPageSize: {
        type: 'integer',
        description: 'Number of results per page',
        example: 25,
      },
    },
  },
  PaginationLinks: {
    properties: {
      first: {
        type: 'string',
        format: 'uri',
        description: 'The first page of data',
      },
      last: {
        type: 'string',
        format: 'uri',
        description: 'The last page of data',
      },
      prev: {
        type: 'string',
        format: 'uri',
        description: 'The previous page of data',
      },
      next: {
        type: 'string',
        format: 'uri',
        description: 'The next page of data',
      },
    },
  },
};

const paginationParameters = {
  pageNumber: {
    name: 'page[number]',
    in: 'query',
    required: false,
    description: 'Page number of results',
    schema: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
  },
  pageSize: {
    name: 'page[size]',
    in: 'query',
    required: false,
    description: 'Number of results to return',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 500,
      default: 25,
    },
  },
};

const errorSchema = {
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/ErrorResult',
      },
    },
  },
};

/**
 * Creates the initial openapi object template
 *
 * @param config - The config file object
 * @returns The updated openapi object
 */
const init = (config: Config): OpenAPIV3.Document => {
  const containsPaginated = _.some(config.resources, (resource) => resource.paginate);
  const extraSchemas = containsPaginated ? paginationSchemas : {};
  const extraParameters = containsPaginated ? paginationParameters : {};

  const openapi: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: config.title,
      description: 'REPLACEME',
      version: config.version,
      license: {
        name: 'GNU Affero General Public License Version 3',
        url: 'http://www.gnu.org/licenses/agpl-3.0.en.html',
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
      parameters: extraParameters,
      responses: {
        '204Delete': {
          description: 'The resource was successfully deleted',
        },
        '204RelationshipUpdate': {
          description: 'The relationship(s) already match the requested state',
        },
        400: {
          description: 'Bad request',
          ...errorSchema,
        },
        404: {
          description: 'Resource not found',
          ...errorSchema,
        },
        '409Post': {
          description: "The request body resource object's type was invalid or, if a client-generated ID was used, a resource already exists with this id",
          ...errorSchema,
        },
        '409Patch': {
          description: 'The request body resource object had an invalid type, invalid ID, or violated a uniqueness constraint',
          ...errorSchema,
        },
        500: {
          description: 'Internal server error',
          ...errorSchema,
        },
      },
      schemas: {
        SelfLink: {
          type: 'object',
          properties: {
            self: {
              type: 'string',
              format: 'uri',
              description: 'Self-link of current resource',
            },
          },
        },
        ...extraSchemas,
        ErrorObject: {
          type: 'object',
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
              description: 'A long description of the error that may contain instance-specific details',
            },
            links: {
              type: 'object',
              properties: {
                about: {
                  type: 'string',
                  format: 'uri',
                  description: 'A link to further information about the error',
                  example: 'https://developer.oregonstate.edu/documentation/error-reference#1234',
                },
              },
            },
          },
        },
        ErrorResult: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ErrorObject' },
            },
          },
        },
      },
    },
  };
  return openapi;
};

export { init };
