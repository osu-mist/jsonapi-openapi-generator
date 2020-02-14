import { OpenAPIV3 } from 'openapi-types';

import { Relationship, Resource } from './types';
import { getResourceSchemaPrefix } from './utils';

const getRelationshipSchema = (relationship: Relationship): OpenAPIV3.SchemaObject => {
  const relationshipSchemaName = getResourceSchemaPrefix(relationship.type);
  return {
    type: 'object',
    properties: {
      type: {
        $ref: `#/components/schemas/${relationshipSchemaName}Resource/properties/type`,
      },
      id: {
        $ref: `#/components/schemas/${relationshipSchemaName}Resource/properties/id`,
      },
    },
  };
};

const getRelationshipResultSchema = (
  resource: Resource,
  relationshipName: string,
  baseUrl: string,
  relationshipKey: string,
): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: {
    data: {
      type: 'object',
      allOf: [
        {
          type: 'object',
          nullable: true,
        },
        {
          $ref: `#/components/schemas/${relationshipKey}`,
        },
      ],
    },
    links: {
      type: 'object',
      properties: {
        self: {
          type: 'string',
          example: `${baseUrl}/${resource.plural}/1/relationships/${relationshipName}`,
        },
        related: {
          type: 'string',
          example: `${baseUrl}/${resource.plural}/1/${relationshipName}`,
        },
      },
    },
  },
});

const getRelationshipSetResultSchema = (
  resource: Resource,
  relationshipName: string,
  baseUrl: string,
  relationshipKey: string,
): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        $ref: `#/components/schemas/${relationshipKey}`,
      },
    },
    links: {
      type: 'object',
      properties: {
        self: {
          type: 'string',
          example: `${baseUrl}/${resource.plural}/1/relationships/${relationshipName}`,
        },
        related: {
          type: 'string',
          example: `${baseUrl}/${resource.plural}/1/${relationshipName}`,
        },
      },
    },
  },
});

export {
  getRelationshipSchema,
  getRelationshipResultSchema,
  getRelationshipSetResultSchema,
};
