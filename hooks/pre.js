#!/usr/bin/env node
'use strict';

/**
 * PreToolUse hook for Bash commands.
 * Initializes log files, persists initial task metadata, and rewrites the command to invoke wrapper.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

function defaultRunsDir() {
  return path.join(os.homedir(), '.claude', 'bash-runs');
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

function notifyExtension(msg, runsDir, callback) {
  const done = () => {
    if (callback) {
      const cb = callback;
      callback = null;
      cb();
    }
  };

  try {
    const ports = getMonitorPorts(runsDir);
    if (ports.length === 0) return done();

    const postData = JSON.stringify(msg);
    let remaining = ports.length;
    let timer = setTimeout(() => done(), 800);
    if (timer.unref) timer.unref();

    const onComplete = () => {
      remaining--;
      if (remaining <= 0) {
        clearTimeout(timer);
        done();
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
          timeout: 750,
        });
        req.on('response', (res) => {
          res.on('data', () => {});
          res.on('end', onComplete);
        });
        req.on('error', onComplete);
        req.on('timeout', () => {
          try { req.destroy(); } catch (e) {}
          onComplete();
        });
        req.write(postData);
        req.end();
      } catch (e) {
        onComplete();
      }
    }
  } catch (e) {
    done();
  }
}

function main() {
  const runsDir = defaultRunsDir();

  // Exit if hook is disabled
  if (fs.existsSync(path.join(runsDir, '.disabled'))) {
    process.exit(0);
  }

  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    try {
      if (!raw.trim()) return process.exit(0);
      const data = JSON.parse(raw);
      const toolInput = data.tool_input || {};
      const command = toolInput.command;
      if (!command) return process.exit(0);

      const runId = data.tool_use_id || `t${Date.now()}`;
      const sessionId = data.session_id || 'unknown';
      const sessionDir = path.join(runsDir, sessionId);

      fs.mkdirSync(sessionDir, { recursive: true });

      const outPath = path.join(sessionDir, `${runId}.out`);
      const errPath = path.join(sessionDir, `${runId}.err`);
      const cmdPath = path.join(sessionDir, `${runId}.cmd`);
      const metaPath = path.join(sessionDir, `${runId}.json`);

      // Initialize empty output files
      fs.writeFileSync(outPath, '');
      fs.writeFileSync(errPath, '');
      fs.writeFileSync(cmdPath, command, { encoding: 'utf8' });

      const meta = {
        run_id: runId,
        session_id: sessionId,
        cwd: data.cwd || process.cwd(),
        command: command,
        description: toolInput.description || '',
        started_at: Date.now() / 1000,
        status: 'running',
        stdout_log: outPath,
        stderr_log: errPath,
      };

      // Atomic write
      const tmpPath = `${metaPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(meta, null, 2), 'utf8');
      fs.renameSync(tmpPath, metaPath);

      // Send task_start notification and return wrapped command
      notifyExtension({
        t: 'task_start',
        run_id: runId,
        session_id: sessionId,
        command: command,
        description: toolInput.description || '',
        started_at: meta.started_at,
        cwd: meta.cwd,
      }, runsDir, () => {
        const nodeBin = (process.execPath || 'node').replace(/\\/g, '/');
        const nodeCmd = (nodeBin === 'node' || !/[\\/]/.test(nodeBin)) ? 'node' : `"${nodeBin}"`;
        const wrapperPath = path.join(__dirname, 'wrapper.js').replace(/\\/g, '/');
        const sessionDirNorm = sessionDir.replace(/\\/g, '/');
        const wrappedCommand = `${nodeCmd} "${wrapperPath}" "${sessionDirNorm}" "${runId}"`;

        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            updatedInput: { command: wrappedCommand },
          },
        }));
        process.exit(0);
      });
    } catch (err) {
      // Allow command to proceed if hook fails
      process.exit(0);
    }
  });
}

main();
