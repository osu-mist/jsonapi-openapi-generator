import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';

import { Resource, Relationship } from './types';
import { getResourceSchemaPrefix } from './utils';

/**
 * Gets the schema object for a resource
 *
 * @param resource
 * @param resourceName
 * @returns The GetResource schema
 */
const getResourceSchema = (
  operation: 'get' | 'post' | 'patch',
  resource: Resource,
  resourceName: string,
): OpenAPIV3.SchemaObject => {
  const resourceSchemaPrefix = getResourceSchemaPrefix(resourceName);
  const allowedAttributes = {
    get: resource.getAttributes,
    post: resource.postAttributes,
    patch: resource.patchAttributes,
  }[operation];

  const getRelationship = (relationship: Relationship): OpenAPIV3.ReferenceObject => {
    let schemaName = _([resourceName, relationship.type]).map(getResourceSchemaPrefix).join('');
    schemaName = relationship.relationshipType === 'toOne'
      ? `${schemaName}RelationshipResult`
      : `${schemaName}RelationshipSetResult`;
    return {
      $ref: `#/components/schemas/${schemaName}`,
    };
  };

  const idProp = {
    id: {
      $ref: `#/components/schemas/${resourceSchemaPrefix}Id`,
    },
  };

  let topLevelRequired = {};
  if (operation === 'post') {
    topLevelRequired = {
      required: ['type', 'attributes'],
    };
  } else if (operation === 'patch') {
    topLevelRequired = {
      required: ['type', 'id'],
    };
  }
  let requiredAttributes = {};
  if (operation === 'post') {
    const attributes = resource.requiredPostAttributes === 'all'
      ? resource.postAttributes
      : resource.requiredPostAttributes;
    requiredAttributes = {
      required: attributes,
    };
  }

  let attributes: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  if (allowedAttributes === 'all') {
    attributes = {
      $ref: `#/components/schemas/${resourceSchemaPrefix}Attributes`,
    };
  } else {
    const attributeProperties = _(resource.attributes)
      .pickBy((__, attributeName) => _.includes(allowedAttributes, attributeName))
      .mapValues((__, attributeName) => ({
        $ref: `#/components/schemas/${resourceSchemaPrefix}Attributes/properties/${attributeName}`,
      }))
      .value();
    attributes = {
      type: 'object',
      ...(requiredAttributes),
      properties: attributeProperties,
    };
  }

  const resourceSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    ...(topLevelRequired),
    properties: {
      type: {
        $ref: `#/components/schemas/${resourceSchemaPrefix}Type`,
      },
      ...(operation !== 'post' ? idProp : {}),
      attributes,
    },
  };

  if (resource.relationships) {
    _.set(resourceSchema, 'properties.relationships', {
      type: 'object',
      properties: _.mapValues(resource.relationships, getRelationship),
    });
  }
  if (operation === 'get' && resource.selfLinks) {
    _.set(resourceSchema, 'properties.links', {
      $ref: '#/components/schemas/SelfLink',
    });
  }
  return resourceSchema;
};

/**
 * Gets the result schema object for a resource
 *
 * @param getResourceSchemaName
 * @returns The result schema
 */
const getResultSchema = (getResourceSchemaName: string): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: {
    links: {
      $ref: '#/components/schemas/SelfLink',
    },
    data: {
      $ref: `#/components/schemas/${getResourceSchemaName}`,
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
  getResourceSchemaName: string,
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
          $ref: `#/components/schemas/${getResourceSchemaName}`,
        },
      },
    },
  };
};

const getRequestBodySchema = (resourceSchemaName: string): OpenAPIV3.RequestBodyObject => ({
  description: 'REPLACEME',
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: `#/components/schemas/${resourceSchemaName}`,
          },
        },
      },
    },
  },
});

export {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getRequestBodySchema,
};
