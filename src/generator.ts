import { promises as fsPromises } from 'fs';

import yaml from 'js-yaml';
import _ from 'lodash';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import 'source-map-support/register';

import { init } from './init';
import {
  getResourceSchema,
  getResultSchema,
  getSetResultSchema,
  getRequestBodySchema,
} from './schemas';
import {
  getRelationshipSchema,
  getRelationshipResultSchema,
  getRelationshipSetResultSchema,
} from './relationshipSchemas';
import { Config, Resource } from './types';
import { getResourceSchemaPrefix } from './utils';

let baseUrl: string;

const isIdOperation = (operation: string): boolean => _.includes(
  ['getById', 'patchById', 'deleteById'],
  operation,
);
const idParamName = (resourceName: string): string => `${resourceName}Id`;

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
    throw Error(`Unexpected operation ${operation}`);
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
const getOperationId = (operation: string, resourceName: string, resource: Resource): string => {
  const resourcePart = operation === 'get' ? resource.plural : resourceName;

  // split on camelCase words
  const words = _.words(operation, /(^[a-z]+)|([A-Z][a-z]*)/g);

  words.splice(1, 0, resourcePart);
  return _.camelCase(_.join(words, '-'));
};

/**
 * Creates all resource schemas in the openapi object
 *
 * @param config - The config file object
 * @param openapi - The openapi object
 * @returns The updated openapi object
 */
