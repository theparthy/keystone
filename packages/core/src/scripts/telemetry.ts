import chalk from 'chalk';
import Conf from 'conf';

export async function telemetry(status?: string) {
  if (!status) {
    console.log(`
The telemetry command requires an option

    Usage
      $ keystone-next telemetry [option]
    Options
      status      displays if telemetry is enabled or disabled
      enable      enable telemetry on this device
      disable     disable telemetry on this device
    `);
    return;
  }

  const disabledText = `
KeystoneJS telemetry: ${chalk.red('Disabled')}
    
  Keystone telemetry is disabled on this device.
  For more details visit: https://keystonejs.com/telemetry`;

  const enabledText = `
KeystoneJS telemetry: ${chalk.green('Enabled')}
    
  Telemetry is completely anonymous and helps us make Keystone better.
  For more details visit: https://keystonejs.com/telemetry`;

  // Set a generic Keystone project name that we can use across keystone apps
  // e.g. create-keystone-app. By default it uses the package name
  const config = new Conf({ projectName: 'keystonejs' });
  if (status === 'status') {
    const telemetryDisabled = config.get('telemetry.disabled');
    console.log(telemetryDisabled ? disabledText : enabledText);
  } else if (status === 'enable' || status === 'enabled') {
    config.delete('telemetry.disabled');
    console.log(enabledText);
  } else if (status === 'disable' || status === 'disabled') {
    config.set('telemetry.disabled', true);
    console.log(disabledText);
  }
}
