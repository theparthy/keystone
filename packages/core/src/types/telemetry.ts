type Consent = false | { last_sent?: string; optin_at: string };

export type Configuration = {
  telemetry:
    | {
        device: Consent;
        projectDefaults: Consent;
        projects?: {
          [key: string]: Consent;
        };
      }
    | false
    | undefined;
};

export type Device = {
  previous: string; // new Date().toISOString().slice(0, 10)
  os: string; // `linux` | `darwin` | `windows` | ... // os.platform()
  node: string; // `14` | ... | `18` // process.version.split('.').shift().slice(1)
};

export type Project = {
  previous: string; // new Date().toISOString().slice(0, 10)
  // omitted uuid for <BII
  // omitted anything GraphQL related <BII

  // filtered to packages with the prefixes
  // - `@keystone-6`
  // - `@k6-contrib`
  // - `@opensaas`
  // - ...
  versions: { [key: string]: string };
  lists: number;

  // uses a new `field.__ksTelemetryFieldTypeName` for the key, defaults to `unknown`
  fields: {
    [key: string]: number;
  };
};

// when running `keystone dev`
export type DevEvent = {
  when: number; // Date.now(), added by server
  production: boolean; // process.env.NODE_ENV === 'production'
};

// [also] when running `keystone dev`
export type ShareDeviceEvent = {
  when: number; // Date.now(), added by server
  device: Device;
};

// [also] when running `keystone dev`
export type ShareProjectEvent = {
  when: number; // Date.now(), added by server
  project: Project;
};
