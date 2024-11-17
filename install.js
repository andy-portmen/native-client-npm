const os = require('os');
const {execSync} = require('child_process');

const platform = os.platform();

const additionalArgs = process.argv.slice(2).join(' ');

try {
  if (platform === 'win32') {
    console.log(' -> Detected platform: Windows');
    execSync('os\\windows\\install.bat ' + additionalArgs, {
      stdio: 'inherit'
    });
  }
  else if (platform === 'darwin') {
    console.log(' -> Detected platform: macOS');
    execSync(process.execPath + ' os/mac/install.js ' + additionalArgs, {
      stdio: 'inherit'
    });
  }
  else if (platform === 'linux') {
    console.log(' -> Detected platform: Linux');
    execSync(process.execPath + ' os/linux/install.js ' + additionalArgs, {
      stdio: 'inherit'
    });
  }
  else {
    console.error(`Unsupported platform: ${platform}`);
  }
}
catch (error) {
  console.error('Error executing platform-specific script:', error);
}
