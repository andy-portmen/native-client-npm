const os = require('os');
const {execSync} = require('child_process');

const platform = os.platform();

try {
  if (platform === 'win32') {
    console.log(' -> Detected platform: Windows');
    execSync('os\\windows\\uninstall.bat', {
      stdio: 'inherit'
    });
  }
  else if (platform === 'darwin') {
    console.log(' -> Detected platform: macOS');
    execSync('os/mac/uninstall.sh', {
      stdio: 'inherit'
    });
  }
  else if (platform === 'linux') {
    console.log(' -> Detected platform: Linux');
    execSync('os/linux/uninstall.sh', {
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
