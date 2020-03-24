import { OpenAPIV3 } from 'openapi-types';

type OperationType =
  | 'get'
  | 'getById'
  | 'post'
  | 'patchById'
  | 'deleteById';

export interface Relationship {
  relationshipType: 'toOne' | 'toMany';
  type: string;
}

interface SubResource {
  resource: string;
  many: boolean;
}

export interface Resource {
  /**
   * @default ""
   */
  plural: string;
  /**
   * @default true
   */
  selfLinks: boolean;
  /**
   * @default false
   */
  paginate: boolean;
  /**
   * @default false
   */
  compoundDocuments: boolean;
  /**
   * @default false
   */
  sparseFieldsets: boolean;
  /**
   * @default []
   */
  operations: Array<OperationType>;
  /**
   * @default "all"
   */
  getAttributes: 'all' | Array<string>;
  /**
   * @default "all"
   */
  postAttributes: 'all' | Array<string>;
  /**
   * @default "all"
   */
  patchAttributes: 'all' | Array<string>;
  /**
   * @default "all"
   */
  requiredPostAttributes: 'all' | Array<string>;
  /**
   * @default {}
   */
  attributes: { [key: string]: OpenAPIV3.SchemaObject };
  /**
   * @default {}
   */
  relationships: { [key: string]: Relationship };
  /**
   * @default {}
   */
  subResources: { [key: string]: SubResource };
}

export interface Config {
  /**
   * @default "v1"
   */
  version: string;
  /**
   * @default {}
   */
  resources: { [resourceName: string]: Resource };
  /**
   * @default "REPLACEME"
   */
  title: string;
  /**
   * @default "REPLACEME"
   */
  description: string;
  /**
   * @default "REPLACEME"
   */
  githubUrl: string;
}
