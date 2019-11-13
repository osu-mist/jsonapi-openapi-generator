import { OpenAPIV3 } from 'openapi-types';

type OperationType =
  | 'get'
  | 'getById'
  | 'post'
  | 'patchById'
  | 'deleteById';

interface Relationship {
  relationshipType: 'toOne' | 'toMany';
  local: boolean;
}

interface SubResource {
  resource: string;
  many: boolean;
}

interface Resource {
  plural: string;
  selfLinks: boolean;
  paginate: boolean;
  compoundDocuments: boolean;
  sparseFieldsets: boolean;
  operations: Array<OperationType>;
  requiredPostAttributes: 'all' | Array<string>;
  attributes: { [key: string]: OpenAPIV3.SchemaObject };
  relationships: { [key: string]: Relationship };
  subResources: { [key: string]: SubResource };
}

export interface Config {
  version: string;
  resources: { [resourceName: string]: Resource };
  title: string;
  description: string;
  githubUrl: string;
}
