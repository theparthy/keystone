import os from 'os';
import ci from 'ci-info';
import Conf from 'conf';
import fetch from 'node-fetch';
import { Configuration, Project, Device, Consent } from '../types/telemetry';
import { defaults } from './config/defaults';
import { InitialisedList } from './core/types-for-lists';
import { DatabaseProvider } from '../types';

const isDebugging = () => {
  return (
    !!process.env.KEYSTONE_TELEMETRY_DEBUG &&
    process.env.KEYSTONE_TELEMETRY_DEBUG !== '0' &&
    process.env.KEYSTONE_TELEMETRY_DEBUG !== 'false'
  );
};

let userConfig: Conf<Configuration>;
let telemetry: Configuration['telemetry'];
try {
  // Load global telemetry config settings (if set)
  userConfig = new Conf<Configuration>({ projectName: 'keystonejs' });
  telemetry = userConfig.get('telemetry');

  if (telemetry === false) {
    process.env.KEYSTONE_TELEMETRY_DISABLED = '1';
  }
} catch (err) {
  // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
  if (isDebugging()) {
    console.log(err);
  }
}
const todaysDate = new Date().toISOString().slice(0, 10);

const telemetryDisabled = () => {
  return (
    ci.isCI || // Don't run in CI
    process.env.NODE_ENV === 'production' || // Don't run in production
    (!!process.env.KEYSTONE_TELEMETRY_DISABLED &&
      process.env.KEYSTONE_TELEMETRY_DISABLED !== '0' &&
      process.env.KEYSTONE_TELEMETRY_DISABLED !== 'false')
  );
};

function enableAndNotify(cwd: string) {
  const newTelemetry: Configuration['telemetry'] = {
    device: { informedAt: new Date().toISOString() },
    projects: {
      default: { informedAt: new Date().toISOString() },
      [cwd]: { informedAt: new Date().toISOString() },
    },
  };
  userConfig.set('telemetry', newTelemetry);
  console.log(`
KeystoneJS telemetry has been enabled for more information see: https://keystonejs.com/telemetry
  `);
}

export function ensureTelemetry(cwd: string) {
  if (telemetryDisabled()) {
    return;
  }
  if (telemetry === undefined) {
    enableAndNotify(cwd);
    try {
      telemetry = userConfig.get('telemetry');
    } catch (err) {
      // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
      if (isDebugging()) {
        console.log(err);
      }
    }
  }
}

export function sendTelemetryEvent(
  cwd: string,
  lists: Record<string, InitialisedList>,
  dbProviderName: DatabaseProvider
) {
  try {
    if (telemetryDisabled()) {
      return;
    }
    if (!telemetry) {
      return;
    }
    if (telemetry.projects[cwd] === undefined) {
      userConfig.set(`telemetry.projects${cwd}`, telemetry.projects.default);
      telemetry.projects[cwd] = telemetry.projects.default;
    }
    if (!!telemetry.projects[cwd]) {
      sendProjectTelemetryEvent(cwd, lists, dbProviderName, telemetry.projects[cwd]);
    }
    if (!!telemetry.device) {
      sendDeviceTelemetryEvent(telemetry.device);
    }
  } catch (err) {
    // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
    if (isDebugging()) {
      console.log(err);
    }
  }
}

const keystonePackages = (cwd: string) => {
  try {
    const projectPkgVersions = require('child_process').execSync('npm list --json', {
      encoding: 'utf8',
    });
    const projectPkgJson = require(`${cwd}/package.json`);
    const dependanciesPkgVersions = JSON.parse(projectPkgVersions).dependencies;
    // Get the dependancies from the npm list command, if the project is in a monorepo the dependancies will be nested in an object with the key of the package name
    const dependancies: Record<string, { version: string }> =
      dependanciesPkgVersions[projectPkgJson.name]?.dependencies ||
      dependanciesPkgVersions.dependencies;

    // Match any packages that are in the @keystone-6, @opensaas, or @k6-contrib namespace
    const namespaceRegex = new RegExp(/^(@keystone-6|@opensaas|@k6-contrib)/);
    const packages = Object.entries(dependancies)
      .filter(([dependancyKey]) => namespaceRegex.test(dependancyKey))
      .reduce((acc, [key, value]) => {
        acc[key] = value.version;
        return acc;
      }, {} as Record<string, string>);
    return packages;
  } catch (err) {
    console.log(err);

    return { error: 'Could not read package.json' };
  }
};

