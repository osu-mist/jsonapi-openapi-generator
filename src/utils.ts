import _ from 'lodash';

/**
 * Gets the prefix of the resource schema in components/schemas
 *
 * @param resourceName
 * @returns The prefix
 */
const getResourceSchemaPrefix = (resourceName: string): string => _.capitalize(resourceName);

export {
  getResourceSchemaPrefix,
};
