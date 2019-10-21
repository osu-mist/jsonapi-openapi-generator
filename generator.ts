import { promises as fsPromises } from 'fs';

import _ from 'lodash';
import yaml from 'js-yaml';

import { init } from './init';

const getResourceSchemaPrefix = (resourceName: string) => _.capitalize(resourceName);

const buildResources = (config: any, openapi: any) => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);
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

const buildEndpoints = (config: any, openapi: any): any => {
  const getPath = (method: string, plural: string): string => {
    if (_.includes(['get', 'post'], method)) {
      return `/${plural}`;
    }
    if (_.includes(['getById', 'patchById', 'deleteById'], method)) {
      return `/${plural}/{id}`;
    }
    throw Error(`Unexpected method ${method}`);
  };

  const getResponses = (method: string, resourceSchemaPrefix: string): any => {
    const responses: any = {};
    if (method === 'deleteById') {
      responses['204'] = {
        description: 'REPLACEME',
      };
    } else {
      const schemaSuffix = _.includes(['post', 'getById'], method) ? 'Result' : 'SetResult';
      const code = method === 'post' ? '201' : '200';
      responses[code] = {
        description: 'REPLACEME',
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${resourceSchemaPrefix}${schemaSuffix}`,
            },
          },
        },
      };
    }

    responses['500'] = {
      $ref: '#/components/responses/500',
    };
    return responses;
  };

  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);
    _.forEach(resource.endpoints, (method) => {
      const path = getPath(method, resource.plural);
      _.set(openapi.paths, [path, method], {
        summary: 'REPLACEME',
        tags: [
          resource.plural,
        ],
        description: 'REPLACEME',
        // TODO Use a valid, unique operationId
        operationId: 'REPLACEME',
        parameters: resource.paginate ? [
          // TODO generate these parameters elsewhere if a paginated resource exists
          {
            $ref: '#/components/parameters/pageNumber',
          },
          {
            $ref: '#/components/parameters/pageSize',
          },
        ] : [],
        responses: getResponses(method, resourceSchemaPrefix),
      });
    });
  });
  return openapi;
};

const main = async () => {
  try {
    const configFile = await fsPromises.open('generator-config.yml', 'r');
    const config = yaml.safeLoad(await configFile.readFile('utf8'));

    let openapi: any = init(config);
    openapi = buildResources(config, openapi);
    openapi = buildEndpoints(config, openapi);
    const openapiFile = await fsPromises.open('openapi.yaml', 'w');
    await openapiFile.write(yaml.safeDump(openapi));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
