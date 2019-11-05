import { promises as fsPromises } from 'fs';

import _ from 'lodash';
import yaml from 'js-yaml';
import 'source-map-support/register';

import { init } from './init';
import {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getRequestBodySchema,
} from './schemas';

/**
 * Gets the prefix of the resource schema in components/schemas
 *
 * @param resourceName
 * @returns The prefix
 */
const getResourceSchemaPrefix = (resourceName: string): string => _.capitalize(resourceName);

/**
 * Gets the method for a given operation. Example: `getById` -> `get`
 *
 * @param operation
 * @returns The method
 * @throws Error when operation is not in a valid format
 */
const getOperationMethod = (operation: string): string => {
  const operationRegex = /^[a-z]+/;
  const match = operationRegex.exec(operation);
  if (!match) {
    throw Error('Invalid operation');
  }
  return match[0];
};

/**
 * Generates the value for `operationId`. Example: `getById` -> `getPetById`
 *
 * @param operation
 * @param resourceName
 * @param resource - The resource object
 * @returns The value of operationId
 */
const getOperationId = (operation: string, resourceName: string, resource: any): string => {
  if (operation === 'get') {
    return `${operation}${_.capitalize(resource.plural)}`;
  }
  const words = _.words(operation, /(^[a-z]+)|([A-Z][a-z]*)/g);
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

    if (_.includes(resource.operations, 'post')) {
      const postBodySchema = getRequestBodySchema(
        resource,
        resourceSchemaName,
        'post',
      );
      openapi.components.schemas[`${resourceSchemaPrefix}PostBody`] = postBodySchema;
    }
    if (_.includes(resource.operations, 'patchById')) {
      const patchBodySchema = getRequestBodySchema(
        resource,
        resourceSchemaName,
        'patch',
      );
      openapi.components.schemas[`${resourceSchemaPrefix}PatchBody`] = patchBodySchema;
    }
  });
  return openapi;
};

/**
 * Gets the path for an operation
 *
 * @param operation
 * @param plural - The value of resource.plural from the config file
 * @returns The path for the operation
 */
const getPath = (operation: string, plural: string): string => {
  if (_.includes(['get', 'post'], operation)) {
    return `/${plural}`;
  }
  if (_.includes(['getById', 'patchById', 'deleteById'], operation)) {
    return `/${plural}/{id}`;
  }
  throw Error(`Unexpected operation ${operation}`);
};

/**
 * Gets responses for an operation
 *
 * @param operation
 * @param resourceSchemaPrefix - The prefix of the resource schema in the openapi document
 * @returns The responses object
 */
const getResponses = (operation: string, resourceSchemaPrefix: string): any => {
  const genericResponse = (code: string) => ({
    $ref: `#/components/responses/${code}`,
  });

  const responses: any = {};
  if (operation === 'deleteById') {
    responses['204'] = {
      description: 'REPLACEME',
    };
  } else {
    const schemaSuffix = _.includes(['post', 'patchById', 'getById'], operation)
      ? 'Result'
      : 'SetResult';
    const code = operation === 'post' ? '201' : '200';
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

  if (_.includes(['getById', 'patchById', 'deleteById'], operation)) {
    responses['404'] = genericResponse('404');
  }

  if (operation === 'post') {
    responses['409'] = {
      $ref: '#/components/responses/409Post',
    };
  } else if (operation === 'patchById') {
    responses['409'] = {
      $ref: '#/components/responses/409Patch',
    };
  }

  responses['500'] = genericResponse('500');
  return responses;
};

/**
 * Return parameters for an operation
 *
 * @param operation
 * @param paginate - Value of resource.paginate from config file
 * @returns The list of parameters
 */
const getParameters = (operation: string, paginate: boolean): Array<any> => {
  const parameters: Array<any> = [];
  if (operation === 'get' && paginate) {
    parameters.push(
      {
        $ref: '#/components/parameters/pageNumber',
      },
      {
        $ref: '#/components/parameters/pageSize',
      },
    );
  }
  if (_.includes(['getById', 'patchById', 'deleteById'], operation)) {
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

    _.forEach(resource.operations, (operation) => {
      const method = getOperationMethod(operation);
      const path = getPath(operation, resource.plural);
      const parameters = getParameters(operation, resource.paginate);
      const parametersSchema = !_.isEmpty(parameters) ? {
        parameters: getParameters(operation, resource.paginate),
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
        operationId: getOperationId(operation, resourceName, resource),
        ...parametersSchema,
        ...requestBodySchema,
        responses: getResponses(operation, resourceSchemaPrefix),
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
