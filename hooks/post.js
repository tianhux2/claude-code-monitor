#!/usr/bin/env node
'use strict';

/**
 * Post-execution hook handler for Claude Code Bash commands.
 * Updates task metadata and sends lifecycle events to the monitor extension.
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
    let timer = setTimeout(() => done(), 600);
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
          timeout: 550,
        });

        let reqDone = false;
        const finishReq = () => {
          if (reqDone) return;
          reqDone = true;
          onComplete();
        };

        req.on('response', (res) => {
          res.on('data', () => {});
          res.on('end', finishReq);
        });
        req.on('error', finishReq);
        req.on('timeout', () => {
          try { req.destroy(); } catch (e) {}
          finishReq();
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

function updateMetaJson(sessionDir, runId, patch) {
  try {
    const metaFile = path.join(sessionDir, `${runId}.json`);
    if (!fs.existsSync(metaFile)) return;
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

    // Wrapper exit code takes precedence
    if (meta.wrapper_exit_code !== undefined && patch.exit_code !== undefined) {
      delete patch.exit_code;
    }

    // Do not overwrite failed or interrupted status with finished
    if (
      (meta.wrapper_exit_code !== undefined && meta.wrapper_exit_code !== 0) ||
      meta.status === 'failed' ||
      meta.status === 'interrupted'
    ) {
      if (patch.status === 'finished') {
        delete patch.status;
      }
    }

    // Wrapper execution duration and timestamp take precedence
    if (meta.actual_ended_at !== undefined) {
      delete patch.actual_ended_at;
    }
    if (meta.actual_duration !== undefined) {
      delete patch.actual_duration;
    }

    // Compute foreground duration if not already set
    const fgEnd = patch.foreground_ended_at || patch.ended_at || meta.foreground_ended_at || meta.ended_at;
    const fgStart = meta.started_at;
    if (fgEnd && fgStart && patch.foreground_duration === undefined && meta.foreground_duration === undefined) {
      patch.foreground_duration = Math.max(0, fgEnd - fgStart);
    }

    Object.assign(meta, patch);

    const tmp = `${metaFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8');
    fs.renameSync(tmp, metaFile);
  } catch (e) {
    // Ignore error
  }
}

function isBackgroundResponse(resp) {
  if (!resp) return false;
  try {
    const str = typeof resp === 'string' ? resp : JSON.stringify(resp);
    return /background|running in background|run in background/i.test(str);
  } catch (e) {
    return false;
  }
}

function main() {
  const runsDir = defaultRunsDir();

  // Exit if hook is disabled
  try {
    if (fs.existsSync(path.join(runsDir, '.disabled'))) {
      process.exit(0);
    }
  } catch (e) {}

  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    try {
      if (!raw.trim()) return process.exit(0);
      const data = JSON.parse(raw);

      // Only handle Bash tool events
      if (data.tool_name && data.tool_name !== 'Bash') {
        return process.exit(0);
      }

      const hookEvent = data.hook_event_name;
      const runId = data.tool_use_id;
      const sessionId = data.session_id || 'unknown';
      const sessionDir = path.join(runsDir, sessionId);

      if (hookEvent === 'PermissionDenied') {
        const endedAt = Date.now() / 1000;
        if (runId) {
          updateMetaJson(sessionDir, runId, {
            status: 'denied',
            ended_at: endedAt,
            foreground_ended_at: endedAt,
            denied_reason: data.reason || 'User or security rule denied',
          });
        }
        notifyExtension({
          t: 'task_status',
          status: 'denied',
          run_id: runId,
          session_id: sessionId,
          reason: data.reason || 'User or security rule denied',
        }, runsDir, () => process.exit(0));
      } else if (hookEvent === 'PostToolUse') {
        const endedAt = Date.now() / 1000;
        const resp = data.tool_response;
        const isBg = isBackgroundResponse(resp);
        const isInterrupted = resp && (resp.interrupted === true || resp.interrupted === 'true');

        if (isBg) {
          if (runId) {
            updateMetaJson(sessionDir, runId, {
              status: 'background',
              is_background: true,
              foreground_ended_at: endedAt,
            });
          }
          notifyExtension({
            t: 'posttool_background',
            run_id: runId,
            session_id: sessionId,
            response: resp,
            foreground_ended_at: endedAt,
          }, runsDir, () => process.exit(0));
        } else if (isInterrupted) {
          if (runId) {
            updateMetaJson(sessionDir, runId, {
              status: 'interrupted',
              ended_at: endedAt,
              foreground_ended_at: endedAt,
              tool_response: resp,
            });
          }
          notifyExtension({
            t: 'posttool_end',
            run_id: runId,
            session_id: sessionId,
            status: 'interrupted',
            rc: 130,
            response: resp,
            ended_at: endedAt,
          }, runsDir, () => process.exit(0));
        } else {
          let resolvedStatus = 'finished';
          try {
            const metaFile = path.join(sessionDir, `${runId}.json`);
            if (fs.existsSync(metaFile)) {
              const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
              if (meta.status === 'failed' || meta.status === 'interrupted') {
                resolvedStatus = meta.status;
              } else if (meta.wrapper_exit_code !== undefined && meta.wrapper_exit_code !== 0) {
                resolvedStatus = (meta.wrapper_exit_code === 130) ? 'interrupted' : 'failed';
              }
            }
          } catch (e) {}

          if (runId) {
            updateMetaJson(sessionDir, runId, {
              status: resolvedStatus,
              ended_at: endedAt,
              foreground_ended_at: endedAt,
              tool_response: resp,
            });
          }
          notifyExtension({
            t: 'posttool_end',
            run_id: runId,
            session_id: sessionId,
            status: resolvedStatus,
            response: resp,
            ended_at: endedAt,
          }, runsDir, () => process.exit(0));
        }
      } else if (hookEvent === 'PostToolUseFailure') {
        const endedAt = Date.now() / 1000;
        const errStr = String(data.error || '');
        const isInt = /interrupt|abort|cancel|SIGINT|SIGTERM|exit code 130|killed/i.test(errStr) ||
                      (data.tool_response && (data.tool_response.interrupted === true || data.tool_response.interrupted === 'true'));
        const finalStatus = isInt ? 'interrupted' : 'failed';

        let candidateRc = isInt ? 130 : undefined;
        if (!candidateRc && data.error) {
          const m = String(data.error).match(/Exit code\s+(\d+)/i);
          if (m) candidateRc = parseInt(m[1], 10);
        }

        const patch = {
          status: finalStatus,
          ended_at: endedAt,
          foreground_ended_at: endedAt,
          error: data.error || 'Execution failed',
        };
        if (candidateRc !== undefined) patch.exit_code = candidateRc;

        if (runId) {
          updateMetaJson(sessionDir, runId, patch);
        }
        notifyExtension({
          t: 'posttool_end',
          status: finalStatus,
          rc: candidateRc,
          run_id: runId,
          session_id: sessionId,
          error: data.error || 'Execution failed',
          ended_at: endedAt,
        }, runsDir, () => process.exit(0));
      } else {
        process.exit(0);
      }
    } catch (e) {
      process.exit(0);
    }
  });
}

main();