const buildResources = (config: Config, openapi: OpenAPIV3.Document): OpenAPIV3.Document => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);

    const resourceSchema = getResourceSchema(resource, resourceName);
    const resourceSchemaName = `${resourceSchemaPrefix}Resource`;
    _.set(openapi, `components.schemas.${resourceSchemaName}`, resourceSchema);

    const resultSchema = getResultSchema(resourceSchemaName);
    _.set(openapi, `components.schemas.${resourceSchemaPrefix}Result`, resultSchema);

    const setResultSchema = getSetResultSchema(resource, resourceSchemaName);
    _.set(openapi, `components.schemas.${resourceSchemaPrefix}SetResult`, setResultSchema);

    if (_.includes(resource.operations, 'post')) {
      const postBodySchema = getRequestBodySchema(
        resource,
        resourceSchemaName,
        'post',
      );
      _.set(openapi, `components.schemas.${resourceSchemaPrefix}PostBody`, postBodySchema);
    }
    if (_.includes(resource.operations, 'patchById')) {
      const patchBodySchema = getRequestBodySchema(
        resource,
        resourceSchemaName,
        'patch',
      );
      _.set(openapi, `components.schemas.${resourceSchemaPrefix}PatchBody`, patchBodySchema);
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
  if (isIdOperation(operation)) {
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
const getResponses = (
  operation: string,
  resourceSchemaPrefix: string,
): OpenAPIV3.ResponsesObject => {
  const refResponse = (refName: string): OpenAPIV3.ReferenceObject => ({
    $ref: `#/components/responses/${refName}`,
  });

  const responses: OpenAPIV3.ResponsesObject = {};
  if (operation === 'deleteById') {
    responses['204'] = refResponse('204Delete');
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

  if (isIdOperation(operation)) {
    responses['404'] = refResponse('404');
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

  responses['500'] = refResponse('500');
  return responses;
};

/**
 * Return parameters for an operation
 *
 * @param operation
 * @param resourceName
 * @param paginate - Value of resource.paginate from config file
 * @returns The list of parameters
 */
const getParameters = (
  operation: string,
  resourceName: string,
  paginate: boolean,
): OpenAPI.Parameters => {
  const parameters: OpenAPI.Parameters = [];
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
  if (isIdOperation(operation)) {
    parameters.push({
      $ref: `#/components/parameters/${idParamName(resourceName)}`,
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
const buildEndpoints = (config: Config, openapi: OpenAPIV3.Document): OpenAPIV3.Document => {
  _.forEach(config.resources, (resource, resourceName) => {
    const resourceSchemaPrefix: string = getResourceSchemaPrefix(resourceName);

    // Add id parameter to components.parameters if at least one endpoint uses it
    if (_.some(resource.operations, (operation) => isIdOperation(operation))) {
      _.set(openapi, `components.parameters.${idParamName(resourceName)}`, {
        name: 'id',
        in: 'path',
        description: 'REPLACEME',
        required: true,
        schema: {
          type: 'string',
        },
      });
    }

    _.forEach(resource.operations, (operation) => {
      const method = getOperationMethod(operation);
      const path = getPath(operation, resource.plural);
      const parameters = getParameters(operation, resourceName, resource.paginate);
      const parametersSchema = !_.isEmpty(parameters) ? { parameters } : {};

      const requestBodySchema = _.includes(['post', 'patch'], method) ? {
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
      } : {};

      // add resource endpoints
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

    // add relationship endpoints
    _.forEach(resource.relationships, (relationship, relationshipName) => {
      const path = `${getPath('getById', resource.plural)}/relationships/${relationshipName}`;
      const relationshipSchemaPrefix = `${resourceSchemaPrefix}${getResourceSchemaPrefix(relationship.type)}Relationship`;
      const isToMany = relationship.relationshipType === 'toMany';
      const relationshipSchemaName = isToMany ? `${relationshipSchemaPrefix}Set` : relationshipSchemaPrefix;
      const relationshipResponseSchemaName = `${relationshipSchemaName}Result`;

      const relationshipSchema = getRelationshipSchema(relationship);
      if (!_.has(openapi, `components.schemas.${relationshipSchemaPrefix}`)) {
        _.set(openapi, `components.schemas.${relationshipSchemaPrefix}`, relationshipSchema);
      }

      const getResponseSchema = isToMany
        ? getRelationshipSetResultSchema
        : getRelationshipResultSchema;
      const responseSchema = getResponseSchema(
        resource,
        relationshipName,
        baseUrl,
        relationshipSchemaPrefix,
      );

      _.set(openapi, `components.schemas.${relationshipResponseSchemaName}`, responseSchema);

      _.set(openapi, `components.responses.${relationshipSchemaName}`, {
        description: 'README',
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${relationshipResponseSchemaName}`,
            },
          },
        },
      });

      const relationshipSchemaRef = {
        $ref: `#/components/schemas/${relationshipSchemaPrefix}`,
      };
      const arrayData = {
        type: 'array',
        items: relationshipSchemaRef,
      };
      const singleData = {
        type: 'object',
        allOf: [
          {
            nullable: true,
          },
          relationshipSchemaRef,
        ],
      };
      const relationshipRequestBody = {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'data',
              ],
              properties: {
                data: isToMany ? arrayData : singleData,
              },
            },
          },
        },
      };

      _.set(openapi, `components.requestBodies.${relationshipSchemaName}`, relationshipRequestBody);

      const pathsObject = _.reduce(
        ['get', 'patch', ...(isToMany ? ['post', 'delete'] : [])],
        (result: OpenAPIV3.PathsObject, method: string) => {
          const isUpdate = _.includes(['patch', 'post', 'delete'], method);

          const operationObject: OpenAPIV3.OperationObject = {
            description: 'REPLACEME',
            tags: [
              resource.plural,
              _.get(
                config,
                `resources.${relationship.type}.plural`,
                `<plural of ${relationship.type}>`,
              ),
            ],
            parameters: [
              {
                $ref: `#/components/parameters/${idParamName(resourceName)}`,
              },
            ],
          };

          if (isUpdate) {
            operationObject.requestBody = {
              $ref: `#/components/requestBodies/${relationshipSchemaName}`,
            };
          }

          operationObject.responses = {
            200: {
              $ref: `#/components/responses/${relationshipSchemaName}`,
            },
            ...(isUpdate ? {
              204: {
                $ref: '#/components/responses/204RelationshipUpdate',
              },
            } : {}),
            404: {
              $ref: '#/components/responses/404',
            },
            500: {
              $ref: '#/components/responses/500',
            },
          };

          result[method] = operationObject;
          return result;
        },
        {},
      );
      openapi.paths[path] = pathsObject;
    });
  });
  return openapi;
};

const loadConfig = async (): Promise<Config> => {
  const configFile = await fsPromises.open('generator-config.yaml', 'r');
  const config: Config = yaml.safeLoad(await configFile.readFile('utf8'));
  // TODO Assign default values, check schema at runtime
  return config;
};

/**
 * The main function. Builds an openapi document using a config file and writes the document to a
 * YAML file
 */
const main = async (): Promise<void> => {
  try {
    const config = await loadConfig();
    // TODO handle existing openapi document and avoid overwriting
    let openapi: OpenAPIV3.Document = init(config);
    baseUrl = _.get(openapi, 'servers[0].url');
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