const fieldCount = (lists?: Record<string, InitialisedList>): Project['fields'] => {
  if (!lists) {
    return { unknown: 0 };
  }
  const fields: Project['fields'] = { unknown: 0 };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [_listKey, { resolvedDbFields }] of Object.entries(lists)) {
    for (const [fieldPath, field] of Object.entries(resolvedDbFields)) {
      const fieldType = field.__ksTelemetryFieldTypeName;

      if (!fieldType) {
        // skip id fields
        if (fieldPath.endsWith('id')) continue;

        //skip from relationship fields
        if (fieldPath.startsWith('from')) continue;
        if (field.kind === 'relation') {
          fields['@keystone-6/relationship'] = (fields['@keystone-6/relationship'] || 0) + 1;
          continue;
        }
        fields.unknown++;
        continue;
      }
      if (!fields[fieldType]) {
        fields[fieldType] = 0;
      }
      fields[fieldType] += 1;
    }
  }
  return fields;
};

// Get a the number of Lists in the project
const listCount = (lists?: Record<string, InitialisedList>) => {
  if (!lists) {
    return 0;
  }
  return Object.keys(lists).length;
};

function sendEvent(eventType: 'project' | 'device', eventData: Project | Device) {
  try {
    const telemetryEndpoint = process.env.KEYSTONE_TELEMETRY_ENDPOINT || defaults.telemetryEndpoint;
    const telemetryUrl = `${telemetryEndpoint}/v1/event/${eventType}`;

    if (process.env.KEYSTONE_TELEMETRY_DISPLAY === '1') {
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
        .catch(err => {
          // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
          if (isDebugging()) {
            console.log(err);
          }
        });
    }
  } catch (err) {
    // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
    if (isDebugging()) {
      console.log(err);
    }
  }
}

function sendProjectTelemetryEvent(
  cwd: string,
  lists: Record<string, InitialisedList>,
  dbProviderName: DatabaseProvider,
  projectConfig: Consent
) {
  try {
    if (projectConfig === false) {
      return;
    }
    if (!!projectConfig.lastSentDate && projectConfig.lastSentDate >= todaysDate) {
      if (isDebugging()) {
        console.log('Project telemetry already sent but debugging is enabled');
      } else {
        return;
      }
    }
    const projectInfo: Project = {
      lastSentDate: projectConfig.lastSentDate || '',
      fields: fieldCount(lists),
      lists: listCount(lists),
      versions: keystonePackages(cwd),
      database: dbProviderName,
    };
    sendEvent('project', projectInfo);
    userConfig.set(`telemetry.projects.${cwd}.lastSentDate`, todaysDate);
  } catch (err) {
    // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
    if (isDebugging()) {
      console.log(err);
    }
  }
}

function sendDeviceTelemetryEvent(deviceConsent: Consent) {
  try {
    if (deviceConsent === false) return;
    if (deviceConsent.lastSentDate && deviceConsent.lastSentDate >= todaysDate) {
      if (isDebugging()) {
        console.log('Device telemetry already sent but debugging is enabled');
      } else {
        return;
      }
    }
    const deviceInfo: Device = {
      lastSentDate: deviceConsent.lastSentDate || '',
      os: os.platform(),
      node: process.versions.node.split('.')[0],
    };
    sendEvent('device', deviceInfo);
    userConfig.set(`telemetry.device.lastSentDate`, todaysDate);
  } catch (err) {
    // Fail silently unless KEYSTONE_TELEMETRY_DEBUG is set to 1
    if (isDebugging()) {
      console.log(err);
    }
  }
}
