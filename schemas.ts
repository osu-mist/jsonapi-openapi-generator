import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';

import { Resource, Relationship } from './types';

/**
 * Gets the resource schema object for a resource
 *
 * @param resource
 * @param resourceName
 * @returns The resource schema
 */
const getResourceSchema = (resource: Resource, resourceName: string): OpenAPIV3.SchemaObject => {
  const getRelationship = (relationship: Relationship): OpenAPIV3.SchemaObject => {
    const resourceIdentifier: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [relationship.type],
        },
        id: {
          type: 'string',
        },
      },
    };
    const result: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        links: {
          type: 'object',
          properties: {
            self: {
              type: 'string',
            },
            related: {
              type: 'string',
            },
          },
        },
      },
    };
    if (relationship.relationshipType === 'toOne') {
      _.set(result, 'properties.data', resourceIdentifier);
    } else {
      _.set(result, 'properties.data', {
        type: 'array',
        items: resourceIdentifier,
      });
    }
    return result;
  };

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
      relationships: {
        type: 'object',
        properties: _.mapValues(resource.relationships, getRelationship),
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
const getSetResultSchema = (
  resource: Resource,
  resourceSchemaName: string,
): OpenAPIV3.SchemaObject => {
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
 * @param bodyType - 'post' for post body and 'patch' for patch body
 * @returns The requestBody schema
 */
const getRequestBodySchema = (
  resource: Resource,
  resourceSchemaName: string,
  bodyType: 'post' | 'patch',
): OpenAPIV3.SchemaObject => {
  const refPropertiesPrefix = `#/components/schemas/${resourceSchemaName}/properties`;
  const attributeProperties = _.mapValues(resource.attributes, (_attribute, attributeName) => ({
    $ref: `${refPropertiesPrefix}/attributes/properties/${attributeName}`,
  }));
  const allPropsRequired = resource.requiredPostAttributes === 'all';
  const allProperties = _.keys(resource.attributes);
  const requiredProperties = allPropsRequired ? allProperties : resource.requiredPostAttributes;

  let attributes = {};
  let required = {};
  switch (bodyType) {
    case 'post':
      attributes = {
        attributes: {
          type: 'object',
          properties: attributeProperties,
          required: requiredProperties,
          additionalProperties: false,
        },
      };
      required = {
        required: [
          'type',
          'attributes',
        ],
      };
      break;
    case 'patch':
      attributes = {
        attributes: {
          type: 'object',
          properties: attributeProperties,
        },
      };
      required = {
        required: [
          'type',
          'id',
        ],
      };
      break;
    default:
      throw Error(`Invalid bodyType ${bodyType}`);
  }

  const requestBodySchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          type: {
            $ref: `${refPropertiesPrefix}/type`,
          },
          ...attributes,
        },
        ...required,
      },
    },
    required: [
      'data',
    ],
    additionalProperties: false,
  };
  return requestBodySchema;
};

export {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getRequestBodySchema,
};
