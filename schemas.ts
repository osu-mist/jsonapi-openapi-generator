import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';

/**
 * Gets the resource schema object for a resource
 *
 * @param resource
 * @param resourceName
 * @returns The resource schema
 */
const getResourceSchema = (resource: any, resourceName: string): OpenAPIV3.SchemaObject => {
  const resourceSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: `Unique ID of ${resourceName} resource`,
      },
      type: {
        type: 'string',
        enum: [resourceName],
      },
      attributes: {
        type: 'object',
        properties: resource.attributes,
      },
    },
  };
  if (resource.selfLinks) {
    _.set(resourceSchema, 'properties.links', {
      $ref: '#/components/schemas/SelfLink',
    });
  }
  return resourceSchema;
};

/**
 * Gets the result schema object for a resource
 *
 * @param resourceSchemaName
 * @returns The result schema
 */
const getResultSchema = (resourceSchemaName: string): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: {
    links: {
      $ref: '#/components/schemas/SelfLink',
    },
    data: {
      $ref: `#/components/schemas/${resourceSchemaName}`,
    },
  },
});

/**
 * Gets the setResult schema object for a resource
 *
 * @param resource
 * @param resourceSchemaName
 * @returns The setResult schema
 */
const getSetResultSchema = (resource: any, resourceSchemaName: string): OpenAPIV3.SchemaObject => {
  const linksSchema: object = resource.paginate ? {
    links: {
      allOf: [
        {
          $ref: '#/components/schemas/SelfLink',
        },
        {
          $ref: '#/components/schemas/PaginationLinks',
        },
      ],
    },
    meta: {
      $ref: '#/components/schemas/Meta',
    },
  } : {
    links: {
      $ref: '#/components/schemas/SelfLink',
    },
  };
  const setResultSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      ...linksSchema,
      data: {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${resourceSchemaName}`,
        },
      },
    },
  };
  return setResultSchema;
};

/**
 * Gets the requestBody schema object for a resource
 *
 * @param resource
 * @param resourceSchemaName
 * @param post - true if generating a post request body, false if generating a patch request body
 * @returns The requestBody schema
 */
const getRequestBodySchema = (
  resource: any,
  resourceSchemaName: string,
  post: boolean,
): OpenAPIV3.SchemaObject => {
  const refPropertiesPrefix = `#/components/schemas/${resourceSchemaName}/properties`;
  const attributeProperties = _.mapValues(resource.attributes, (_attribute, attributeName) => ({
    $ref: `${refPropertiesPrefix}/attributes/properties/${attributeName}`,
  }));
  const requiredProperties = resource.requiredPostAttributes === 'all'
    ? _.keys(resource.attributes)
    : resource.requiredPostAttributes;

  const requestBodySchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          type: {
            $ref: `${refPropertiesPrefix}/type`,
          },
          attributes: post ? {
            type: 'object',
            properties: attributeProperties,
            required: requiredProperties,
            additionalProperties: false,
          } : {
            type: 'object',
            properties: attributeProperties,
          },
        },
        required: post ? [
          'type',
          'attributes',
        ] : [
          'type',
          'id',
        ],
      },
    },
    required: [
      'data',
    ],
    additionalProperties: false,
  };
  return requestBodySchema;
};

/**
 * Gets the post body schema object for a resource
 *
 * @param resource
 * @param resourceSchemaName
 * @returns The post body schema
 */
const getPostBodySchema = (resource: any, resourceSchemaName: string): OpenAPIV3.SchemaObject => (
  getRequestBodySchema(resource, resourceSchemaName, true)
);

/**
 * Gets the patch body schema object for a resource
 *
 * @param resource
 * @param resourceSchemaName
 * @returns The patch body schema
 */
const getPatchBodySchema = (resource: any, resourceSchemaName: string): OpenAPIV3.SchemaObject => (
  getRequestBodySchema(resource, resourceSchemaName, false)
);

export {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getPostBodySchema,
  getPatchBodySchema,
};
