const { spawn } = require('node:child_process');
const path = require('node:path');

const cwd = __dirname;
const nodeExec = process.execPath;

const children = [];
let shuttingDown = false;

function startProcess(label, command, args) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`${label} exited with ${reason}`);
    shutdown(code ?? 1);
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`${label} failed to start`, error);
    shutdown(1);
  });

  children.push(child);
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startProcess('API server', nodeExec, [path.join(cwd, 'server.js')]);
startProcess('Angular dev server', nodeExec, [
  path.join(cwd, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
  'serve',
  '--proxy-config',
  'proxy.conf.json',
]);
