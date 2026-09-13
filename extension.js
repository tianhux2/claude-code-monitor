'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { StringDecoder } = require('string_decoder');

/**
 * Path and Directory Utility Functions
 */
function getRunsDir() {
  const custom = vscode.workspace.getConfiguration('claudeCodeMonitor').get('runsDir');
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return path.resolve(custom.trim());
  }
  return path.join(os.homedir(), '.claude', 'bash-runs');
}

function getClaudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

/**
 * Manages ~/.claude/settings.json and the .disabled toggle file
 */
class HookManager {
  constructor(runsDir, extensionContext) {
    this.runsDir = runsDir;
    this.context = extensionContext;
    this.disabledFile = path.join(this.runsDir, '.disabled');
  }

  isEnabled() {
    return !fs.existsSync(this.disabledFile);
  }

  toggle() {
    const currentState = this.isEnabled();
    if (currentState) {
      // Disable hook: write .disabled flag
      try {
        if (!fs.existsSync(this.runsDir)) {
          fs.mkdirSync(this.runsDir, { recursive: true });
        }
        fs.writeFileSync(this.disabledFile, 'disabled', 'utf8');
      } catch (e) {
        vscode.window.showErrorMessage(`写入停用标记失败: ${e.message}`);
      }
      return false;
    } else {
      // Enable hook: remove .disabled flag and verify settings.json
      try {
        if (fs.existsSync(this.disabledFile)) {
          fs.unlinkSync(this.disabledFile);
        }
        this.ensureSettingsConfigured();
      } catch (e) {
        vscode.window.showErrorMessage(`恢复 Hook 失败: ${e.message}`);
      }
      return true;
    }
  }

  resolveNodeBinary() {
    // 0. Check environment variable override first
    if (process.env.CCT_NODE && fs.existsSync(process.env.CCT_NODE)) {
      return process.env.CCT_NODE;
    }

    // 1. Highest priority: real Node binary of the current Extension Host process
    // On Antigravity IDE Server, VS Code Server, Cursor Server, WSL, or Remote-SSH,
    // process.execPath is the actual absolute path to Node.js on the remote host.
    if (process.execPath && fs.existsSync(process.execPath)) {
      const baseName = path.basename(process.execPath).toLowerCase();
      if (baseName === 'node' || baseName === 'node.exe' || baseName.startsWith('node')) {
        return process.execPath;
      }
    }

    // 2. Search PATH environment variable for valid node binaries
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    const nodeNames = process.platform === 'win32' ? ['node.exe', 'node.cmd'] : ['node'];
    for (const dir of pathDirs) {
      if (!dir) continue;
      for (const name of nodeNames) {
        const candidate = path.join(dir, name);
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
          }
        } catch (e) {}
      }
    }

    // 3. Search version managers (NVM, FNM, Volta, ASDF, Mise) and IDE Server directories
    const home = os.homedir();
    if (home) {
      // 3.1 NVM
      try {
        const nvmVersionsDir = path.join(home, '.nvm', 'versions', 'node');
        if (fs.existsSync(nvmVersionsDir)) {
          const versions = fs.readdirSync(nvmVersionsDir).sort().reverse();
          for (const v of versions) {
            const p = path.join(nvmVersionsDir, v, 'bin', 'node');
            if (fs.existsSync(p)) return p;
          }
        }
      } catch (e) {}

      // 3.2 FNM / Volta / ASDF / Mise
      const managerCandidates = [
        path.join(home, '.local', 'share', 'fnm', 'current', 'bin', 'node'),
        path.join(home, '.fnm', 'current', 'bin', 'node'),
        path.join(home, '.volta', 'bin', 'node'),
        path.join(home, '.asdf', 'shims', 'node'),
        path.join(home, '.local', 'share', 'mise', 'shims', 'node'),
      ];
      for (const p of managerCandidates) {
        if (fs.existsSync(p)) return p;
      }

      // 3.3 Search IDE Server directories in user home (e.g. desktop sandbox or containers)
      try {
        const ideDirs = ['.antigravity-ide-server', '.vscode-server', '.cursor-server'];
        for (const ide of ideDirs) {
          const binDir = path.join(home, ide, 'bin');
          if (fs.existsSync(binDir)) {
            const hashes = fs.readdirSync(binDir).sort().reverse();
            for (const h of hashes) {
              const p = path.join(binDir, h, 'node');
              if (fs.existsSync(p)) return p;
            }
          }
        }
      } catch (e) {}
    }

    // 4. Common system default directories
    const sysCandidates = [
      '/usr/local/bin/node',
      '/usr/bin/node',
      '/bin/node',
      '/opt/homebrew/bin/node',
      'C:\\Program Files\\nodejs\\node.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'node', 'node.exe'),
    ];
    for (const p of sysCandidates) {
      if (p && fs.existsSync(p)) return p;
    }

    return 'node';
  }

  ensureSettingsConfigured() {
    const settingsPath = getClaudeSettingsPath();
    const settingsDir = path.dirname(settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        settings = {};
      }
    }

    if (!settings.hooks) settings.hooks = {};

    const extPath = this.context.extensionPath.replace(/\\/g, '/');
    const prePath = `${extPath}/hooks/pre.js`;
    const postPath = `${extPath}/hooks/post.js`;

    const nodeBin = this.resolveNodeBinary().replace(/\\/g, '/');
    const nodeCmd = (nodeBin === 'node' || !/[\\/]/.test(nodeBin)) ? 'node' : `"${nodeBin}"`;

    const preCmd = `${nodeCmd} "${prePath}"`;
    const postCmd = `${nodeCmd} "${postPath}"`;

    // Clean up deprecated PermissionRequest hook
    if (settings.hooks.PermissionRequest) {
      delete settings.hooks.PermissionRequest;
    }

    const events = [
      { name: 'PreToolUse', cmd: preCmd },
      { name: 'PostToolUse', cmd: postCmd },
      { name: 'PostToolUseFailure', cmd: postCmd },
      { name: 'PermissionDenied', cmd: postCmd },
    ];

    for (const { name, cmd } of events) {
      if (!Array.isArray(settings.hooks[name])) {
        settings.hooks[name] = [];
      }

      // Clean up legacy non-standard structures or old monitor hooks
      settings.hooks[name] = settings.hooks[name].filter((matcherGroup) => {
        if (!matcherGroup) return false;
        // Handle legacy flat structure: { matcher: 'Bash', command: '...' }
        if (matcherGroup.command && matcherGroup.command.includes('claude-code-monitor')) {
          return false;
        }
        return true;
      });

      // Find Bash matcher group
      let bashGroup = settings.hooks[name].find(
        (m) => m && m.matcher === 'Bash' && Array.isArray(m.hooks)
      );

      if (!bashGroup) {
        bashGroup = {
          matcher: 'Bash',
          hooks: [],
        };
        settings.hooks[name].push(bashGroup);
      }

      // Remove legacy hook commands if present
      bashGroup.hooks = bashGroup.hooks.filter(
        (h) => !(h && h.command && h.command.includes('claude-code-monitor'))
      );

      // Inject current extension hook path
      bashGroup.hooks.push({
        type: 'command',
        command: cmd,
      });
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  }
}

/**
 * Tails log output for the actively selected task.
 */
class PersistentTailer {
  constructor(onLinesCallback) {
    this.onLines = onLinesCallback; // (runId, stream: 'stdout'|'stderr', lines: string[]) => void
    this.currentTask = null; // { sessionId, runId, outPath, errPath }
    this.outFd = null;
    this.errFd = null;
    this.outOffset = 0;
    this.errOffset = 0;
    this.outWatcher = null;
    this.errWatcher = null;
    this.outDecoder = null;
    this.errDecoder = null;
    this.outLeftover = '';
    this.errLeftover = '';
  }

