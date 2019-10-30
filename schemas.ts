import _ from 'lodash';

const getResourceSchema = (resource: any, resourceName: string): any => {
  const resourceSchema: any = {
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
        properties: resource.attributes,
      },
    },
  };
  if (resource.selfLinks) {
    resourceSchema.properties.links = {
      $ref: '#/components/schemas/SelfLink',
    };
  }
  return resourceSchema;
};

const getResultSchema = (resourceSchemaName: string) => ({
  properties: {
    links: {
      $ref: '#/components/schemas/SelfLink',
    },
    data: {
      $ref: `#/components/schemas/${resourceSchemaName}`,
    },
  },
});

const getSetResultSchema = (resource: any, resourceSchemaName: string) => {
  const linksSchema = resource.paginate ? {
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
  const setResultSchema: any = {
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

const getRequestBodySchema = (resource: any, resourceSchemaName: string, post: boolean): any => {
  const refPropertiesPrefix = `#/components/schemas/${resourceSchemaName}/properties`;
  const attributeProperties = _.mapValues(resource.attributes, (_attribute, attributeName) => ({
    $ref: `${refPropertiesPrefix}/attributes/properties/${attributeName}`,
  }));
  const requiredProperties = resource.requiredPostAttributes === 'all'
    ? _.keys(resource.attributes)
    : resource.requiredPostAttributes;

  const requestBodySchema = {
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

const getPostBodySchema = (resource: any, resourceSchemaName: string) => (
  getRequestBodySchema(resource, resourceSchemaName, true)
);

const getPatchBodySchema = (resource: any, resourceSchemaName: string) => (
  getRequestBodySchema(resource, resourceSchemaName, false)
);

export {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getPostBodySchema,
  getPatchBodySchema,
};
