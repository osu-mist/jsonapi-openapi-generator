import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';

import { Resource, Relationship } from './types';
import { getResourceSchemaPrefix } from './utils';

/**
 * Gets the GetResource schema object for a resource
 *
 * @param resource
 * @param resourceName
 * @returns The GetResource schema
 */
const getGetResourceSchema = (resource: Resource, resourceName: string): OpenAPIV3.SchemaObject => {
  const resourceSchemaPrefix = getResourceSchemaPrefix(resourceName);

  const getRelationship = (relationship: Relationship): OpenAPIV3.ReferenceObject => {
    let schemaName = _([resourceName, relationship.type]).map(getResourceSchemaPrefix).join('');
    schemaName = relationship.relationshipType === 'toOne'
      ? `${schemaName}RelationshipResult`
      : `${schemaName}RelationshipSetResult`;
    return {
      $ref: `#/components/schemas/${schemaName}`,
    };
  };

  const attributeProperties = _(resource.attributes)
    .pickBy((__, attributeName) => (
      resource.getAttributes === 'all' || _.includes(resource.getAttributes, attributeName)
    ))
    .mapValues((__, attributeName) => ({
      $ref: `#/components/schemas/${resourceSchemaPrefix}Attributes/properties/${attributeName}`,
    }))
    .value();

  const resourceSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      id: {
        $ref: `#/components/schemas/${resourceSchemaPrefix}Id`,
      },
      type: {
        $ref: `#/components/schemas/${resourceSchemaPrefix}Type`,
      },
      attributes: {
        type: 'object',
        properties: attributeProperties,
      },
    },
  };

  if (resource.relationships) {
    _.set(resourceSchema, 'properties.relationships', {
      type: 'object',
      properties: _.mapValues(resource.relationships, getRelationship),
    });
  }
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
  const paginateProps: OpenAPIV3.SchemaObject['properties'] = {
    links: {
      type: 'object',
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
  };
  const noPaginateProps = {
    links: {
      $ref: '#/components/schemas/SelfLink',
    },
  };

  return {
    type: 'object',
    properties: {
      ...(resource.paginate ? paginateProps : noPaginateProps),
      data: {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${resourceSchemaName}`,
        },
      },
    },
  };
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
  const attributeProperties = _(resource.attributes)
    .pickBy((__, attributeName) => (
      resource.postAttributes === 'all'
      || _.includes(resource.postAttributes, attributeName)
    ))
    .mapValues((__, attributeName) => ({
      $ref: `${refPropertiesPrefix}/attributes/properties/${attributeName}`,
    }))
    .value();
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
  getGetResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getRequestBodySchema,
};