  attach(sessionId, runId, outPath, errPath, initialOutOffset = 0, initialErrOffset = 0) {
    this.detach();

    this.currentTask = { sessionId, runId, outPath, errPath };
    this.outDecoder = new StringDecoder('utf8');
    this.errDecoder = new StringDecoder('utf8');
    this.outOffset = initialOutOffset;
    this.errOffset = initialErrOffset;
    this.outLeftover = '';
    this.errLeftover = '';

    // Defensive check: ensure log files exist
    if (!fs.existsSync(outPath)) fs.writeFileSync(outPath, '');
    if (!fs.existsSync(errPath)) fs.writeFileSync(errPath, '');

    try {
      this.outFd = fs.openSync(outPath, 'r');
      this.errFd = fs.openSync(errPath, 'r');
    } catch (e) {
      return;
    }

    // Read existing content if initial offset not provided
    if (initialOutOffset === 0) this.readStreamChunk('stdout');
    if (initialErrOffset === 0) this.readStreamChunk('stderr');

    // Attach fs.watch to monitor incremental log output
    try {
      this.outWatcher = fs.watch(outPath, () => {
        this.readStreamChunk('stdout');
      });
      this.outWatcher.on('error', () => {});
    } catch (e) {}

    try {
      this.errWatcher = fs.watch(errPath, () => {
        this.readStreamChunk('stderr');
      });
      this.errWatcher.on('error', () => {});
    } catch (e) {}

    // Poll for new output to handle file system notification delays
    this.pollTimer = setInterval(() => {
      this.readStreamChunk('stdout');
      this.readStreamChunk('stderr');
    }, 100);
  }

  readStreamChunk(stream) {
    const isOut = stream === 'stdout';
    const fd = isOut ? this.outFd : this.errFd;
    const decoder = isOut ? this.outDecoder : this.errDecoder;
    if (fd === null) return;

    try {
      const stats = fs.fstatSync(fd);
      let currentOffset = isOut ? this.outOffset : this.errOffset;
      // Reset offset if file was truncated or rotated
      if (stats.size < currentOffset) {
        currentOffset = 0;
        if (isOut) this.outOffset = 0; else this.errOffset = 0;
      }
      if (stats.size <= currentOffset) return;

      // Cap chunk size to 128KB
      const maxChunk = 128 * 1024;
      const bytesToRead = Math.min(stats.size - currentOffset, maxChunk);
      const buf = Buffer.alloc(bytesToRead);
      const bytesRead = fs.readSync(fd, buf, 0, bytesToRead, currentOffset);
      if (bytesRead <= 0) return;

      if (isOut) {
        this.outOffset += bytesRead;
      } else {
        this.errOffset += bytesRead;
      }

      // Safe multi-byte boundary UTF-8 decoding
      const text = (isOut ? this.outLeftover : this.errLeftover) + decoder.write(buf.subarray(0, bytesRead));
      const rawLines = text.split(/\r?\n/);

      // Incomplete line at boundary saved for next chunk
      const leftover = rawLines.pop() || '';
      if (isOut) {
        this.outLeftover = leftover;
      } else {
        this.errLeftover = leftover;
      }

      if (rawLines.length > 0 && this.onLines && this.currentTask) {
        this.onLines(this.currentTask.runId, stream, rawLines);
      }

      // If unread data remains after 128KB chunk, smoothly drain next event loop tick
      if (stats.size > (isOut ? this.outOffset : this.errOffset)) {
        setImmediate(() => {
          if (this.currentTask) this.readStreamChunk(stream);
        });
      }
    } catch (e) {}
  }

  flushFinal() {
    if (!this.currentTask) return;
    if (this.outDecoder && this.outLeftover) {
      const remaining = this.outDecoder.end();
      const finalLine = (this.outLeftover + remaining).trim();
      if (finalLine) {
        this.onLines(this.currentTask.runId, 'stdout', [finalLine]);
      }
      this.outLeftover = '';
    }
    if (this.errDecoder && this.errLeftover) {
      const remaining = this.errDecoder.end();
      const finalLine = (this.errLeftover + remaining).trim();
      if (finalLine) {
        this.onLines(this.currentTask.runId, 'stderr', [finalLine]);
      }
      this.errLeftover = '';
    }
  }

  detach() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.flushFinal();
    if (this.outWatcher) {
      try { this.outWatcher.close(); } catch (e) {}
      this.outWatcher = null;
    }
    if (this.errWatcher) {
      try { this.errWatcher.close(); } catch (e) {}
      this.errWatcher = null;
    }
    if (this.outFd !== null) {
      try { fs.closeSync(this.outFd); } catch (e) {}
      this.outFd = null;
    }
    if (this.errFd !== null) {
      try { fs.closeSync(this.errFd); } catch (e) {}
      this.errFd = null;
    }
    this.currentTask = null;
    this.outDecoder = null;
    this.errDecoder = null;
    this.outLeftover = '';
    this.errLeftover = '';
  }
}

/**
 * Cross-platform check whether PID is currently alive
 */
function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

/**
 * Task History Scanner and Metadata Store
 */
class TaskStore {
  constructor(runsDir) {
    this.runsDir = runsDir;
    this.sessions = {}; // { [sessionId]: { id, title, tasks: { [runId]: meta } } }
    this._sessionTitleCache = {};
    this._sessionPathCache = {}; // sessionId -> { path: string | null, notFoundUntil: number }
  }

  /**
   * Resolves session .jsonl path with cache
   */
  locateSessionJsonl(sessionId) {
    if (!sessionId || sessionId === 'unknown') return null;
    const now = Date.now();
    const cached = this._sessionPathCache[sessionId];
    if (cached) {
      if (cached.path && fs.existsSync(cached.path)) {
        return cached.path;
      }
      if (cached.notFoundUntil && now < cached.notFoundUntil) {
        return null;
      }
    }

    try {
      const projectsDir = path.join(os.homedir(), '.claude', 'projects');
      if (fs.existsSync(projectsDir)) {
        const projects = fs.readdirSync(projectsDir);
        for (const proj of projects) {
          const candidate = path.join(projectsDir, proj, `${sessionId}.jsonl`);
          if (fs.existsSync(candidate)) {
            this._sessionPathCache[sessionId] = { path: candidate };
            return candidate;
          }
        }
      }
    } catch (e) {}

    // Not found: cache negative result for 15s to prevent excessive directory scanning
    this._sessionPathCache[sessionId] = { path: null, notFoundUntil: now + 15000 };
    return null;
  }

