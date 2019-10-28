import { promises as fsPromises } from 'fs';

import _ from 'lodash';
import yaml from 'js-yaml';

import { init } from './init';

const getResourceSchemaPrefix = (resourceName: string) => _.capitalize(resourceName);

const getEndpointMethod = (endpoint: string): string => endpoint.match(/^[a-z]+/)![0];

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
  const getPath = (endpoint: string, plural: string): string => {
    if (_.includes(['get', 'post'], endpoint)) {
      return `/${plural}`;
    }
    if (_.includes(['getById', 'patchById', 'deleteById'], endpoint)) {
      return `/${plural}/{id}`;
    }
    throw Error(`Unexpected endpoint ${endpoint}`);
  };

  const getResponses = (endpoint: string, resourceSchemaPrefix: string): any => {
    const responses: any = {};
    if (endpoint === 'deleteById') {
      responses['204'] = {
        description: 'REPLACEME',
      };
    } else {
      const schemaSuffix = _.includes(['post', 'getById'], endpoint) ? 'Result' : 'SetResult';
      const code = endpoint === 'post' ? '201' : '200';
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

  const getParameters = (endpoint: string, paginate: boolean): Array<any> => {
    const parameters: Array<any> = [];
    if (paginate) {
      parameters.push(
        {
          $ref: '#/components/parameters/pageNumber',
        },
        {
          $ref: '#/components/parameters/pageSize',
        },
      );
    }
    if (_.includes(['getById', 'patchById', 'deleteById'], endpoint)) {
      parameters.push({
        name: 'id',
        in: 'path',
        description: 'REPLACEME',
        required: true,
        schema: {
          type: 'string',
        },
      });
    }
    return parameters;
  };

  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);
    _.forEach(resource.endpoints, (endpoint) => {
      const method = getEndpointMethod(endpoint);
      const path = getPath(endpoint, resource.plural);
      _.set(openapi.paths, [path, method], {
        summary: 'REPLACEME',
        tags: [
          resource.plural,
        ],
        description: 'REPLACEME',
        // TODO Use a valid, unique operationId
        operationId: 'REPLACEME',
        parameters: getParameters(endpoint, resource.paginate),
        responses: getResponses(endpoint, resourceSchemaPrefix),
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
