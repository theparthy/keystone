import chalk from 'chalk';
import Conf from 'conf';
import { confirmPrompt } from '../lib/prompts';
import { Configuration } from '../types/telemetry';

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
  const config = new Conf<Configuration>({ projectName: 'keystonejs', clearInvalidConfig: true });
  switch (option) {
    case 'status':
      const telemetryData = config.get('telemetry');
      if (telemetryData) {
        console.log(enabledText(telemetryData));
      } else if (telemetryData === false) {
        console.log(disabledText);
      } else {
        console.log(initText);
      }
      break;
    case 'clear':
      config.delete('telemetry');
      console.log(initText);
      break;
    case 'disable' || 'disabled':
      config.set('telemetry', false);
      console.log(disabledText);
      break;
    case 'init':
      config.delete('telemetry');
      await initGlobalTelemetry(config, cwd);
      break;
    default:
      console.log(option ? `Invalid option: ${option}` : '');
      console.log(usageText);
  }
  return;
}

const deviceConsentText = `
Welcome to Keystone!
We'd love to pilfer some analytics, but we don't want to do it without your consent.

Do you consent to us sending the following information about your developer environment? (only when you use 'keystone dev', at most once daily)

- Last date you used 'keystone dev'
- Node version
- Operating System

`;

const projectConsentText = `
Awesome! You are a great human being and we love you for helping us out.
But what about some more information eh, we'd love to know about your projects too, but maybe that's a bit nosy.

Do you consent to us sending the following additional information about your projects? (only when you use 'keystone dev', at most once daily)

- Last date you used 'keystone dev' for this project
- The versions of any '@keystone-6', '@opensaas' and '@k6-contrib' [subject to change by community contribution] packages that you are using in this project 
- The number of lists you have
- The name and number of field types that you are using

`;

async function initGlobalTelemetry(config: Conf<Configuration>, cwd: string) {
  const newTelemetry: Configuration['telemetry'] = {
    device: false,
    projects: {
      default: false,
    },
  };
  console.log(deviceConsentText);
  const deviceContent = await confirmPrompt('Yes (y) / No (n)', true);
  if (deviceContent) {
    newTelemetry.device = { informedAt: new Date().toISOString() };
  }
  console.log(projectConsentText);
  const projectContent = await confirmPrompt('Yes (y) / No (n)', true);

  if (projectContent) {
    newTelemetry.projects.default = { informedAt: new Date().toISOString() };
    newTelemetry.projects = {
      default: { informedAt: new Date().toISOString() },
      [cwd]: { informedAt: new Date().toISOString() },
    };
  }
  config.set('telemetry', newTelemetry);
  console.log(`
KeystoneJS telemetry: ${chalk.green('Initialized')}
  `);
}
