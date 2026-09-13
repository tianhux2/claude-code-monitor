#!/usr/bin/env node
'use strict';

/**
 * Command execution wrapper.
 * Spawns the command using bash, writes stdout and stderr streams to disk, records exit codes, and logs lifecycle events.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// Suppress EPIPE errors on stdout and stderr
if (process.stdout && typeof process.stdout.on === 'function') {
  process.stdout.on('error', (err) => {
    if (err && (err.code === 'EPIPE' || err.code === 'EOF')) return;
  });
}
if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (err) => {
    if (err && (err.code === 'EPIPE' || err.code === 'EOF')) return;
  });
}

const [,, sessionDir, runId] = process.argv;
if (!sessionDir || !runId) {
  process.exit(1);
}

// Wrapper start timestamp in seconds
const wrapperStartedAt = Date.now() / 1000;

const runsDir = path.dirname(sessionDir.replace(/[/\\]+$/, ''));
const cmdFile = path.join(sessionDir, `${runId}.cmd`);
const outFile = path.join(sessionDir, `${runId}.out`);
const errFile = path.join(sessionDir, `${runId}.err`);
const metaFile = path.join(sessionDir, `${runId}.json`);
const wrapperLogFile = path.join(sessionDir, `${runId}.wrapper.log`);

function logWrapper(stage, info = {}) {
  try {
    const timestamp = new Date().toISOString();
    const epoch = (Date.now() / 1000).toFixed(3);
    const lines = [
      `[${timestamp}] [EPOCH: ${epoch}] [${stage}]`
    ];
    for (const [k, v] of Object.entries(info)) {
      lines.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
    lines.push('');
    fs.appendFileSync(wrapperLogFile, lines.join('\n'), 'utf8');
  } catch (e) {}
}

function findBash() {
  const envOverride = process.env.CCT_SHELL;
  if (envOverride && fs.existsSync(envOverride)) return envOverride;

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programW6432 = process.env.ProgramW6432 || 'C:\\Program Files';
    const candidates = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      path.join(programW6432, 'Git', 'bin', 'bash.exe'),
      path.join(programW6432, 'Git', 'usr', 'bin', 'bash.exe'),
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
      path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
      path.join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
      path.join(os.homedir(), 'scoop', 'apps', 'git', 'current', 'bin', 'bash.exe'),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }

    // Fast dynamic PATH resolution: scan for git/bash directories (supporting portable/custom drives)
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    for (const dir of pathDirs) {
      if (!dir) continue;
      const b1 = path.resolve(dir, '..', 'bin', 'bash.exe');
      if (fs.existsSync(b1)) return b1;
      const b2 = path.resolve(dir, '..', 'usr', 'bin', 'bash.exe');
      if (fs.existsSync(b2)) return b2;
      const b3 = path.join(dir, 'bash.exe');
      // Prevent matching Windows WSL System32 bash.exe
      if (fs.existsSync(b3) && !/System32/i.test(b3)) return b3;
    }

    if (process.env.SHELL && fs.existsSync(process.env.SHELL)) {
      return process.env.SHELL;
    }
    return 'bash.exe';
  }

  // macOS & Linux: prioritize modern Homebrew/system Bash to avoid macOS default zsh syntax differences
  const unixCandidates = [
    '/opt/homebrew/bin/bash', // Apple Silicon Homebrew (Bash 5.x)
    '/usr/local/bin/bash',    // Intel Mac Homebrew
    '/usr/bin/bash',          // Linux / Unix standard path
    '/bin/bash',              // Linux / macOS default path
  ];
  for (const p of unixCandidates) {
    if (fs.existsSync(p)) return p;
  }

  // Dynamically search PATH for bash
  const unixDirs = (process.env.PATH || '').split(path.delimiter);
  for (const dir of unixDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, 'bash');
    if (fs.existsSync(candidate)) return candidate;
  }

  if (process.env.SHELL && /bash$/i.test(process.env.SHELL)) {
    return process.env.SHELL;
  }
  return 'bash';
}

function isInterruptedCode(code, signal) {
  if (signal) {
    if (signal === 'SIGINT' || signal === 'SIGTERM' || signal === 'SIGKILL' ||
        signal === 'SIGHUP' || signal === 'SIGBREAK' || signal === 'SIGQUIT' || signal === 'SIGABRT') {
      return true;
    }
    if (code === null) return true;
  }
  if (code === 130 || code === 143 || code === 137 || code === 129 || code === 131 || code === 2) {
    return true;
  }
  // Windows NT STATUS_CONTROL_C_EXIT: 0xC000013A (signed -1073741510 or unsigned 3221225786)
  if (code === -1073741510 || code === 3221225786 || code === 0xC000013A) return true;
  // Windows DBG_CONTROL_C: 0x40010004 (1073807364)
  if (code === 1073807364 || code === 0x40010004) return true;
  // Windows STATUS_CONTROL_BREAK: 0xC000013B (-1073741509 or 3221225787)
  if (code === -1073741509 || code === 3221225787 || code === 0xC000013B) return true;
  return false;
}

function markWrapperStart(bashExe, childPid) {
  try {
    if (!fs.existsSync(metaFile)) return;
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    meta.wrapper_pid = process.pid;
    meta.child_pid = childPid;
    meta.wrapper_started_at = wrapperStartedAt;
    meta.wrapper_log = wrapperLogFile;
    const tmp = `${metaFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8');
    fs.renameSync(tmp, metaFile);
  } catch (e) {}
}

function updateMetaJson(exitCode, endedAt, customStatus, actualDuration) {
  try {
    if (!fs.existsSync(metaFile)) return;
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    meta.status = customStatus || (exitCode === 0 ? 'finished' : (exitCode === 130 ? 'interrupted' : 'failed'));
    meta.wrapper_exit_code = exitCode;
    meta.exit_code = exitCode;
    meta.ended_at = endedAt;
    meta.actual_ended_at = endedAt;
    meta.wrapper_started_at = wrapperStartedAt;
    if (actualDuration !== undefined) {
      meta.actual_duration = actualDuration;
    } else {
      meta.actual_duration = Math.max(0, endedAt - wrapperStartedAt);
    }
    meta.wrapper_log = wrapperLogFile;

    const tmp = `${metaFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8');
    fs.renameSync(tmp, metaFile);
  } catch (e) {}
}

function getMonitorPorts(runsDir) {
  const monitorFile = path.join(runsDir, '.monitor.json');
  if (!fs.existsSync(monitorFile)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(monitorFile, 'utf8'));
    const ports = new Set();
    if (Array.isArray(parsed.instances)) {
      for (const inst of parsed.instances) {
        if (inst && inst.port) {
          if (inst.pid) {
            try {
              process.kill(inst.pid, 0);
              ports.add(inst.port);
            } catch (e) {
              if (e.code === 'EPERM') ports.add(inst.port);
            }
          } else {
            ports.add(inst.port);
          }
        }
      }
    }
    if (ports.size === 0 && parsed.port) {
      ports.add(parsed.port);
    }
    return Array.from(ports);
  } catch (e) {
    return [];
  }
}

function notifyEnd(exitCode, endedAt, status, actualDuration, callback) {
  const done = (ok, msg) => {
    if (callback) {
      const cb = callback;
      callback = null;
      cb(ok, msg);
    }
  };

  try {
    const ports = getMonitorPorts(runsDir);
    if (ports.length === 0) {
      return done(false, 'no active monitor ports');
    }

    const sessionId = path.basename(sessionDir.replace(/[/\\]+$/, ''));
    const postData = JSON.stringify({
      t: 'wrapper_end',
      run_id: runId,
      session: sessionId,
      session_id: sessionId,
      rc: exitCode,
      status: status,
      ended_at: endedAt,
      actual_duration: actualDuration,
    });

    const isInt = (status === 'interrupted');
    const reqTimeout = isInt ? 150 : 800;

    let remaining = ports.length;
    let anyOk = false;
    const timer = setTimeout(() => {
      done(anyOk, `Timeout after ${reqTimeout}ms`);
    }, reqTimeout + 30);
    if (timer.unref) timer.unref();

    const onComplete = (ok) => {
      if (ok) anyOk = true;
      remaining--;
      if (remaining <= 0) {
        clearTimeout(timer);
        done(anyOk, anyOk ? 'Broadcast success' : 'All requests failed');
      }
    };

    for (const port of ports) {
      try {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/event',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: reqTimeout,
        });

        let reqDone = false;
        const finishReq = (ok) => {
          if (reqDone) return;
          reqDone = true;
          onComplete(ok);
        };

        req.on('response', (res) => {
          res.on('data', () => {});
          res.on('end', () => finishReq(true));
        });
        req.on('error', () => finishReq(false));
        req.on('timeout', () => {
          try { req.destroy(); } catch (e) {}
          finishReq(false);
        });

        req.write(postData);
        req.end();
      } catch (e) {
        onComplete(false);
      }
    }
  } catch (e) {
    done(false, `Exception: ${e.message}`);
  }
}

/**
 * Forwards termination signal to child process.
 */
