import { createHash } from 'crypto';
import { GraphQLSchema } from 'graphql';
import { ListSchemaConfig } from '../../types';

// One way SHA256 hash. When reaching the server any hashed property
// will be rehashed with a salt before storage.
const hashText = (text: string) => {
  return createHash('sha256').update(text).digest('hex');
};

const keystonePackages = (cwd: string) => {
  try {
    // Import the project's package.json
    const projectPkgJson = require(`${cwd}/package.json`);
    const dependancies: { [key: string]: string } = projectPkgJson.dependencies;

    // Match any packages that are in the @keystonejs or @keystone-next namespace
    const namespaceRegex = new RegExp(/^@keystone(js|-next)/);
    const packages = Object.fromEntries(
      Object.entries(dependancies).filter(([dependancyKey, dependancyVersion]) =>
        namespaceRegex.test(dependancyKey)
      )
    );

    return packages;
  } catch (err) {
    return null;
  }
};

const listFieldCount = (lists?: ListSchemaConfig) => {
  if (!lists) {
    return null;
  }
  const listCount = Object.values(lists).map(list => {
    return Object.keys(list.fields).length;
  });

  return listCount;
};

export function projectInfo(cwd: string, lists: ListSchemaConfig, graphQLSchema: GraphQLSchema) {
  return {
    schemaHash: hashText(JSON.stringify(graphQLSchema)),
    fieldCounts: listFieldCount(lists),
    keystonePackages: keystonePackages(cwd),
  };
}
