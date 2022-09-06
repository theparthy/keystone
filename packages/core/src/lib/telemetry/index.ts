import os from 'os';
import ci from 'ci-info';
import Conf from 'conf';
import fetch from 'node-fetch';
import { FieldData, ListSchemaConfig } from '../../types';
import { defaults } from '../config/defaults';
import { Configuration, Project, Device } from '../../types/telemetry';
import { telemetry as telemetryScript } from '../../scripts/telemetry';

// Load global telemetry config settings (if set)
const userConfig = new Conf<Configuration>({ projectName: 'keystonejs' });
const telemetry = userConfig.get('telemetry');

if (telemetry === false) {
  process.env.KEYSTONE_TELEMETRY_DISABLED = '1';
}

const telemetryDisabled = () => {
  return (
    !!process.env.KEYSTONE_TELEMETRY_DISABLED &&
    process.env.KEYSTONE_TELEMETRY_DISABLED !== '0' &&
    process.env.KEYSTONE_TELEMETRY_DISABLED !== 'false'
  );
};

// Disable NextJS & Prisma telemetry if the user has opted out of these
if (!!telemetry && !telemetry.prisma) {
  process.env.CHECKPOINT_DISABLE = '1';
}
if (!!telemetry && !telemetry.nextjs) {
  process.env.NEXT_TELEMETRY_DISABLED = '1';
}

export function sendTelemetryEvent(
  eventType: string,
  cwd: string,
  dbProvider: string,
  lists: ListSchemaConfig
) {
  try {
    if (telemetryDisabled()) {
      return;
    }

    if (telemetry === undefined) {
      telemetryScript('init');
    }

    const eventData = {
      ...deviceInfo(),
      ...projectInfo(cwd, lists),
      dbProvider,
      eventType,
    };

    console.log(`Sending telemetry event: ${JSON.stringify(eventData)}`);

    const telemetryEndpoint = process.env.KEYSTONE_TELEMETRY_ENDPOINT || defaults.telemetryEndpoint;
    const telemetryUrl = `${telemetryEndpoint}/v1/event`;

    if (process.env.KEYSTONE_TELEMETRY_DEBUG === '1') {
      console.log(`[Telemetry]: ${telemetryUrl}`);
      console.log(eventData);
    } else {
      // Do not `await` to keep non-blocking
      fetch(telemetryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })
        .then(
          () => {},
          () => {}
        )
        // Catch silently
        .catch(() => {});
    }
  } catch (err) {
    // Fail silently
  }
}

export const deviceInfo = (): Device => {
  const majorNodeVersion = process.versions.node.split('.')[0];

  return {
    last: new Date().toISOString().slice(0, 10),
    os: os.platform(),
    node: majorNodeVersion,
  };
};

const keystonePackages = (cwd: string) => {
  try {
    // Import the project's package.json
    const projectPkgJson = require(`${cwd}/package.json`);
    const dependancies: Record<string, string> = projectPkgJson.dependencies;

    // Match any packages that are in the @keystonejs or @keystone-next namespace
    const namespaceRegex = new RegExp(/^(@keystone-6|@opensaas|@k6-contrib)/);
    const packages = Object.fromEntries(
      Object.entries(dependancies).filter(([dependancyKey]) => namespaceRegex.test(dependancyKey))
    );

    return packages;
  } catch (err) {
    return { error: 'Could not read package.json' };
  }
};

const fieldCount = (lists?: ListSchemaConfig): Project['fields'] => {
  const fields: Project['fields'] = { unknown: 0 };
  if (!lists) {
    return fields;
  }
  Object.values(lists).forEach(list => {
    Object.entries(list.fields).map(([fieldKey, field]) => {
      //console.log(field.toString());
      //TODO: This doesn't work yet and is a WIP
      if (!field.__ksTelemetryFieldTypeName) {
        fields.unknown += 1;
        return;
      }
      if (!fields[field.__ksTelemetryFieldTypeName]) {
        fields[field.__ksTelemetryFieldTypeName] = 0;
      }
      fields[field.__ksTelemetryFieldTypeName] += 1;
    });
  });
  return fields;
};

// Get a the number of Lists in the project
const listCount = (lists?: ListSchemaConfig) => {
  if (!lists) {
    return 0;
  }
  return Object.keys(lists).length;
};

export const projectInfo = (cwd: string, lists: ListSchemaConfig): Project => {
  return {
    last: new Date().toISOString().slice(0, 10),
    lists: listCount(lists),
    versions: keystonePackages(cwd),
    fields: fieldCount(lists),
  };
};
