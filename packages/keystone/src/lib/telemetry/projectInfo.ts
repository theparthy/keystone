import { createHmac } from 'crypto';
import { GraphQLSchema } from 'graphql';
import { ListSchemaConfig } from '../../types';

// One way SHA256 hash with a salt that is only available on the client
const hashText = (text: string, salt: string) => {
  return createHmac('sha256', salt).update(text).digest('hex');
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

// Get a summary of how many fields are being used in each list.
// In the format { <field count>: <total lists with that field count> }
// E.g { '2': 1, '4': 2, '6': 1 }
const listFieldCount = (lists?: ListSchemaConfig) => {
  if (!lists) {
    return null;
  }

  const listCount: Record<string, number> = {};
  Object.values(lists).forEach(list => {
    const fieldCount = Object.keys(list.fields).length;
    if (!listCount[fieldCount]) {
      listCount[fieldCount] = 0;
    }
    listCount[fieldCount] = listCount[fieldCount] + 1;
  });

  return listCount;
};

export function projectInfo(
  cwd: string,
  lists: ListSchemaConfig,
  graphQLSchema: GraphQLSchema,
  salt: string
) {
  return {
    schemaHash: hashText(JSON.stringify(graphQLSchema), salt),
    fieldCounts: listFieldCount(lists),
    keystonePackages: keystonePackages(cwd),
  };
}