  /**
   * Reads up to 64KB from head and tail of transcript to find session title
   */
  _extractTitleFromJsonl(jsonlPath, fileSize) {
    const CHUNK_SIZE = 64 * 1024; // 64KB 切片窗口

    const parseLines = (text) => {
      const lines = text.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          const t = (obj.type === 'ai-title' && obj.aiTitle) ||
                    (obj.type === 'custom-title' && (obj.customTitle || obj.title)) ||
                    obj.aiTitle ||
                    obj.customTitle ||
                    (obj.type === 'session-title' && obj.title);
          if (t && typeof t === 'string' && t.trim()) {
            return t.trim();
          }
        } catch (e) {}
      }
      return null;
    };

    // Small file: direct read
    if (fileSize <= CHUNK_SIZE * 2) {
      const content = fs.readFileSync(jsonlPath, 'utf8');
      return parseLines(content);
    }

    // Large file:
    // 1. Read tail 64KB (renames or updates appear at file end)
    const fd = fs.openSync(jsonlPath, 'r');
    try {
      const tailBuf = Buffer.alloc(CHUNK_SIZE);
      fs.readSync(fd, tailBuf, 0, CHUNK_SIZE, fileSize - CHUNK_SIZE);
      const tailTitle = parseLines(tailBuf.toString('utf8'));
      if (tailTitle) {
        return tailTitle;
      }

      // 2. If no rename found in tail, read head 64KB (initial aiTitle is in first few lines)
      const headBuf = Buffer.alloc(CHUNK_SIZE);
      fs.readSync(fd, headBuf, 0, CHUNK_SIZE, 0);
      return parseLines(headBuf.toString('utf8'));
    } finally {
      try { fs.closeSync(fd); } catch (e) {}
    }
  }

  /**
   * Resolves session title from transcript or returns sessionId.
   */
  resolveSessionTitle(sessionId) {
    if (!sessionId || sessionId === 'unknown') return 'unknown';

    try {
      const jsonlPath = this.locateSessionJsonl(sessionId);
      if (jsonlPath) {
        const stat = fs.statSync(jsonlPath);
        const cached = this._sessionTitleCache[sessionId];
        // Reuse cached title if mtime has not changed
        if (cached && cached.mtimeMs === stat.mtimeMs) {
          return cached.title;
        }

        const foundTitle = this._extractTitleFromJsonl(jsonlPath, stat.size);
        const finalTitle = foundTitle || sessionId;
        this._sessionTitleCache[sessionId] = {
          title: finalTitle,
          mtimeMs: stat.mtimeMs
        };
        return finalTitle;
      }
    } catch (e) {}

    // Fallback to sessionId if no title found
    return sessionId;
  }

  /**
   * If a task is marked running but its wrapper process has exited, sets status to interrupted.
   */
  reconcileTaskIfDead(meta, sessionDir, polledAt) {
    if (!meta || meta.status !== 'running') return false;

    const pid = meta.wrapper_pid || meta.child_pid;
    let isDead = false;
    const now = polledAt || (Date.now() / 1000);
    if (pid) {
      isDead = !isPidAlive(pid);
    } else {
      if (meta.started_at && (now - meta.started_at > 8)) {
        isDead = true;
      }
    }

    if (isDead) {
      // Duration is calculated from wrapper timestamps
      const startTime = meta.wrapper_started_at || meta.started_at || now;
      let endedAt = meta.actual_ended_at;
      if (!endedAt) {
        // Extract physical end timestamp from log file mtime to prevent machine sleep false durations
        try {
          const outPath = path.join(sessionDir, `${meta.run_id}.out`);
          const errPath = path.join(sessionDir, `${meta.run_id}.err`);
          const logPath = path.join(sessionDir, `${meta.run_id}.wrapper.log`);
          let maxMtime = startTime;
          for (const p of [outPath, errPath, logPath]) {
            if (fs.existsSync(p)) {
              const m = fs.statSync(p).mtimeMs / 1000;
              if (m > maxMtime) maxMtime = m;
            }
          }
          endedAt = maxMtime;
        } catch (e) {
          endedAt = startTime;
        }
      }
      const actualDuration = meta.actual_duration !== undefined
        ? meta.actual_duration
        : Math.max(0, endedAt - startTime);

      meta.status = 'interrupted';
      meta.exit_code = 130;
      meta.wrapper_exit_code = 130;
      meta.ended_at = endedAt;
      meta.actual_ended_at = endedAt;
      meta.actual_duration = actualDuration;

      // Persist updated .json metadata to disk
      try {
        const metaPath = path.join(sessionDir, `${meta.run_id}.json`);
        const tmp = `${metaPath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf8');
        fs.renameSync(tmp, metaPath);
      } catch (e) {}

      return true;
    }

    return false;
  }

  /**
   * Periodic lightweight polling to verify PID liveness (detects external kills/aborts)
   */
  pollRunningTasks(onReconciled) {
    const now = Date.now() / 1000;
    const reconciled = [];
    for (const sessionId of Object.keys(this.sessions)) {
      const session = this.sessions[sessionId];
      if (!session || !session.tasks) continue;
      for (const runId of Object.keys(session.tasks)) {
        const t = session.tasks[runId];
        if (!t || t.status !== 'running') continue;

        const sessionDir = path.join(this.runsDir, sessionId);
        const metaPath = path.join(sessionDir, `${runId}.json`);

        let diskMeta = null;
        if (fs.existsSync(metaPath)) {
          try {
            diskMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (diskMeta && diskMeta.status && diskMeta.status !== 'running') {
              Object.assign(t, diskMeta);
              if (onReconciled) onReconciled(t, sessionId, runId);
              continue;
            }
          } catch (e) {}
        }

        const target = diskMeta || t;
        const didReconcile = this.reconcileTaskIfDead(target, sessionDir, now);
        if (didReconcile) {
          Object.assign(t, target);
          reconciled.push({ runId, sessionId, task: t });
          if (onReconciled) onReconciled(t, sessionId, runId);
        }
      }
    }
    return reconciled;
  }

  loadFromDisk(maxSessions = 30) {
    this.sessions = {};
    if (!fs.existsSync(this.runsDir)) return this.sessions;

    try {
      const entries = fs.readdirSync(this.runsDir, { withFileTypes: true });
      // Extract session directories sorted by mtime descending (loads recent sessions first)
      const dirList = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const sessionPath = path.join(this.runsDir, entry.name);
        try {
          const st = fs.statSync(sessionPath);
          dirList.push({ name: entry.name, mtime: st.mtimeMs });
        } catch (e) {
          dirList.push({ name: entry.name, mtime: 0 });
        }
      }

      dirList.sort((a, b) => b.mtime - a.mtime);
      // Session window guard: load only the latest maxSessions (default 30) to avoid slow startup scans
      const targetDirs = dirList.slice(0, maxSessions);

      for (const { name: sessionId } of targetDirs) {
        const sessionPath = path.join(this.runsDir, sessionId);
        const sessionTasks = {};
        let files = [];
        try {
          files = fs.readdirSync(sessionPath);
        } catch (e) {
          continue;
        }

        for (const file of files) {
          if (file.endsWith('.json') && !file.endsWith('.tmp')) {
            const metaPath = path.join(sessionPath, file);
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              if (meta && meta.run_id) {
                this.reconcileTaskIfDead(meta, sessionPath);
                if (meta.foreground_duration === undefined && meta.started_at) {
                  const fgEnd = meta.foreground_ended_at || meta.ended_at;
                  if (fgEnd) {
                    meta.foreground_duration = Math.max(0, fgEnd - meta.started_at);
                  }
                }
                sessionTasks[meta.run_id] = meta;
              }
            } catch (e) {}
          }
        }

        if (Object.keys(sessionTasks).length > 0) {
          this.sessions[sessionId] = {
            id: sessionId,
            title: this.resolveSessionTitle(sessionId),
            tasks: sessionTasks,
          };
        }
      }
    } catch (e) {}

    return this.sessions;
  }

  cleanupOrphanRunningTasks(sessionId, newRunId, startedAt) {
    if (!this.sessions[sessionId]) return [];
    const modified = [];
    const tasks = this.sessions[sessionId].tasks;
    for (const rId of Object.keys(tasks)) {
      const t = tasks[rId];
      if (rId !== newRunId && t.status === 'running' && !t.isBackground) {
        t.status = 'interrupted';
        t.exit_code = 130;
        t.ended_at = startedAt || (Date.now() / 1000);
        modified.push({ runId: rId, sessionId, endedAt: t.ended_at });

        const sessionDir = path.join(this.runsDir, sessionId);
        const metaPath = path.join(sessionDir, `${rId}.json`);
        try {
          if (fs.existsSync(metaPath)) {
            const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            m.status = 'interrupted';
            m.exit_code = 130;
            m.ended_at = t.ended_at;
            fs.writeFileSync(metaPath, JSON.stringify(m, null, 2), 'utf8');
          }
        } catch (e) {}
      }
    }
    return modified;
  }

  upsertTask(task) {
    const sessionId = task.session_id || 'unknown';
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = {
        id: sessionId,
        title: this.resolveSessionTitle(sessionId),
        tasks: {},
      };
    }
    const existing = this.sessions[sessionId].tasks[task.run_id] || {};
    this.sessions[sessionId].tasks[task.run_id] = Object.assign(existing, task);
    // Always refresh title (cached via mtime, automatically reacts to session rename)
    this.sessions[sessionId].title = this.resolveSessionTitle(sessionId);
  }

  handleWrapperEnd(runId, sessionId, status, rc, endedAt, actualDuration) {
    if (!this.sessions[sessionId] || !this.sessions[sessionId].tasks[runId]) return false;
    const t = this.sessions[sessionId].tasks[runId];

    // Exit code from wrapper takes precedence
    t.exit_code = rc;
    t.actual_ended_at = endedAt;
    const startTime = t.wrapper_started_at || t.started_at || endedAt;
    t.actual_duration = actualDuration !== undefined ? actualDuration : Math.max(0, endedAt - startTime);
    t.wrapper_status = status;
    if (t.started_at && t.foreground_duration === undefined) {
      t.foreground_duration = Math.max(0, endedAt - t.started_at);
    }

    // For background task, wrapper exit signifies final completion of the job
    if (t.isBackground || t.status === 'background') {
      t.status = status;
      t.ended_at = endedAt;
    } else if (t.source !== 'posttool') {
      // Temporarily apply wrapper terminal status if posttool hook has not fired yet
      t.status = status;
      t.ended_at = endedAt;
    }
    t.source = 'wrapper';
    return true;
  }

  handlePosttoolEnd(runId, sessionId, status, candidateRc, response, error, endedAt) {
    if (!this.sessions[sessionId] || !this.sessions[sessionId].tasks[runId]) return false;
    const t = this.sessions[sessionId].tasks[runId];

    // Exit code from wrapper takes precedence
    // Only adopt candidateRc if wrapper has not yet reported an exit code
    if (t.exit_code === undefined && candidateRc !== undefined) {
      t.exit_code = candidateRc;
    }

    // Guard: do not overwrite failed or interrupted state with finished if non-zero rc exists
    if (status === 'finished') {
      if (t.exit_code !== undefined && t.exit_code !== 0) {
        status = t.exit_code === 130 ? 'interrupted' : 'failed';
      } else if (t.wrapper_status === 'failed' || t.wrapper_status === 'interrupted') {
        status = t.wrapper_status;
      }
    }

    t.status = status;
    t.source = 'posttool';
    t.foreground_ended_at = endedAt;
    if (t.started_at) {
      t.foreground_duration = Math.max(0, endedAt - t.started_at);
    }
    if (response !== undefined) t.tool_response = response;
    if (error !== undefined) t.error = error;
    if (endedAt && !t.ended_at) t.ended_at = endedAt;

    return true;
  }

  handlePosttoolBackground(runId, sessionId, response, endedAt) {
    if (!this.sessions[sessionId] || !this.sessions[sessionId].tasks[runId]) return false;
    const t = this.sessions[sessionId].tasks[runId];

    // Mark task as background and record foreground duration
    t.isBackground = true;
    t.status = 'background';
    t.source = 'posttool';
    t.foreground_ended_at = endedAt || (Date.now() / 1000);
    if (t.started_at) {
      t.foreground_duration = Math.max(0, t.foreground_ended_at - t.started_at);
    }
    if (response !== undefined) t.tool_response = response;
    return true;
  }

  updateTaskStatus(runId, sessionId, status, extra) {
    if (this.sessions[sessionId] && this.sessions[sessionId].tasks[runId]) {
      const t = this.sessions[sessionId].tasks[runId];
      t.status = status;
      if (extra) {
        if (extra.ended_at) t.ended_at = extra.ended_at;
        if (extra.rc !== undefined) t.exit_code = extra.rc;
        if (extra.reason) t.denied_reason = extra.reason;
        if (extra.error) t.error = extra.error;
      }
      return true;
    }
    return false;
  }

  /**
   * Deletes log files for completed tasks while preserving running and background tasks.
   */
  clearCompletedTasks() {
    if (!fs.existsSync(this.runsDir)) return 0;
    let cleanedCount = 0;
    try {
      const entries = fs.readdirSync(this.runsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const sessionId = entry.name;
        const sessionDir = path.join(this.runsDir, sessionId);
        const session = this.sessions[sessionId];

        let files = [];
        try {
          files = fs.readdirSync(sessionDir);
        } catch (e) {
          continue;
        }

        // 1. Group files by runId
        const runIdFiles = new Map();
        for (const f of files) {
          const m = f.match(/^(.+?)\.(?:json|out|err|cmd|wrapper\.log|tmp)$/);
          if (m) {
            const rId = m[1];
            if (!runIdFiles.has(rId)) {
              runIdFiles.set(rId, []);
            }
            runIdFiles.get(rId).push(f);
          }
        }

        // 2. Inspect each task
        for (const [rId, fileList] of runIdFiles.entries()) {
          let task = session?.tasks[rId];
          let status = task?.status;

          // Read metadata from disk if not present in memory cache
          if (!status) {
            try {
              const metaFile = path.join(sessionDir, `${rId}.json`);
              if (fs.existsSync(metaFile)) {
                const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                status = meta?.status;
                if (!task && meta) task = meta;
              }
            } catch (e) {}
          }

          // Skip running and background tasks
          if (status === 'running' || status === 'background') {
            continue;
          }

          // Skip task if wrapper or child process is still running
          const wrapperPid = typeof task?.wrapper_pid === 'number' ? task.wrapper_pid : null;
          const childPid = typeof task?.child_pid === 'number' ? task.child_pid : null;
          const isWrapperAlive = wrapperPid ? isPidAlive(wrapperPid) : false;
          const isChildAlive = childPid ? isPidAlive(childPid) : false;
          if (isWrapperAlive || isChildAlive) {
            continue;
          }

          // Only delete completed tasks
          const isCompleted = status === 'finished' || status === 'failed' || status === 'interrupted' || status === 'denied';
          if (!isCompleted) {
            continue;
          }

          // Safely delete files for this completed task
          for (const f of fileList) {
            try {
              fs.unlinkSync(path.join(sessionDir, f));
            } catch (e) {}
          }
          cleanedCount++;

          // Remove task from memory cache
          if (session?.tasks[rId]) {
            delete session.tasks[rId];
          }
        }

        // 3. Remove session directory if empty
        try {
          const remaining = fs.readdirSync(sessionDir);
          if (remaining.length === 0) {
            fs.rmdirSync(sessionDir);
            delete this.sessions[sessionId];
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 4. Clean up empty sessions from memory
    for (const sId of Object.keys(this.sessions)) {
      const s = this.sessions[sId];
      if (!s || !s.tasks || Object.keys(s.tasks).length === 0) {
        delete this.sessions[sId];
      }
    }

    return cleanedCount;
  }

  clearHistory() {
    return this.clearCompletedTasks();
  }
}

/**
 * Reads up to maxLines from the end of the log file.
 */
function readTailLines(filePath, maxLines = 3000, maxBytes = 512 * 1024) {
  if (!fs.existsSync(filePath)) {
    return { lines: [], size: 0, isTruncated: false };
  }

  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    if (size === 0) {
      return { lines: [], size: 0, isTruncated: false };
    }

    let buffer;
    let isTruncated = false;

    if (size <= maxBytes) {
      buffer = fs.readFileSync(filePath);
    } else {
      isTruncated = true;
      const bytesToRead = maxBytes;
      buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, bytesToRead, size - bytesToRead);
      } finally {
        fs.closeSync(fd);
      }
    }

    const text = buffer.toString('utf8');
    let lines = text.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (lines.length > maxLines) {
      lines = lines.slice(-maxLines);
      isTruncated = true;
    }

    return { lines, size, isTruncated };
  } catch (e) {
    return { lines: [], size: 0, isTruncated: false };
  }
}

/**
 * Webview View Provider
 */
class ClaudeCodeMonitorViewProvider {
  constructor(extensionUri, hookManager, taskStore, tailer) {
    this._extensionUri = extensionUri;
    this._hookManager = hookManager;
    this._taskStore = taskStore;
    this._tailer = tailer;
    this._view = null;
    this._activeRunId = null;
    this._activeSessionId = null;
  }

  resolveWebviewView(webviewView, context, token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Observe webview visibility changes
    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        // Pause tailer to conserve resources when collapsed/hidden
        this._tailer.detach();
      } else if (this._activeRunId && this._activeSessionId) {
        // Resume tailer when visible again
        this._attachActiveTail();
      }
    });

    // Handle messages sent from Webview frontend
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'ready':
          this._sendInit();
          break;
        case 'selectTask':
          this._handleSelectTask(message.runId, message.sessionId);
          break;
        case 'toggleHook':
          vscode.commands.executeCommand('claudeCodeMonitor.toggleHook');
          break;
        case 'toggleAutoFollow': {
          const cfg = vscode.workspace.getConfiguration('claudeCodeMonitor');
          const cur = cfg.get('autoFollow', true);
          const next = !cur;
          cfg.update('autoFollow', next, vscode.ConfigurationTarget.Global);
          vscode.commands.executeCommand('setContext', 'claudeCodeMonitor.autoFollowEnabled', next);
          this.postMessage({ type: 'auto_follow', enabled: next });
          break;
        }
        case 'saveLanguage': {
          const cfg = vscode.workspace.getConfiguration('claudeCodeMonitor');
          cfg.update('language', message.value, vscode.ConfigurationTarget.Global);
          break;
        }
        case 'saveTheme': {
          const cfg = vscode.workspace.getConfiguration('claudeCodeMonitor');
          cfg.update('theme', message.value, vscode.ConfigurationTarget.Global);
          break;
        }
        case 'refresh':
          this.refresh();
          break;
        case 'clearCompletedTasks': {
          this._tailer.detach();
          const cleaned = this._taskStore.clearCompletedTasks();
          if (this._activeRunId && (!this._taskStore.sessions[this._activeSessionId] || !this._taskStore.sessions[this._activeSessionId].tasks[this._activeRunId])) {
            this._activeRunId = null;
            this._activeSessionId = null;
            this.postMessage({ type: 'task_reset_output', runId: null });
          }
          this.refresh();
          const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');
          vscode.window.showInformationMessage(
            isZh
              ? `已安全清理 ${cleaned} 个已完成任务，未完成的任务已完好保留。`
              : `Safely cleared ${cleaned} completed task(s). Unfinished tasks were preserved.`
          );
          this.postMessage({ type: 'cleared_finished_tasks', count: cleaned });
          break;
        }
        case 'clearHistory':
          vscode.commands.executeCommand('claudeCodeMonitor.clearHistory');
          break;
        case 'openLogFile':
          this._handleOpenLogFile(message.runId, message.sessionId);
          break;
        case 'openRunsDir': {
          const runsDir = getRunsDir();
          if (!fs.existsSync(runsDir)) {
            try {
              fs.mkdirSync(runsDir, { recursive: true });
            } catch (e) {}
          }
          vscode.env.openExternal(vscode.Uri.file(runsDir));
          break;
        }
        case 'copyRunsDir': {
          const runsDir = getRunsDir();
          vscode.env.clipboard.writeText(runsDir);
          vscode.window.showInformationMessage(`已复制日志目录路径: ${runsDir}`);
          break;
        }
        case 'copyText':
          if (message.text) {
            vscode.env.clipboard.writeText(message.text);
          }
          break;
      }
    });

    this._sendInit();
  }

  postMessage(message) {
    if (this._view && this._view.webview) {
      this._view.webview.postMessage(message);
    }
  }

  refresh() {
    const sessions = this._taskStore.loadFromDisk();
    let totalTasks = 0;
    for (const s of Object.values(sessions)) {
      totalTasks += Object.keys(s.tasks || {}).length;
    }
    this._updateDescription(totalTasks);
    this.postMessage({
      type: 'session_list',
      sessions,
    });
  }

  _updateDescription(totalCount) {
    if (!this._view) return;
    const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');
    if (typeof totalCount === 'number') {
      this._view.description = totalCount > 0 ? (isZh ? `${totalCount} 个任务` : `${totalCount} tasks`) : '';
    }
  }

  _sendInit() {
    const config = vscode.workspace.getConfiguration('claudeCodeMonitor');
    const maxLines = config.get('maxLines') || 3000;
    const autoFollow = config.get('autoFollow', true);
    const userLanguage = config.get('language') || 'auto';
    const userTheme = config.get('theme') || 'auto';
    const sessions = this._taskStore.loadFromDisk();

    let totalTasks = 0;
    for (const s of Object.values(sessions)) {
      totalTasks += Object.keys(s.tasks || {}).length;
    }
    this._updateDescription(totalTasks);

    // Default to selecting the newest task if none active
    if (!this._activeRunId) {
      const sIds = Object.keys(sessions);
      if (sIds.length > 0) {
        const latestSession = sIds[sIds.length - 1];
        const taskIds = Object.keys(sessions[latestSession].tasks || {});
        if (taskIds.length > 0) {
          this._activeRunId = taskIds[taskIds.length - 1];
          this._activeSessionId = latestSession;
        }
      }
    }

    const lang = (vscode.env.language || 'en').toLowerCase();
    const locale = lang.startsWith('zh') ? 'zh' : 'en';
    const runsDir = getRunsDir();

    this.postMessage({
      type: 'init',
      hookEnabled: this._hookManager.isEnabled(),
      autoFollow,
      sessions,
      activeRunId: this._activeRunId,
      activeSessionId: this._activeSessionId,
      maxLines,
      locale,
      language: vscode.env.language,
      userLanguage,
      userTheme,
      runsDir,
    });

    if (this._activeRunId && this._activeSessionId) {
      this._handleSelectTask(this._activeRunId, this._activeSessionId);
    }
  }

  _handleSelectTask(runId, sessionId) {
    this._activeRunId = runId;
    this._activeSessionId = sessionId;

    const runsDir = getRunsDir();
    const sessionDir = path.join(runsDir, this._activeSessionId);
    const outPath = path.join(sessionDir, `${this._activeRunId}.out`);
    const errPath = path.join(sessionDir, `${this._activeRunId}.err`);
    const metaPath = path.join(sessionDir, `${this._activeRunId}.json`);

    // Sync latest metadata from disk when task is selected to guarantee data consistency
    let taskMeta = this._taskStore.sessions[this._activeSessionId]?.tasks[this._activeRunId];
    if (fs.existsSync(metaPath)) {
      try {
        const freshMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        this._taskStore.upsertTask(freshMeta);
        taskMeta = this._taskStore.sessions[this._activeSessionId]?.tasks[this._activeRunId];
      } catch (e) {}
    }

    const config = vscode.workspace.getConfiguration('claudeCodeMonitor');
    const maxLines = config.get('maxLines') || 3000;

    // Read tail lines of log files
    const outRes = readTailLines(outPath, maxLines);
    const errRes = readTailLines(errPath, maxLines);

    this.postMessage({
      type: 'task_selected',
      runId,
      sessionId,
      task: taskMeta,
      stdoutLines: outRes.lines,
      stderrLines: errRes.lines,
      isTruncated: outRes.isTruncated || errRes.isTruncated,
    });

    // Attach incremental tailer to stream newly appended lines
    this._tailer.attach(this._activeSessionId, this._activeRunId, outPath, errPath, outRes.size, errRes.size);
  }

  _handleOpenLogFile(runId, sessionId) {
    const sId = sessionId || this._activeSessionId;
    const rId = runId || this._activeRunId;
    if (!sId || !rId) return;

    const runsDir = getRunsDir();
    const outPath = path.join(runsDir, sId, `${rId}.out`);
    if (fs.existsSync(outPath)) {
      vscode.workspace.openTextDocument(vscode.Uri.file(outPath)).then((doc) => {
        vscode.window.showTextDocument(doc, { preview: false });
      });
    } else {
      vscode.window.showWarningMessage('未找到该任务的标准输出日志文件');
    }
  }

  _getHtmlForWebview(webview) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}?v=${nonce}">
  <style>
    /* Eliminate native Windows scrollbar waste while preserving smooth scrolling */
    .filter-pills-row {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .filter-pills-row::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    .terminal-toolbar {
      overflow: hidden !important;
    }
    .terminal-toolbar::-webkit-scrollbar {
      display: none !important;
    }
    /* Normalize filter pill dimensions across all platforms */
    .filter-pill {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      height: 22px !important;
      max-height: 22px !important;
      min-width: 44px !important;
      padding: 0 8px !important;
      border-radius: 11px !important;
      font-size: 11px !important;
      line-height: 20px !important;
      box-sizing: border-box !important;
      flex-shrink: 0 !important;
    }
    .filter-pill .pill-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 10px !important;
      line-height: 1 !important;
    }
  </style>
  <title>Claude Code: Terminal & Task Monitor</title>
</head>
<body>
  <div class="main-container">
    <!-- Top Section: Session Groups and Task List -->
    <div class="tasks-panel" id="tasksPanel">
      <!-- Category and Search Filter Bar -->
      <div class="filter-bar">
        <div class="filter-search-row">
          <input type="text" id="taskSearchInput" class="filter-search-input" placeholder="🔍 搜索命令 / 描述 / 会话..." />
          <button id="btnClearSearch" class="filter-clear-btn" title="清空搜索" style="display:none;">✕</button>
        </div>
        <div class="filter-pills-row" id="filterPills">
          <button class="filter-pill active" data-filter="all"><span id="pillTextAll">全部</span></button>
          <button class="filter-pill" data-filter="running" id="pillRunning"><span class="pill-icon">⚡</span><span id="pillTextRunning">运行中</span></button>
          <button class="filter-pill" data-filter="failed" id="pillFailed"><span class="pill-icon">❌</span><span id="pillTextFailed">失败</span></button>
          <button class="filter-pill" data-filter="success" id="pillSuccess"><span class="pill-icon">✔️</span><span id="pillTextSuccess">成功</span></button>
          <button class="filter-pill" data-filter="git" id="pillGit"><span id="pillTextGit">Git</span></button>
          <button class="filter-pill" data-filter="test" id="pillTest"><span id="pillTextTest">测试</span></button>
          <button class="filter-pill" data-filter="build" id="pillBuild"><span id="pillTextBuild">构建</span></button>
          <button class="filter-pill" data-filter="script" id="pillScript"><span id="pillTextScript">脚本</span></button>
        </div>
      </div>
      <div id="sessionsContainer" class="sessions-container">
        <div class="empty-state">正在加载任务记录...</div>
      </div>
    </div>

    <!-- Draggable Vertical Splitter -->
    <div id="panelSplitter" class="panel-splitter" title="上下拖拽可调整列表与终端面板高度">
      <div class="splitter-handle"></div>
    </div>

    <!-- Bottom Section: Embedded Real-time Terminal -->
    <div class="terminal-panel" id="terminalPanel">
      <div class="terminal-toolbar">
        <div class="tabs-group">
          <button id="tabAll" class="tab-btn active" data-filter="all">全部</button>
          <button id="tabStdout" class="tab-btn" data-filter="stdout">输出</button>
          <button id="tabStderr" class="tab-btn" data-filter="stderr">错误</button>
        </div>

        <div class="terminal-tools">
          <button id="btnScrollLock" class="btn-icon toggle-scroll-btn active" title="自动滚动锁定">
            <span class="btn-emoji">⏬</span> <span id="textScrollLock">滚动</span>
          </button>
          <button id="btnCopyCommand" class="btn-icon" title="复制当前命令">
            <span class="btn-emoji">📋</span> <span id="textCopyCmd">复制</span>
          </button>
          <button id="btnOpenInEditor" class="btn-icon" title="在原生编辑器打开完整输出日志">
            <span class="btn-emoji">📄</span> <span id="textOpenLog">日志</span>
          </button>
        </div>
      </div>

      <!-- Active Task Command Banner -->
      <div class="active-command-bar">
        <span class="cmd-prompt">$</span>
        <span id="activeCmdText" class="cmd-text">(未选择任务)</span>
        <span id="activeStatusBadge" class="cmd-status-badge" style="display:none;"></span>
        <span id="activeExitBadge" class="cmd-exit-badge" style="display:none;"></span>
        <span id="activeDurationBadge" class="cmd-duration-badge" style="display:none;"></span>
      </div>

      <!-- Crash Armor Truncation Notice Banner -->
      <div id="truncationBanner" class="truncation-banner">
        <span id="truncationText">⚠️ 已启用防爆保护：仅在面板保留最多 3,000 行输出。</span>
        <button id="btnBannerOpen" class="btn-icon" style="color:inherit;text-decoration:underline;">在编辑器打开完整日志</button>
      </div>

      <!-- Real-time Terminal Output Viewport -->
      <div id="terminalOutput" class="terminal-output"></div>
    </div>
  </div>

  <!-- Settings Modal Dialog -->
  <div id="settingsModal" class="modal-backdrop" style="display: none;">
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle">
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-icon">⚙️</span>
          <h3 id="settingsModalTitle" class="modal-title">偏好设置</h3>
        </div>
        <button id="btnCloseSettings" class="modal-close-btn" title="关闭">✕</button>
      </div>
      <div class="modal-body">
        <!-- Language Settings -->
        <div class="setting-item">
          <div class="setting-label-row">
            <label for="settingLanguage" id="lblSettingLang" class="setting-label">界面语言 (Language)</label>
            <span id="lblSettingLangDesc" class="setting-desc">选择插件界面的显示语言</span>
          </div>
          <select id="settingLanguage" class="setting-select">
            <option value="auto" id="optLangAuto">自动跟随 (Auto / 跟随 IDE)</option>
            <option value="zh" id="optLangZh">简体中文 (Simplified Chinese)</option>
            <option value="en" id="optLangEn">English</option>
          </select>
        </div>

        <!-- Theme Settings -->
        <div class="setting-item">
          <div class="setting-label-row">
            <label for="settingTheme" id="lblSettingTheme" class="setting-label">外观主题 (Theme)</label>
            <span id="lblSettingThemeDesc" class="setting-desc">选择色彩模式或自动跟随编辑器</span>
          </div>
          <select id="settingTheme" class="setting-select">
            <option value="auto" id="optThemeAuto">自动跟随 (Auto / 跟随 IDE)</option>
            <option value="dark" id="optThemeDark">深色模式 (Dark)</option>
            <option value="light" id="optThemeLight">浅色模式 (Light)</option>
            <option value="high-contrast" id="optThemeHighContrast">高对比度 (High Contrast)</option>
          </select>
        </div>

        <!-- Log Storage Directory -->
        <div class="setting-item">
          <div class="setting-label-row">
            <label id="lblSettingLogPath" class="setting-label">运行日志存储路径</label>
            <span id="lblSettingLogPathDesc" class="setting-desc">Claude Code 执行命令的所有输出与元数据保存在此目录</span>
          </div>
          <div class="setting-path-box">
            <div id="settingRunsDirPath" class="setting-path-text" title="点击复制">~/.claude/bash-runs</div>
          </div>
          <div class="setting-path-actions">
            <button id="btnCopyRunsDir" class="setting-btn-sub" title="复制路径">
              <span class="btn-emoji">📋</span> <span id="textBtnCopyPath">复制路径</span>
            </button>
            <button id="btnOpenRunsDir" class="setting-btn-sub" title="在系统资源管理器中打开">
              <span class="btn-emoji">📂</span> <span id="textBtnOpenFolder">打开目录</span>
            </button>
          </div>
        </div>

        <!-- Task History Safe Cleanup -->
        <div class="setting-item">
          <div class="setting-label-row">
            <label id="lblSettingCleanup" class="setting-label">历史任务清理</label>
            <span id="lblSettingCleanupDesc" class="setting-desc">一键安全清理所有已完成/已结束的历史命令与日志文件（未完成及后台任务严格保留）</span>
          </div>
          <div class="setting-path-actions">
            <button id="btnClearFinishedTasks" class="setting-btn-sub setting-btn-danger" title="一键清理已完成任务">
              <span class="btn-emoji">🗑️</span> <span id="textBtnClearFinished">一键清理已完成</span>
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="btnDoneSettings" class="setting-btn-primary modal-done-btn">
          <span id="textBtnDone">完成</span>
        </button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}?v=${nonce}"></script>
</body>
</html>`;
  }}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Native Preferences QuickPick Menu
 * Allows configuring language, theme, and opening/copying runs directory
 */
async function handleOpenSettings(context, webviewProvider) {
  const config = vscode.workspace.getConfiguration('claudeCodeMonitor');
  const currentLang = config.get('language') || 'auto';
  const currentTheme = config.get('theme') || 'auto';
  const runsDir = getRunsDir();

  const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');

  const langLabels = {
    'auto': isZh ? '自动跟随 (跟随 IDE)' : 'Auto (Follow IDE)',
    'zh': '简体中文 (Simplified Chinese)',
    'en': 'English'
  };

  const themeLabels = {
    'auto': isZh ? '自动跟随 (跟随 IDE)' : 'Auto (Follow IDE)',
    'dark': isZh ? '深色模式 (Dark)' : 'Dark',
    'light': isZh ? '浅色模式 (Light)' : 'Light',
    'high-contrast': isZh ? '高对比度 (High Contrast)' : 'High Contrast'
  };

  const items = [
    {
      id: 'language',
      label: `$(globe) ${isZh ? '界面语言' : 'Interface Language'}`,
      description: `${isZh ? '当前' : 'Current'}: ${langLabels[currentLang] || currentLang}`,
      detail: isZh ? '配置监控面板的显示语言（自动跟随 / 简体中文 / English）' : 'Set display language (Auto / Simplified Chinese / English)'
    },
    {
      id: 'theme',
      label: `$(color-mode) ${isZh ? '外观主题' : 'Appearance Theme'}`,
      description: `${isZh ? '当前' : 'Current'}: ${themeLabels[currentTheme] || currentTheme}`,
      detail: isZh ? '配置监控面板色彩主题（自动跟随 / 深色 / 浅色 / 高对比度）' : 'Set color theme (Auto / Dark / Light / High Contrast)'
    },
    {
      id: 'openRunsDir',
      label: `$(folder-opened) ${isZh ? '打开日志存储目录' : 'Open Runs Log Directory'}`,
      description: runsDir,
      detail: isZh ? '在系统资源管理器中打开 Claude Code 的 bash-runs 日志目录' : 'Open the Claude Code bash-runs directory in system explorer'
    },
    {
      id: 'copyRunsDir',
      label: `$(clippy) ${isZh ? '复制日志路径' : 'Copy Log Path'}`,
      description: runsDir,
      detail: isZh ? '将日志目录的绝对路径复制到系统剪贴板' : 'Copy log directory path to system clipboard'
    },
    {
      id: 'openDialog',
      label: `$(settings-gear) ${isZh ? '打开图形化设置弹窗' : 'Open Preferences Dialog'}`,
      detail: isZh ? '在监控面板内弹出可视化偏好设置弹窗' : 'Open the visual settings modal inside monitor panel'
    }
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: isZh ? 'Claude Code: Terminal & Task Monitor 偏好设置' : 'Claude Code: Terminal & Task Monitor Preferences'
  });

  if (!picked) return;

  if (picked.id === 'language') {
    const langChoices = [
      { id: 'auto', label: langLabels['auto'], description: isZh ? '跟随 VS Code 编辑器语言' : 'Follow VS Code language' },
      { id: 'zh', label: langLabels['zh'] },
      { id: 'en', label: langLabels['en'] }
    ];
    const pickedLang = await vscode.window.showQuickPick(langChoices, {
      placeHolder: isZh ? '选择监控面板语言' : 'Select Monitor Language'
    });
    if (pickedLang) {
      await config.update('language', pickedLang.id, vscode.ConfigurationTarget.Global);
      if (webviewProvider) {
        webviewProvider.postMessage({ type: 'set_language', language: pickedLang.id });
      }
      vscode.window.showInformationMessage(
        isZh ? `界面语言已切换为: ${pickedLang.label}` : `Language set to: ${pickedLang.label}`
      );
    }
  } else if (picked.id === 'theme') {
    const themeChoices = [
      { id: 'auto', label: themeLabels['auto'], description: isZh ? '跟随 VS Code 编辑器主题' : 'Follow VS Code theme' },
      { id: 'dark', label: themeLabels['dark'] },
      { id: 'light', label: themeLabels['light'] },
      { id: 'high-contrast', label: themeLabels['high-contrast'] }
    ];
    const pickedTheme = await vscode.window.showQuickPick(themeChoices, {
      placeHolder: isZh ? '选择外观主题' : 'Select Appearance Theme'
    });
    if (pickedTheme) {
      await config.update('theme', pickedTheme.id, vscode.ConfigurationTarget.Global);
      if (webviewProvider) {
        webviewProvider.postMessage({ type: 'set_theme', theme: pickedTheme.id });
      }
      vscode.window.showInformationMessage(
        isZh ? `外观主题已切换为: ${pickedTheme.label}` : `Theme set to: ${pickedTheme.label}`
      );
    }
  } else if (picked.id === 'openRunsDir') {
    vscode.commands.executeCommand('claudeCodeMonitor.openRunsDir');
  } else if (picked.id === 'copyRunsDir') {
    vscode.env.clipboard.writeText(runsDir);
    vscode.window.showInformationMessage(
      isZh ? `已复制日志目录路径: ${runsDir}` : `Log directory path copied: ${runsDir}`
    );
  } else if (picked.id === 'openDialog') {
    if (webviewProvider) {
      webviewProvider.postMessage({ type: 'open_settings_modal' });
    }
  }
}

