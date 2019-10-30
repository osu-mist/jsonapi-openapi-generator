import { promises as fsPromises } from 'fs';

import _ from 'lodash';
import yaml from 'js-yaml';

import { init } from './init';
import {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getPostBodySchema,
  getPatchBodySchema,
} from './schemas';

/**
 * Gets the prefix of the resource schema in components/schemas
 *
 * @param resourceName
 * @returns The prefix
 */
const getResourceSchemaPrefix = (resourceName: string) => _.capitalize(resourceName);

/**
 * Gets the method for a given endpoint. Example: `getById` -> `get`
 *
 * @param endpoint
 * @returns The method
 */
const getEndpointMethod = (endpoint: string): string => endpoint.match(/^[a-z]+/)![0];

/**
 * Generates the value for `operationId`
 *
 * @param endpoint
 * @param resourceName
 * @param resource - The resource object
 * @returns The value of operationId
 */
const getOperationId = (endpoint: string, resourceName: string, resource: any): string => {
  if (endpoint === 'get') {
    return `${endpoint}${_.capitalize(resource.plural)}`;
  }
  const words = _.words(endpoint, /(^[a-z]+)|([A-Z][a-z]*)/g);
  words.splice(1, 0, `${_.capitalize(resourceName)}`);
  return _.join(words, '');
};

/**
 * Creates all resource schemas in the openapi object
 *
 * @param config - The config file object
 * @param openapi - The openapi object
 * @returns The updated openapi object
 */
const buildResources = (config: any, openapi: any) => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);

    const resourceSchema = getResourceSchema(resource, resourceName);
    const resourceSchemaName = `${resourceSchemaPrefix}Resource`;
    openapi.components.schemas[resourceSchemaName] = resourceSchema;

    const resultSchema = getResultSchema(resourceSchemaName);
    openapi.components.schemas[`${resourceSchemaPrefix}Result`] = resultSchema;

    const setResultSchema = getSetResultSchema(resource, resourceSchemaName);
    openapi.components.schemas[`${resourceSchemaPrefix}SetResult`] = setResultSchema;

    if (_.includes(resource.endpoints, 'post')) {
      const postBodySchema = getPostBodySchema(resource, resourceSchemaName);
      openapi.components.schemas[`${resourceSchemaPrefix}PostBody`] = postBodySchema;
    }
    if (_.includes(resource.endpoints, 'patchById')) {
      const patchBodySchema = getPatchBodySchema(resource, resourceSchemaName);
      openapi.components.schemas[`${resourceSchemaPrefix}PatchBody`] = patchBodySchema;
    }
  });
  return openapi;
};

/**
 * Gets the path for an endpoint
 *
 * @param endpoint
 * @param plural - The value of resource.plural from the config file
 * @returns The path for the endpoint
 */
const getPath = (endpoint: string, plural: string): string => {
  if (_.includes(['get', 'post'], endpoint)) {
    return `/${plural}`;
  }
  if (_.includes(['getById', 'patchById', 'deleteById'], endpoint)) {
    return `/${plural}/{id}`;
  }
  throw Error(`Unexpected endpoint ${endpoint}`);
};

/**
 * Gets responses for an endpoint
 *
 * @param endpoint
 * @param resourceSchemaPrefix - The prefix of the resource schema in the openapi document
 * @returns The responses object
 */
const getResponses = (endpoint: string, resourceSchemaPrefix: string): any => {
  const genericResponse = (code: string) => ({
    $ref: `#/components/responses/${code}`,
  });

  const responses: any = {};
  if (endpoint === 'deleteById') {
    responses['204'] = {
      description: 'REPLACEME',
    };
  } else {
    const schemaSuffix = _.includes(['post', 'patchById', 'getById'], endpoint)
      ? 'Result'
      : 'SetResult';
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

  if (_.includes(['getById', 'patchById', 'deleteById'], endpoint)) {
    responses['404'] = genericResponse('404');
  }

  if (endpoint === 'post') {
    responses['409'] = {
      $ref: '#/components/responses/409Post',
    };
  } else if (endpoint === 'patchById') {
    responses['409'] = {
      $ref: '#/components/responses/409Patch',
    };
  }

  responses['500'] = genericResponse('500');
  return responses;
};

/**
 * Return parameters for an endpoint
 *
 * @param endpoint
 * @param paginate - Value of resource.paginate from config file
 * @returns The list of parameters
 */
const getParameters = (endpoint: string, paginate: boolean): Array<any> => {
  const parameters: Array<any> = [];
  if (endpoint === 'get' && paginate) {
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

/**
 * Creates endpoints
 *
 * @param config - The config file object
 * @param openapi - The openapi object
 * @returns The modified openapi object
 */
const buildEndpoints = (config: any, openapi: any): any => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);

    _.forEach(resource.endpoints, (endpoint) => {
      const method = getEndpointMethod(endpoint);
      const path = getPath(endpoint, resource.plural);
      const parameters = getParameters(endpoint, resource.paginate);
      const parametersSchema = !_.isEmpty(parameters) ? {
        parameters: getParameters(endpoint, resource.paginate),
      } : {};

      let requestBodySchema = {};
      if (_.includes(['post', 'patch'], method)) {
        requestBodySchema = {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${resourceSchemaPrefix}${_.capitalize(method)}Body`,
                },
              },
            },
          },
        };
      }

      _.set(openapi.paths, [path, method], {
        summary: 'REPLACEME',
        tags: [
          resource.plural,
        ],
        description: 'REPLACEME',
        operationId: getOperationId(endpoint, resourceName, resource),
        ...parametersSchema,
        ...requestBodySchema,
        responses: getResponses(endpoint, resourceSchemaPrefix),
      });
    });
  });
  return openapi;
};

/**
 * The main function. Builds an openapi document using a config file and writes the document to a
 * YAML file
 */
const main = async () => {
  try {
    const configFile = await fsPromises.open('generator-config.yaml', 'r');
    const config = yaml.safeLoad(await configFile.readFile('utf8'));

    let openapi: any = init(config);
    openapi = buildResources(config, openapi);
    openapi = buildEndpoints(config, openapi);
    const openapiFile = await fsPromises.open('openapi.yaml', 'w');
    await openapiFile.write(yaml.safeDump(openapi, { lineWidth: 100 }));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
