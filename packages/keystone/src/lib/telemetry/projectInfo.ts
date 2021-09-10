import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { ListSchemaConfig } from '../../types';
import { GraphQLSchema } from 'graphql';

// One way SHA256 hash. When reaching the server any hashed property
// will be rehashed with a salt before storage.
const hashText = (text: string) => {
  return createHash('sha256').update(text).digest('hex');
};

// Normalise git URLs between SSH/HTTPS/HTTP and remove usernames
// Works for the following formats
// git@github.com:keystonejs/keystone.git
// https://github.com/keystonejs/keystone.git
// http://github.com/keystonejs/keystone.git
// https://username@github.com/keystonejs/keystone.git
const normalizedHashedGitOrigin = (originText: string) => {
  const protocoless = originText.match(/.*(@|https*:\/\/)(.+)$/);
  if (!protocoless || protocoless.length < 2) {
    return null;
  }

  const normalized = protocoless[2].replace(/:/g, '/');
  return hashText(normalized);
};

const gitOrigin = () => {
  try {
    const originBuffer = execSync(`git config --local --get remote.origin.url`, {
      timeout: 500,
      stdio: `pipe`,
    });

    // Trim to remove \n
    const remote = originBuffer.toString().trim();
    return normalizedHashedGitOrigin(remote);
  } catch (err) {
    return null;
  }
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
    gitOriginHash: process.env.REPOSITORY_URL || gitOrigin(),
    schemaHash: hashText(JSON.stringify(graphQLSchema)),
    fieldCounts: listFieldCount(lists),
    keystonePackages: keystonePackages(cwd),
  };
}