/**
 * Extension Activation Function
 */
function activate(context) {
  const runsDir = getRunsDir();
  if (!fs.existsSync(runsDir)) {
    fs.mkdirSync(runsDir, { recursive: true });
  }

  const hookManager = new HookManager(runsDir, context);
  const taskStore = new TaskStore(runsDir);

  // Status Bar Item and Indicator
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'claudeCodeMonitor.toggleHook';
  context.subscriptions.push(statusBarItem);

  function updateStatusBar() {
    const enabled = hookManager.isEnabled();
    if (enabled) {
      statusBarItem.text = isZh ? '$(plug) Hook: 开' : '$(plug) Hook: On';
      statusBarItem.tooltip = isZh ? 'Claude Code Bash Hook: 已启用' : 'Claude Code Bash Hook: Enabled';
      statusBarItem.backgroundColor = undefined;
    } else {
      statusBarItem.text = isZh ? '$(plug) Hook: 关' : '$(plug) Hook: Off';
      statusBarItem.tooltip = isZh ? 'Claude Code Bash Hook: 已停用' : 'Claude Code Bash Hook: Disabled';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
  }
  updateStatusBar();

  // On activation, ensure settings.json has hook configuration if not disabled
  if (hookManager.isEnabled()) {
    try {
      hookManager.ensureSettingsConfigured();
    } catch (e) {}
  }

  let webviewProvider = null;

  // Create single-task on-demand tailer (streams only the selected task)
  const tailer = new PersistentTailer((runId, stream, lines) => {
    if (webviewProvider) {
      webviewProvider.postMessage({
        type: 'task_output',
        runId,
        stream,
        lines,
      });
    }
  });

  webviewProvider = new ClaudeCodeMonitorViewProvider(context.extensionUri, hookManager, taskStore, tailer);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('claudeCodeMonitorView', webviewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Periodic check for PID liveness and dynamic session title updates (3.5s interval)
  const pollInterval = setInterval(() => {
    try {
      taskStore.pollRunningTasks((task, sessionId, runId) => {
        if (webviewProvider) {
          webviewProvider.postMessage({
            type: 'task_status',
            run_id: runId,
            session_id: sessionId,
            status: task.status,
            rc: task.exit_code,
            ended_at: task.ended_at,
            actual_ended_at: task.actual_ended_at,
            actual_duration: task.actual_duration,
          });
        }
      });

      // Detect session title renames and push updates to webview in real time
      if (webviewProvider) {
        let titleChanged = false;
        for (const sId of Object.keys(taskStore.sessions)) {
          const s = taskStore.sessions[sId];
          const latest = taskStore.resolveSessionTitle(sId);
          if (latest && latest !== s.title) {
            s.title = latest;
            titleChanged = true;
          }
        }
        if (titleChanged) {
          webviewProvider.postMessage({
            type: 'session_list',
            sessions: taskStore.sessions,
          });
        }
      }
    } catch (e) {}
  }, 3500);
  context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });

  // Lightweight local HTTP event receiver (status arbitration hub)
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/event') {
      let body = '';
      let overflow = false;
      req.on('data', (chunk) => {
        if (overflow) return;
        body += chunk;
        if (body.length > 1024 * 1024) { // 1MB payload limit
          overflow = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end('{"error":"Payload Too Large"}');
          req.destroy();
        }
      });
      req.on('error', () => {});
      req.on('end', () => {
        if (overflow) return;
        try {
          const evt = JSON.parse(body);
          if (evt.t === 'task_start') {
            // Reconcile prior orphan running tasks in the same session interrupted unexpectedly
            const orphans = taskStore.cleanupOrphanRunningTasks(evt.session_id, evt.run_id, evt.started_at);
            if (webviewProvider && orphans.length > 0) {
              for (const o of orphans) {
                webviewProvider.postMessage({
                  type: 'task_status',
                  run_id: o.runId,
                  session_id: o.sessionId,
                  status: 'interrupted',
                  rc: 130,
                  ended_at: o.endedAt,
                });
              }
            }

            const task = {
              run_id: evt.run_id,
              session_id: evt.session_id,
              command: evt.command,
              description: evt.description || '',
              started_at: evt.started_at,
              cwd: evt.cwd,
              status: 'running',
              source: 'none',
              isBackground: false,
            };
            taskStore.upsertTask(task);
            if (webviewProvider) {
              webviewProvider.postMessage({ type: 'task_start', task });
              const autoFollow = vscode.workspace.getConfiguration('claudeCodeMonitor').get('autoFollow');
              if (autoFollow) {
                webviewProvider._handleSelectTask(task.run_id, task.session_id);
              }
            }
          } else if (evt.t === 'wrapper_end') {
            const sessionId = evt.session_id || evt.session;
            const status = evt.status || (evt.rc === 0 ? 'finished' : (evt.rc === 130 ? 'interrupted' : 'failed'));

            // Defensive: populate task from disk if not yet in memory
            if (!taskStore.sessions[sessionId] || !taskStore.sessions[sessionId].tasks[evt.run_id]) {
              const metaPath = path.join(runsDir, sessionId, `${evt.run_id}.json`);
              if (fs.existsSync(metaPath)) {
                try {
                  const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                  taskStore.upsertTask(m);
                } catch (e) {}
              }
            }

            // Exit code from wrapper takes precedence
            const updated = taskStore.handleWrapperEnd(evt.run_id, sessionId, status, evt.rc, evt.ended_at, evt.actual_duration);
            if (updated && webviewProvider) {
              const t = taskStore.sessions[sessionId]?.tasks[evt.run_id];
              webviewProvider.postMessage({
                type: 'task_status',
                run_id: evt.run_id,
                session_id: sessionId,
                status: t ? t.status : status,
                rc: evt.rc,
                ended_at: evt.ended_at,
                actual_ended_at: evt.ended_at,
                actual_duration: t ? t.actual_duration : evt.actual_duration,
                foreground_duration: t ? t.foreground_duration : undefined,
              });
              if (tailer.currentTask && tailer.currentTask.runId === evt.run_id) {
                tailer.readStreamChunk('stdout');
                tailer.readStreamChunk('stderr');
                tailer.flushFinal();
              }
            }
          } else if (evt.t === 'posttool_end') {
            // Status and metadata from hook take precedence
            const status = evt.status || (evt.rc === 0 ? 'finished' : (evt.rc === 130 ? 'interrupted' : 'failed'));
            const updated = taskStore.handlePosttoolEnd(
              evt.run_id,
              evt.session_id,
              status,
              evt.rc,
              evt.response,
              evt.error,
              evt.ended_at
            );
            if (updated && webviewProvider) {
              const t = taskStore.sessions[evt.session_id]?.tasks[evt.run_id];
              webviewProvider.postMessage({
                type: 'task_status',
                run_id: evt.run_id,
                session_id: evt.session_id,
                status,
                rc: t ? t.exit_code : evt.rc,
                response: evt.response,
                error: evt.error,
                ended_at: evt.ended_at,
                actual_ended_at: t ? t.actual_ended_at : undefined,
                foreground_duration: t ? t.foreground_duration : undefined,
                actual_duration: t ? t.actual_duration : undefined,
              });
              if (tailer.currentTask && tailer.currentTask.runId === evt.run_id) {
                tailer.readStreamChunk('stdout');
                tailer.readStreamChunk('stderr');
                tailer.flushFinal();
              }
            }
          } else if (evt.t === 'posttool_background') {
            // Transition to background task
            const updated = taskStore.handlePosttoolBackground(evt.run_id, evt.session_id, evt.response, evt.foreground_ended_at);
            if (updated && webviewProvider) {
              const t = taskStore.sessions[evt.session_id]?.tasks[evt.run_id];
              webviewProvider.postMessage({
                type: 'task_status',
                run_id: evt.run_id,
                session_id: evt.session_id,
                status: 'background',
                response: evt.response,
                foreground_duration: t ? t.foreground_duration : undefined,
              });
            }
          } else if (evt.t === 'task_status') {
            taskStore.updateTaskStatus(evt.run_id, evt.session_id, evt.status, evt);
            if (webviewProvider) {
              webviewProvider.postMessage(Object.assign({ type: 'task_status' }, evt));
            }
          }
        } catch (e) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.on('error', (err) => {
    console.error('[Claude Monitor] HTTP Server error:', err.message);
  });
  server.on('clientError', (err, socket) => {
    try { socket.destroy(); } catch (e) {}
  });

function registerMonitorInstance(runsDir, port, pid) {
  const monitorFile = path.join(runsDir, '.monitor.json');
  let data = { instances: [] };
  if (fs.existsSync(monitorFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(monitorFile, 'utf8'));
      if (Array.isArray(parsed.instances)) {
        data.instances = parsed.instances;
      } else if (parsed.port && parsed.pid) {
        data.instances = [{ port: parsed.port, pid: parsed.pid, updated_at: parsed.updated_at || Date.now() }];
      }
    } catch (e) {}
  }

  // Filter dead orphan instances (self-healing) and deduplicate current process
  data.instances = data.instances.filter(inst => {
    if (!inst.pid || inst.pid === pid) return false;
    try {
      process.kill(inst.pid, 0);
      return true;
    } catch (e) {
      return e.code === 'EPERM';
    }
  });

  data.instances.push({
    pid,
    port,
    updated_at: Date.now(),
  });

  data.port = port;
  data.pid = pid;
  data.updated_at = Date.now();

  try {
    const tmp = `${monitorFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, monitorFile);
  } catch (e) {
    try { fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2), 'utf8'); } catch (e2) {}
  }
}

function unregisterMonitorInstance(runsDir, pid) {
  const monitorFile = path.join(runsDir, '.monitor.json');
  if (!fs.existsSync(monitorFile)) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(monitorFile, 'utf8'));
    let instances = Array.isArray(parsed.instances) ? parsed.instances : [];
    instances = instances.filter(inst => inst.pid !== pid);

    // Filter out dead orphan instances
    instances = instances.filter(inst => {
      try {
        process.kill(inst.pid, 0);
        return true;
      } catch (e) {
        return e.code === 'EPERM';
      }
    });

    if (instances.length === 0) {
      // Only remove file when the last IDE instance exits
      try { fs.unlinkSync(monitorFile); } catch (e) {}
    } else {
      parsed.instances = instances;
      const latest = instances[instances.length - 1];
      parsed.port = latest.port;
      parsed.pid = latest.pid;
      parsed.updated_at = Date.now();

      const tmp = `${monitorFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2), 'utf8');
      fs.renameSync(tmp, monitorFile);
    }
  } catch (e) {}
}

  // Bind to random available port on 127.0.0.1
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = address.port;
    registerMonitorInstance(runsDir, port, process.pid);
  });

  // Initialize menu context states
  vscode.commands.executeCommand('setContext', 'claudeCodeMonitor.hookEnabled', hookManager.isEnabled());
  const initialAutoFollow = vscode.workspace.getConfiguration('claudeCodeMonitor').get('autoFollow', true);
  vscode.commands.executeCommand('setContext', 'claudeCodeMonitor.autoFollowEnabled', initialAutoFollow);

  // Register VS Code native commands
  const toggleHookHandler = () => {
    const enabled = hookManager.toggle();
    vscode.commands.executeCommand('setContext', 'claudeCodeMonitor.hookEnabled', enabled);
    updateStatusBar();
    if (webviewProvider) {
      webviewProvider.postMessage({ type: 'hook_status', enabled });
    }
    const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');
    vscode.window.showInformationMessage(
      enabled
        ? (isZh ? 'Claude Code Hook 已启用' : 'Claude Code Hook enabled')
        : (isZh ? 'Claude Code Hook 已临时停用（直通放行）' : 'Claude Code Hook disabled')
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.toggleHook', toggleHookHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.enableHook', toggleHookHandler)
  );

  const toggleAutoFollowHandler = () => {
    const cfg = vscode.workspace.getConfiguration('claudeCodeMonitor');
    const cur = cfg.get('autoFollow', true);
    const next = !cur;
    cfg.update('autoFollow', next, vscode.ConfigurationTarget.Global);
    vscode.commands.executeCommand('setContext', 'claudeCodeMonitor.autoFollowEnabled', next);
    if (webviewProvider) {
      webviewProvider.postMessage({ type: 'auto_follow', enabled: next });
    }
    const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');
    vscode.window.showInformationMessage(
      next
        ? (isZh ? '已开启自动追踪最新任务' : 'Auto-follow enabled')
        : (isZh ? '已暂停自动追踪最新任务' : 'Auto-follow paused')
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.toggleAutoFollow', toggleAutoFollowHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.enableAutoFollow', toggleAutoFollowHandler)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.refresh', () => {
      if (webviewProvider) {
        webviewProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.openSettings', () => {
      if (webviewProvider) {
        webviewProvider.postMessage({ type: 'open_settings_modal' });
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.clearHistory', async () => {
      const isZh = (vscode.env.language || 'en').toLowerCase().startsWith('zh');
      const confirm = await vscode.window.showWarningMessage(
        isZh ? '确定要清理所有已完成的 Bash 任务历史日志吗？运行中和后台任务将严格保留。' : 'Clean all completed Bash task logs? Running and background tasks will be preserved.',
        { modal: true },
        isZh ? '确定清理' : 'Clean'
      );
      if (confirm === (isZh ? '确定清理' : 'Clean')) {
        tailer.detach();
        const cleaned = taskStore.clearCompletedTasks();
        if (webviewProvider) {
          const remainingSessions = taskStore.sessions;
          if (!webviewProvider._activeSessionId || !remainingSessions[webviewProvider._activeSessionId]?.tasks[webviewProvider._activeRunId]) {
            webviewProvider._activeRunId = null;
            webviewProvider._activeSessionId = null;
            webviewProvider.postMessage({ type: 'task_reset_output', runId: null });
          }
          webviewProvider.refresh();
          webviewProvider.postMessage({ type: 'cleared_finished_tasks', count: cleaned });
        }
        vscode.window.showInformationMessage(
          isZh
            ? `已清理 ${cleaned} 个已完成任务，未完成的任务已完好保留。`
            : `Cleared ${cleaned} completed task(s). Unfinished tasks were preserved.`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.openLogFile', () => {
      if (webviewProvider && webviewProvider._activeRunId) {
        webviewProvider._handleOpenLogFile(webviewProvider._activeRunId, webviewProvider._activeSessionId);
      } else {
        vscode.window.showInformationMessage(isZh ? '请先在任务列表中选中一个任务' : 'Please select a task in the list first');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeMonitor.openRunsDir', () => {
      const runsDir = getRunsDir();
      if (!fs.existsSync(runsDir)) {
        try {
          fs.mkdirSync(runsDir, { recursive: true });
        } catch (e) {}
      }
      vscode.env.openExternal(vscode.Uri.file(runsDir));
    })
  );


  // Cleanup and dispose resources
  context.subscriptions.push({
    dispose: () => {
      tailer.detach();
      try {
        server.close();
      } catch (e) {}
      unregisterMonitorInstance(runsDir, process.pid);
    },
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
