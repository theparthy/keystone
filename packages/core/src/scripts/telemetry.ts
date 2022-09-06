import chalk from 'chalk';
import Conf from 'conf';
import { initConfig } from '../lib/config/initConfig';
import { requireSource } from '../lib/config/requireSource';
import { confirmPrompt } from '../lib/prompts';
import { deviceInfo, projectInfo } from '../lib/telemetry';
import { Configuration, Device, Project } from '../types/telemetry';
import { getConfigPath } from './utils';

export async function telemetry(cwd: string, option?: string) {
  const usageText = `
  The telemetry command requires a valid option
  
      Usage
        $ keystone telemetry [option]
      Options
        status      displays the current telemetry configuration
        clear       clears the current telemetry configuration (if any)
        init        clears the current telemetry configuration (if any) and initializes the telemetry configuration
        disable     clears the current telemetry configuration (if any) and disables all telemetry on this device
      `;

  const disabledText = `
KeystoneJS telemetry: ${chalk.red('Disabled')}
    
  Keystone telemetry is disabled on this device.
  For more details visit: https://keystonejs.com/telemetry`;

  const enabledText = (telemetryData: Configuration['telemetry']) => `
KeystoneJS telemetry: ${chalk.green('Enabled')}
   
  Telemetry is configured as follows:

${JSON.stringify(telemetryData, null, 2)}

  Telemetry is completely anonymous and helps us make Keystone better.
  For more details visit: https://keystonejs.com/telemetry`;

  const initText = `
KeystoneJS telemetry: ${chalk.red('Not Inilialized')}

  Please run ${chalk.green('keystone telemetry init')} to initialize the telemetry configuration.


  Telemetry is completely anonymous and helps us make Keystone better.
  For more details visit: https://keystonejs.com/telemetry
  `;
  // Set a generic Keystone project name that we can use across keystone apps
  // e.g. create-keystone-app. By default it uses the package name
  const config = new Conf<Configuration>({ projectName: 'keystonejs' });
  if (option === 'status') {
    const telemetryData = config.get('telemetry');
    if (telemetryData) {
      console.log(enabledText(telemetryData));
    } else if (telemetryData === false) {
      console.log(disabledText);
    } else {
      console.log(initText);
    }
  } else if (option === 'clear') {
    config.delete('telemetry');
    console.log(initText);
  } else if (option === 'disable' || option === 'disabled') {
    config.set('telemetry', false);
    console.log(disabledText);
  } else if (option === 'init') {
    config.delete('telemetry');
    await initGlobalTelemetry(config, cwd);
  } else {
    console.log(usageText);
  }
  return;
}

const deviceConsentText = (device: Device) => `
Welcome to Keystone!
We'd love to pilfer some analytics, but we don't want to do it without your consent.

Do you consent to us sending the following information about your developer environment? (only when you use 'keystone dev', at most once daily)

${JSON.stringify(device, null, 2)}

Yes (y) / No (n)
`;

const projectConsentText = (project: Project) => `
Awesome! You are a great human being and we love you for helping us out.
But what about some more information eh, we'd love to know about your projects too, but maybe that's a bit nosy.

Do you consent to us sending the following additional information about your projects? (only when you use 'keystone dev', at most once daily)

${JSON.stringify(project, null, 2)}

Yes (y) / No (n)
`;

async function initGlobalTelemetry(config: Conf<Configuration>, cwd: string) {
  const newTelemetry: Configuration['telemetry'] = {
    device: false,
    prisma: false,
    nextjs: false,
    projects: false,
  };
  console.log('A');

  const deviceContent = await confirmPrompt(deviceConsentText(deviceInfo()), true);
  if (deviceContent) {
    newTelemetry.device = { last_sent: '', optin_at: new Date().toISOString() };
  }
  console.log('B');
  // TODO: do this better maybe without init config
  const keystoneConfig = initConfig(requireSource(getConfigPath(cwd)).default);
  console.log('C');

  const projectContent = await confirmPrompt(
    projectConsentText(projectInfo(cwd, keystoneConfig.lists)),
    true
  );

  if (projectContent) {
    newTelemetry.projects = { last_sent: '', optin_at: new Date().toISOString() };
  }

  newTelemetry.nextjs = await confirmPrompt('Are you sure you want to track NextJS?', true);

  newTelemetry.prisma = await confirmPrompt('Are you sure you want to track Prisma?', true);

  config.set('telemetry', newTelemetry);
  console.log(`
KeystoneJS telemetry: ${chalk.green('Initialized')}
  `);
}
