import { promises as fsPromises } from 'fs';

import _ from 'lodash';
import yaml from 'js-yaml';

import { init } from './init';

const buildResources = (config: any, openapi: any) => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = _.capitalize(resourceName);
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
        // TODO add self link
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
    const resourceSchemaName = `${resourceSchemaPrefix}Resource`;
    openapi.components.schemas[resourceSchemaName] = resourceSchema;

    const resultSchema: any = {
      properties: {
        links: {
          $ref: '#/components/schemas/SelfLink',
        },
        data: {
          $ref: `#/components/schemas/${resourceSchemaName}`,
        },
      },
    };
    openapi.components.schemas[`${resourceSchemaPrefix}Result`] = resultSchema;

    const setResultPiece = resource.paginate ? {
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
        ...setResultPiece,
        data: {
          type: 'array',
          items: {
            $ref: `#/components/schemas/${resourceSchemaName}`,
          },
        },
      },
    };
    openapi.components.schemas[`${resourceSchemaPrefix}SetResult`] = setResultSchema;
  });
  return openapi;
};

const main = async () => {
  try {
    const configFile = await fsPromises.open('generator-config.yml', 'r');
    const config = yaml.safeLoad(await configFile.readFile('utf8'));

    let openapi: any = init(config);
    openapi = buildResources(config, openapi);
    const openapiFile = await fsPromises.open('openapi.yaml', 'w');
    await openapiFile.write(yaml.safeDump(openapi));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
