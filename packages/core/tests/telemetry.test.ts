import fetch, { Response } from 'node-fetch';
import child_process from 'child_process';
import { sendTelemetryEvent } from '../src/lib/telemetry';
import { deviceInfo } from '../src/lib/telemetry/deviceInfo';
import { projectInfo } from '../src/lib/telemetry/projectInfo';
import { ListSchemaConfig } from '../src/types';
import { GraphQLSchema } from 'graphql';

const deviceData = {
  deviceHash: 'device',
  os: 'keystone-os',
  osVersion: '0.0.1',
  nodeVersion: process.version,
  locale: 'AU_en',
  isCI: false,
};

const projectData = {
  gitOriginHash: 'git@origin',
  schemaHash: { description: 'graphQLSchema' } as GraphQLSchema,
  fieldCounts: [3, 2],
  keystonePackages: { '@keystonejs/keystone': '1.2.3' },
};

const eventData = {
  ...deviceData,
  ...projectData,
  dbProvider: 'mydb',
  eventType: 'test-event',
};

const fetchOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const defaultFetchParam = {
  ...fetchOptions,
  body: JSON.stringify({
    ...eventData,
    deviceHash: `${eventData.deviceHash}-hashed`,
    schemaHash: `${JSON.stringify(eventData.schemaHash)}-hashed`,
    gitOriginHash: `origin-hashed`,
  }),
};

const lists: ListSchemaConfig = {
  Thing: {
    fields: {
      // @ts-ignore
      id: () => {},
      // @ts-ignore
      name: () => {},
      // @ts-ignore
      thing: () => {},
    },
  },
  Stuff: {
    fields: {
      // @ts-ignore
      id: () => {},
      // @ts-ignore
      name: () => {},
    },
  },
};

const cwd = 'path';

jest.mock('node-machine-id', () => {
  return {
    machineIdSync: () => `device-hashed`,
  };
});

jest.mock('os', () => {
  return { platform: () => 'keystone-os', release: () => '0.0.1' };
});

jest.mock('conf', () => {
  return jest.fn().mockImplementation(() => ({
    get: () => false, // Must return false else telemetry is disabled
    set: () => {},
  }));
});

jest.mock('crypto', () => {
  return { createHash: () => ({ update: (text: string) => ({ digest: () => `${text}-hashed` }) }) };
});

jest.mock('node-fetch', () => jest.fn());

jest.mock(
  'path/package.json',
  () => {
    return { dependencies: { '@keystonejs/keystone': '1.2.3' } };
  },
  { virtual: true }
);

process.env.LC_ALL = eventData.locale;

describe('telemetry', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const defaultFetchMock = () => mockFetch.mockImplementationOnce(async () => ({} as Response));
  const defaultGitOrigin = Buffer.from('git@origin');
  const mockedExecSync = jest.spyOn(child_process, 'execSync');
  const defaultExecSyncMock = () => mockedExecSync.mockReturnValueOnce(defaultGitOrigin);

  afterEach(() => {
    // Reset env variables
    delete process.env.KEYSTONE_TELEMETRY_DISABLED;
    delete process.env.KEYSTONE_TELEMETRY_ENDPOINT;
    delete process.env.KEYSTONE_TELEMETRY_DEBUG;
    delete process.env.NOW_BUILDER;

    // clear mocks (fetch specifically)
    jest.clearAllMocks();
  });

  test('sendTelemetryEvent calls with expected data', () => {
    defaultExecSyncMock();
    defaultFetchMock();

    sendTelemetryEvent(eventData.eventType, cwd, eventData.dbProvider, lists, eventData.schemaHash);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://telemetry.keystonejs.com/v1/event`,
      defaultFetchParam
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('sendTelemetryEvent uses endpoint override', () => {
    defaultExecSyncMock();
    defaultFetchMock();

    const updatedEndpoint = 'https://keylemetry.com';
    process.env.KEYSTONE_TELEMETRY_ENDPOINT = updatedEndpoint;

    sendTelemetryEvent(eventData.eventType, cwd, eventData.dbProvider, lists, eventData.schemaHash);

    expect(mockFetch).toHaveBeenCalledWith(`${updatedEndpoint}/v1/event`, defaultFetchParam);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("sendTelemetryEvent doesn't fetch when telemetry is disabled", () => {
    process.env.KEYSTONE_TELEMETRY_DISABLED = '1';
    defaultFetchMock();
    sendTelemetryEvent(eventData.eventType, cwd, eventData.dbProvider, lists, eventData.schemaHash);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  test('fetch throwing an error wont bubble up', () => {
    mockFetch.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(sendTelemetryEvent).not.toThrow();

    sendTelemetryEvent(eventData.eventType, cwd, eventData.dbProvider, lists, eventData.schemaHash);
  });

  test('TELEMETRY_DEBUG should log the output of telemetry but not fetch', () => {
    process.env.KEYSTONE_TELEMETRY_DEBUG = '1';
    defaultFetchMock();
    sendTelemetryEvent(eventData.eventType, cwd, eventData.dbProvider, lists, eventData.schemaHash);
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  test('Encoding in locale should be removed', () => {
    process.env.LC_ALL = 'en_AU.UTF8';
    const deviceResults = deviceInfo();
    expect(deviceResults.locale).toBe('en_AU');
    process.env.LC_ALL = eventData.locale;
  });

  test('normalize git origin works with different git urls', () => {
    mockedExecSync.mockReturnValueOnce(Buffer.from('git@github.com:keystone/keystone.git'));
    const projectResultsSSH = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsSSH.gitOriginHash).toBe('github.com/keystone/keystone.git-hashed');

    mockedExecSync.mockReturnValueOnce(Buffer.from('https://github.com/keystone/keystone.git'));
    const projectResultsHTTPS = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsHTTPS.gitOriginHash).toBe('github.com/keystone/keystone.git-hashed');

    mockedExecSync.mockReturnValueOnce(Buffer.from('http://github.com/keystone/keystone.git'));
    const projectResultsHTTP = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsHTTP.gitOriginHash).toBe('github.com/keystone/keystone.git-hashed');

    mockedExecSync.mockReturnValueOnce(
      Buffer.from('https://username@github.com/keystone/keystone.git')
    );
    const projectResultsHTTPSUsername = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsHTTPSUsername.gitOriginHash).toBe(
      'github.com/keystone/keystone.git-hashed'
    );

    mockedExecSync.mockReturnValueOnce(Buffer.from(''));
    const projectResultsEmptyString = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsEmptyString.gitOriginHash).toBe(null);

    mockedExecSync.mockReturnValueOnce(Buffer.from('git@github.com:keystone/keystone.git\n'));
    const projectResultsNewLine = projectInfo(cwd, lists, eventData.schemaHash);
    expect(projectResultsNewLine.gitOriginHash).toBe('github.com/keystone/keystone.git-hashed');
  });
});