function forwardSignal(childProcess, signal = 'SIGINT') {
  if (!childProcess || !childProcess.pid) return;
  try {
    childProcess.kill(signal);
  } catch (e) {}
}

function main() {
  let command = '';
  try {
    command = fs.readFileSync(cmdFile, 'utf8');
  } catch (e) {
    process.exit(1);
  }

  const bashExe = findBash();

  // 1. Log START to wrapper.log
  logWrapper('START', {
    wrapperPid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    bashExe: bashExe,
    sessionDir: sessionDir,
    runId: runId,
    command: command.length > 500 ? command.slice(0, 500) + '...' : command,
  });

  let outFd = null;
  let errFd = null;
  try {
    outFd = fs.openSync(outFile, 'a');
    errFd = fs.openSync(errFile, 'a');
  } catch (e) {}

  const childEnv = Object.assign({}, process.env, {
    PYTHONUNBUFFERED: '1',
    FORCE_COLOR: '1',
  });

  let child;
  try {
    child = spawn(bashExe, ['-c', command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: childEnv,
      windowsHide: true,
    });
  } catch (err) {
    logWrapper('SPAWN_ERROR', { message: err.message });
    updateMetaJson(1, Date.now() / 1000, 'failed', 0);
    process.exit(1);
  }

  logWrapper('CHILD_SPAWNED', {
    childPid: child.pid,
  });
  markWrapperStart(bashExe, child.pid);

  let isClosed = false;
  function finish(exitCode, status, reason) {
    if (isClosed) return;
    isClosed = true;
    const endedAt = Date.now() / 1000;
    if (outFd !== null) {
      try { fs.closeSync(outFd); } catch (e) {}
      outFd = null;
    }
    if (errFd !== null) {
      try { fs.closeSync(errFd); } catch (e) {}
      errFd = null;
    }

    const actualDuration = Math.max(0, endedAt - wrapperStartedAt);

    // Log completion to wrapper.log
    logWrapper('END', {
      exitCode: exitCode,
      status: status,
      endedAt: endedAt,
      actualDuration: `${actualDuration.toFixed(3)}s`,
      reason: reason || 'normal',
    });

    // Persist final status to metadata
    updateMetaJson(exitCode, endedAt, status, actualDuration);

    // Notify extension
    const isInt = (status === 'interrupted');
    const maxWait = isInt ? 200 : 800;
    const exitTimer = setTimeout(() => {
      process.exit(exitCode);
    }, maxWait + 50);
    if (exitTimer.unref) exitTimer.unref();

    notifyEnd(exitCode, endedAt, status, actualDuration, (ok, detail) => {
      clearTimeout(exitTimer);
      logWrapper('NOTIFY_RESULT', {
        success: ok,
        detail: detail,
      });
      process.exit(exitCode);
    });
  }

  // Handle process errors
  process.on('uncaughtException', (err) => {
    try {
      logWrapper('UNCAUGHT_EXCEPTION', { message: err.message });
      finish(1, 'failed', `uncaughtException: ${err.message}`);
    } catch (e) {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason) => {
    try {
      logWrapper('UNHANDLED_REJECTION', { reason: String(reason) });
    } catch (e) {}
  });

  process.on('exit', () => {
    if (!isClosed) {
      try {
        const endedAt = Date.now() / 1000;
        const dur = Math.max(0, endedAt - wrapperStartedAt);
        logWrapper('END', {
          exitCode: 130,
          status: 'interrupted',
          endedAt: endedAt,
          actualDuration: `${dur.toFixed(3)}s`,
          reason: 'process.exit safety fallback',
        });
        updateMetaJson(130, endedAt, 'interrupted', dur);
      } catch (e) {}
    }
  });

  // Relay signals to child process
  process.on('SIGINT', () => {
    forwardSignal(child, 'SIGINT');
  });
  process.on('SIGBREAK', () => {
    forwardSignal(child, 'SIGINT');
  });
  process.on('SIGTERM', () => {
    forwardSignal(child, 'SIGTERM');
  });
  process.on('SIGHUP', () => {
    forwardSignal(child, 'SIGHUP');
  });

  // Forward output to terminal and write to disk files
  child.stdout.on('data', (chunk) => {
    try {
      process.stdout.write(chunk);
    } catch (e) {}
    if (outFd !== null) {
      try { fs.writeSync(outFd, chunk); } catch (e) {}
    }
  });

  child.stderr.on('data', (chunk) => {
    try {
      process.stderr.write(chunk);
    } catch (e) {}
    if (errFd !== null) {
      try { fs.writeSync(errFd, chunk); } catch (e) {}
    }
  });

  child.on('error', (err) => {
    finish(1, 'failed', `child error: ${err.message}`);
  });

  // Handle child exit
  child.on('exit', (code, signal) => {
    const isInt = isInterruptedCode(code, signal);
    if (isInt) {
      const exitCode = 130;
      finish(exitCode, 'interrupted', `child exit: code=${code}, signal=${signal}`);
    } else {
      setTimeout(() => {
        if (!isClosed) {
          const exitCode = code !== null ? code : 1;
          const status = exitCode === 0 ? 'finished' : 'failed';
          finish(exitCode, status, `child exit timeout: code=${code}, signal=${signal}`);
        }
      }, 150).unref();
    }
  });

  child.on('close', (code, signal) => {
    if (isClosed) return;
    const isInt = isInterruptedCode(code, signal);
    const exitCode = isInt ? 130 : (code !== null ? code : 1);
    const status = isInt ? 'interrupted' : (exitCode === 0 ? 'finished' : 'failed');
    finish(exitCode, status, `child close: code=${code}, signal=${signal}`);
  });
}

main();
