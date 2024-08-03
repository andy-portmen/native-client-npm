'use strict';

function lazyRequire(lib, name) {
  if (!name) {
    name = lib;
  }
  global.__defineGetter__(name, function() {
    return require(lib);
  });
  return global[name];
}

const spawn = require('child_process').spawn;
const os = lazyRequire('os');
const path = lazyRequire('path');

let server;
const sprocess = [];

const config = {
  version: '1.0.3'
};
// closing node when parent process is killed
process.stdin.resume();
process.stdin.on('end', () => {
  sprocess.forEach(ps => ps.kill());
  try {
    server.close();
    server.unref();
  }
  catch (e) {}
  process.exit();
});

// process.on('uncaughtException', e => console.error(e));

function observe(msg, push, done) {
  if (msg.cmd === 'version') {
    push({
      version: config.version
    });
    done();
  }
  if (msg.cmd === 'spec') {
    push({
      version: config.version,
      env: process.env,
      separator: path.sep,
      tmpdir: os.tmpdir()
    });
    done();
  }
  else if (msg.cmd === 'echo') {
    push(msg);
    done();
  }
  else if (msg.cmd === 'spawn') {
    if (msg.env) {
      msg.env.forEach(n => process.env.PATH += path.delimiter + n);
    }
    const p = Array.isArray(msg.command) ? path.join(...msg.command) : msg.command;
    const sp = spawn(p, msg.arguments || [], Object.assign({env: process.env}, msg.properties));

    if (msg.kill) {
      sprocess.push(sp);
    }

    sp.stdout.on('data', stdout => push({stdout}));
    sp.stderr.on('data', stderr => push({stderr}));
    sp.on('close', code => {
      push({
        cmd: msg.cmd,
        code
      });
      done();
    });
    sp.on('error', e => {
      push({
        code: 1007,
        error: e.message
      });
      done();
    });
  }
  else if (msg.cmd === 'exec') {
    if (msg.env) {
      msg.env.forEach(n => process.env.PATH += path.delimiter + n);
    }
    const p = Array.isArray(msg.command) ? path.join(...msg.command) : msg.command;
    const sp = spawn(p, msg.arguments || [], Object.assign({
      env: process.env,
      detached: true
    }, msg.properties));
    if (msg.kill) {
      sprocess.push(sp);
    }
    let stderr = '';
    let stdout = '';
    sp.stdout.on('data', data => stdout += data);
    sp.stderr.on('data', data => stderr += data);
    sp.on('close', code => {
      push({
        code,
        stderr,
        stdout
      });
      done();
    });
  }
  else if (msg.cmd === 'env') {
    push({
      env: process.env
    });
    done();
  }
  // this is from openstyles/native-client
  else if ('script' in msg) {
    let close;
    const exception = e => {
      push({
        code: -1,
        type: 'exception',
        error: e.stack
      });
      close();
    };
    close = () => {
      process.removeListener('uncaughtException', exception);
      done();
      close = () => {};
    };
    process.addListener('uncaughtException', exception);

    const vm = require('vm');
    const sandbox = {
      version: config.version,
      env: process.env,
      push,
      close,
      setTimeout,
      args: msg.args,
      // only allow internal modules that extension already requested permission for
      require: name => (msg.permissions || []).indexOf(name) === -1 ? null : require(name)
    };
    const script = new vm.Script(msg.script);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
  }
  else {
    push({
      error: 'cmd is unknown',
      cmd: msg.cmd,
      code: 1000
    });
    done();
  }
}
/* message passing */
const nativeMessage = require('./messaging');

const input = new nativeMessage.Input();
const transform = new nativeMessage.Transform(observe);
const output = new nativeMessage.Output();

process.stdin
  .pipe(input)
  .pipe(transform)
  .pipe(output)
  .pipe(process.stdout);
