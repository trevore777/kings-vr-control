#!/usr/bin/env node
// Teacher-operated USB installer. Never selects a device implicitly.
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve, extname } = require('node:path');

function run(args) {
  const result = spawnSync('adb', args, { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) {
    console.error('ADB is unavailable. Install Android platform-tools or use SideQuest Advanced Installer.');
    process.exit(1);
  }
  process.exitCode = result.status || 0;
}

const [action, serial, apk] = process.argv.slice(2);
if (action === 'list' && !serial && !apk) run(['devices', '-l']);
else if (action === 'install' && serial && apk) {
  const apkPath = resolve(apk);
  if (!existsSync(apkPath) || extname(apkPath).toLowerCase() !== '.apk') {
    console.error('Provide an existing .apk file from a vetted source.');
    process.exit(2);
  }
  run(['-s', serial, 'install', '-r', apkPath]);
} else {
  console.error('Usage: node tools/quest-usb.cjs list | install <ADB_SERIAL> <APP.apk>');
  process.exit(2);
}
