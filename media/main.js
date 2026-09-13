// @ts-nocheck
(function () {
  const vscode = acquireVsCodeApi();

  // Internationalization language dictionaries (Seamless English and Chinese adaptation)
  const I18N = {
    zh: {
      headerTitle: '执行队列',
      hookEnabled: '● Hook: 已启用',
      hookDisabled: '○ Hook: 已停用',
      hookTooltip: '点击切换 Hook 状态',
      followText: '追踪',
      followTitleActive: '🎯 自动追踪最新：开启中（新任务自动选中跟随，点击可暂停）',
      followTitleInactive: '🎯 自动追踪最新：已暂停（点击恢复自动跟随新任务）',
      refreshText: '刷新',
      refreshTitle: '刷新记录列表',
      clearText: '清空',
      clearTitle: '清空已结束记录',
      searchPlaceholder: '🔍 搜索命令 / 描述 / 会话...',
      clearSearchTitle: '清空搜索',
      pillAll: '全部',
      pillRunning: '运行中',
      pillFailed: '失败',
      pillSuccess: '成功',
      pillGit: 'Git',
      pillTest: '测试',
      pillBuild: '构建',
      pillScript: '脚本',
      pillFailedTitle: '筛选执行失败或被中断的任务',
      pillRunningTitle: '筛选正在运行或后台任务',
      pillSuccessTitle: '筛选正常执行完毕的任务',
      tasksCount: '个任务',
      tasksFilteredCount: '{filtered} / {total} 个任务',
      emptyFiltered: '没有符合当前筛选条件的任务',
      resetFilter: '点击重置筛选条件',
      emptyInit: '暂无任务记录',
      hiddenOlder: '... 已隐藏更早的 {n} 个任务',
      sessionTooltip: '会话: {title}\nID: {id}\n点击折叠/展开',
      tabAll: '全部',
      tabStdout: '输出',
      tabStderr: '错误',
      scrollLockText: '滚动',
      scrollLockActiveTitle: '已锁定自动滚动（点击取消）',
      scrollLockInactiveTitle: '已暂停自动滚动（点击恢复）',
      copyCmdText: '复制',
      copyCmdTitle: '复制当前命令',
      openLogText: '日志',
      openLogTitle: '在原生编辑器打开完整输出日志',
      splitterTitle: '上下拖拽可调整列表与终端面板高度',
      truncationText: '⚠️ 已启用防爆保护：仅在面板保留最多 3,000 行输出。',
      truncationBtn: '在编辑器打开完整日志',
      noTaskSelected: '(未选择任务)',
      statusRunning: '运行中',
      statusBackground: '后台',
      statusFinished: '结束',
      statusFailed: '错误',
      statusInterrupted: '已中断',
      statusDenied: '已拒绝',
      fgDur: '前台',
      actDur: '实际',
      bgDur: '后台',
      durUnit: '耗时',
      emptyTerminalHint: '暂无输出内容或等待任务运行中...',
      tooltipRunning: '任务正在前台运行中\n前台等待计时: {t}',
      tooltipBackground: '前台耗时: {fg}\n后台累计运行: {bg}',
      tooltipFinished: '前台耗时: {fg} (包含上下文调度与前台等待)\n实际耗时: {act} (底层命令真实执行耗时)',
      tooltipSingleFg: '前台耗时: {fg}',
      tooltipSingleAct: '实际耗时: {act}',
      settingsText: '设置',
      settingsTitle: '偏好设置 (语言、主题、日志路径)',
      settingsModalTitle: '偏好设置',
      lblSettingLang: '界面语言 (Language)',
      lblSettingLangDesc: '选择插件界面的显示语言',
      optLangAuto: '自动跟随 (Auto / 跟随 IDE)',
      optLangZh: '简体中文 (Simplified Chinese)',
      optLangEn: 'English',
      lblSettingTheme: '外观主题 (Theme)',
      lblSettingThemeDesc: '选择色彩模式或自动跟随编辑器',
      optThemeAuto: '自动跟随 (Auto / 跟随 IDE)',
      optThemeDark: '深色模式 (Dark)',
      optThemeLight: '浅色模式 (Light)',
      optThemeHighContrast: '高对比度 (High Contrast)',
      lblSettingLogPath: '运行日志存储路径',
      lblSettingLogPathDesc: 'Claude Code 执行命令的所有输出与元数据保存在此目录',
      btnCopyPath: '复制路径',
      btnOpenFolder: '打开目录',
      lblSettingCleanup: '历史任务清理',
      lblSettingCleanupDesc: '一键安全清理所有已完成/已结束的历史命令与日志文件（未完成及后台任务严格保留）',
      btnClearFinished: '一键清理已完成',
      btnDone: '完成',
      copiedPathNotice: '✓ 已复制路径到剪贴板！',
    },
    en: {
      headerTitle: 'Execution Queue',
      hookEnabled: '● Hook: Enabled',
      hookDisabled: '○ Hook: Disabled',
      hookTooltip: 'Click to toggle Hook status',
      followText: 'Follow',
      followTitleActive: '🎯 Auto-Follow: Active (automatically select & follow new tasks, click to pause)',
      followTitleInactive: '🎯 Auto-Follow: Paused (click to resume auto-following)',
      refreshText: 'Refresh',
      refreshTitle: 'Refresh task records',
      clearText: 'Clear',
      clearTitle: 'Clear finished records',
      searchPlaceholder: '🔍 Search command / desc / session...',
      clearSearchTitle: 'Clear search',
      pillAll: 'All',
      pillRunning: 'Running',
      pillFailed: 'Failed',
      pillSuccess: 'Success',
      pillGit: 'Git',
      pillTest: 'Test',
      pillBuild: 'Build',
      pillScript: 'Script',
      pillFailedTitle: 'Filter failed or interrupted tasks',
      pillRunningTitle: 'Filter running or background tasks',
      pillSuccessTitle: 'Filter successfully finished tasks',
      tasksCount: 'tasks',
      tasksFilteredCount: '{filtered} / {total} tasks',
      emptyFiltered: 'No tasks match current filter',
      resetFilter: 'Click to reset filters',
      emptyInit: 'No task records yet',
      hiddenOlder: '... Hidden {n} older tasks',
      sessionTooltip: 'Session: {title}\nID: {id}\nClick to toggle collapse',
      tabAll: 'All',
      tabStdout: 'Stdout',
      tabStderr: 'Stderr',
      scrollLockText: 'Scroll',
      scrollLockActiveTitle: 'Auto-scroll locked (click to pause)',
      scrollLockInactiveTitle: 'Auto-scroll paused (click to resume)',
      copyCmdText: 'Copy',
      copyCmdTitle: 'Copy current command',
      openLogText: 'Log',
      openLogTitle: 'Open full output log in editor',
      splitterTitle: 'Drag vertically to resize task list and terminal',
      truncationText: '⚠️ Buffer protection active: keeping latest 3,000 lines in panel.',
      truncationBtn: 'Open full log in editor',
      noTaskSelected: '(No task selected)',
      statusRunning: 'Running',
      statusBackground: 'Background',
      statusFinished: 'Finished',
      statusFailed: 'Failed',
      statusInterrupted: 'Interrupted',
      statusDenied: 'Denied',
      fgDur: 'Foreground',
      actDur: 'Actual',
      bgDur: 'Background',
      durUnit: 'Duration',
      emptyTerminalHint: 'No output yet or waiting for task to run...',
      tooltipRunning: 'Task running in foreground\nForeground elapsed: {t}',
      tooltipBackground: 'Foreground: {fg}\nBackground elapsed: {bg}',
      tooltipFinished: 'Foreground: {fg} (context scheduling & waiting)\nActual: {act} (real command execution time)',
      tooltipSingleFg: 'Foreground: {fg}',
      tooltipSingleAct: 'Actual: {act}',
      settingsText: 'Settings',
      settingsTitle: 'Preferences (Language, Theme, Log Path)',
      settingsModalTitle: 'Preferences',
      lblSettingLang: 'Interface Language',
      lblSettingLangDesc: 'Choose display language for the monitor',
      optLangAuto: 'Auto (Follow IDE)',
      optLangZh: 'Simplified Chinese (简体中文)',
      optLangEn: 'English',
      lblSettingTheme: 'Appearance Theme',
      lblSettingThemeDesc: 'Select color mode or follow editor',
      optThemeAuto: 'Auto (Follow IDE)',
      optThemeDark: 'Dark Mode',
      optThemeLight: 'Light Mode',
      optThemeHighContrast: 'High Contrast',
      lblSettingLogPath: 'Runs Log Directory',
      lblSettingLogPathDesc: 'Directory where all command output logs and metadata are stored',
      btnCopyPath: 'Copy Path',
      btnOpenFolder: 'Open Folder',
      lblSettingCleanup: 'Task History Cleanup',
      lblSettingCleanupDesc: 'Safely clean completed command logs and files. Active running and background tasks are strictly preserved.',
      btnClearFinished: 'Clear Completed Tasks',
      btnDone: 'Done',
      copiedPathNotice: '✓ Log path copied to clipboard!',
    }
  };

  const savedLangPref = localStorage.getItem('ccm_language_preference') || 'auto';
  const savedThemePref = localStorage.getItem('ccm_theme_preference') || 'auto';
  let initialLocale = ((navigator.language || 'en').toLowerCase().startsWith('zh')) ? 'zh' : 'en';
  if (savedLangPref === 'zh' || savedLangPref === 'en') {
    initialLocale = savedLangPref;
  }

  let state = {
    locale: initialLocale,
    ideLocale: initialLocale,
    runsDir: '',
    languagePref: savedLangPref,
    themePref: savedThemePref,
    hookEnabled: true,
    sessions: {},
    activeRunId: null,
    activeSessionId: null,
    activeFilter: 'all', // 'all' | 'stdout' | 'stderr'
    filterCategory: 'all', // 'all' | 'running' | 'failed' | 'success' | 'git' | 'test' | 'build' | 'script'
    filterSearch: '',
    autoScroll: true,
    autoFollow: true,
    maxLines: 3000,
    stdoutCount: 0,
    stderrCount: 0,
  };

  function applyThemePreference(pref) {
    document.body.classList.remove('theme-override-dark', 'theme-override-light', 'theme-override-high-contrast');
    if (pref === 'dark') {
      document.body.classList.add('theme-override-dark');
    } else if (pref === 'light') {
      document.body.classList.add('theme-override-light');
    } else if (pref === 'high-contrast') {
      document.body.classList.add('theme-override-high-contrast');
    }
  }

  function updateSettingsModalValues() {
    const settingLanguage = document.getElementById('settingLanguage');
    const settingTheme = document.getElementById('settingTheme');
    const settingRunsDirPath = document.getElementById('settingRunsDirPath');
    if (settingLanguage) {
      settingLanguage.value = state.languagePref;
    }
    if (settingTheme) {
      settingTheme.value = state.themePref;
    }
    if (settingRunsDirPath) {
      settingRunsDirPath.textContent = state.runsDir || '~/.claude/bash-runs';
      settingRunsDirPath.title = state.runsDir || '~/.claude/bash-runs';
    }
  }

  function openSettingsModal() {
    updateSettingsModalValues();
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'flex';
    }
  }

  function closeSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }

  function copyRunsDirPath() {
    const text = state.runsDir || (document.getElementById('settingRunsDirPath') ? document.getElementById('settingRunsDirPath').textContent : '');
    if (!text) return;
    try {
      navigator.clipboard.writeText(text).catch(() => {});
    } catch (e) {}
    vscode.postMessage({ command: 'copyRunsDir' });
    const textBtnCopyPath = document.getElementById('textBtnCopyPath');
    if (textBtnCopyPath) {
      const originalText = textBtnCopyPath.textContent;
      textBtnCopyPath.textContent = t('copiedPathNotice');
      setTimeout(() => {
        textBtnCopyPath.textContent = originalText;
      }, 1500);
    }
  }

  function t(key, params) {
    const dict = I18N[state.locale] || I18N.zh;
    let str = dict[key] || I18N.en[key] || key;
    if (params) {
      for (const k of Object.keys(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      }
    }
    return str;
  }

  // Dynamically update static page text and tooltips
  function applyI18n() {
    const setTxt = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(key);
    };
    const setAttr = (id, attr, key) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute(attr, t(key));
    };

    setTxt('headerTitle', 'headerTitle');
    setTxt('textFollow', 'followText');
    setTxt('textRefresh', 'refreshText');
    setTxt('textClear', 'clearText');
    setAttr('btnRefresh', 'title', 'refreshTitle');
    setAttr('btnClearHistory', 'title', 'clearTitle');
    setAttr('taskSearchInput', 'placeholder', 'searchPlaceholder');
    setAttr('btnClearSearch', 'title', 'clearSearchTitle');

    setTxt('pillTextAll', 'pillAll');
    setTxt('pillTextRunning', 'pillRunning');
    setTxt('pillTextFailed', 'pillFailed');
    setTxt('pillTextSuccess', 'pillSuccess');
    setTxt('pillTextGit', 'pillGit');
    setTxt('pillTextTest', 'pillTest');
    setTxt('pillTextBuild', 'pillBuild');
    setTxt('pillTextScript', 'pillScript');

    setAttr('pillRunning', 'title', 'pillRunningTitle');
    setAttr('pillFailed', 'title', 'pillFailedTitle');
    setAttr('pillSuccess', 'title', 'pillSuccessTitle');

    setTxt('tabAll', 'tabAll');
    setTxt('tabStdout', 'tabStdout');
    setTxt('tabStderr', 'tabStderr');

    setTxt('textScrollLock', 'scrollLockText');
    setTxt('textCopyCmd', 'copyCmdText');
    setTxt('textOpenLog', 'openLogText');
    setAttr('btnCopyCommand', 'title', 'copyCmdTitle');
    setAttr('btnOpenInEditor', 'title', 'openLogTitle');

    setAttr('panelSplitter', 'title', 'splitterTitle');
    setTxt('truncationText', 'truncationText');
    setTxt('btnBannerOpen', 'truncationBtn');

    setTxt('textSettings', 'settingsText');
    setAttr('btnOpenSettings', 'title', 'settingsTitle');
    setTxt('settingsModalTitle', 'settingsModalTitle');
    setTxt('lblSettingLang', 'lblSettingLang');
    setTxt('lblSettingLangDesc', 'lblSettingLangDesc');
    setTxt('optLangAuto', 'optLangAuto');
    setTxt('optLangZh', 'optLangZh');
    setTxt('optLangEn', 'optLangEn');
    setTxt('lblSettingTheme', 'lblSettingTheme');
    setTxt('lblSettingThemeDesc', 'lblSettingThemeDesc');
    setTxt('optThemeAuto', 'optThemeAuto');
    setTxt('optThemeDark', 'optThemeDark');
    setTxt('optThemeLight', 'optThemeLight');
    setTxt('optThemeHighContrast', 'optThemeHighContrast');
    setTxt('lblSettingLogPath', 'lblSettingLogPath');
    setTxt('lblSettingLogPathDesc', 'lblSettingLogPathDesc');
    setTxt('textBtnCopyPath', 'btnCopyPath');
    setTxt('textBtnOpenFolder', 'btnOpenFolder');
    setTxt('lblSettingCleanup', 'lblSettingCleanup');
    setTxt('lblSettingCleanupDesc', 'lblSettingCleanupDesc');
    setTxt('textBtnClearFinished', 'btnClearFinished');
    setTxt('textBtnDone', 'btnDone');

    if (terminalOutput) {
      terminalOutput.setAttribute('data-empty-hint', t('emptyTerminalHint'));
    }

    updateHookBadge();
    updateAutoFollowBadge();
    updateScrollButton();
  }

  // DOM element cache
  const hookStatusEl = document.getElementById('hookStatus');
  const sessionsContainer = document.getElementById('sessionsContainer');
  const taskCountBadge = document.getElementById('taskCountBadge');
  const terminalOutput = document.getElementById('terminalOutput');
  const activeCmdText = document.getElementById('activeCmdText');
  const activeStatusBadge = document.getElementById('activeStatusBadge');
  const activeExitBadge = document.getElementById('activeExitBadge');
  const activeDurationBadge = document.getElementById('activeDurationBadge');
  const truncationBanner = document.getElementById('truncationBanner');
  const btnScrollLock = document.getElementById('btnScrollLock');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnCopyCommand = document.getElementById('btnCopyCommand');
  const btnOpenInEditor = document.getElementById('btnOpenInEditor');
  const btnBannerOpen = document.getElementById('btnBannerOpen');
  const tabAllCount = document.getElementById('tabAllCount');
  const tabStdoutCount = document.getElementById('tabStdoutCount');
  const tabStderrCount = document.getElementById('tabStderrCount');
  const taskSearchInput = document.getElementById('taskSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const tasksPanel = document.getElementById('tasksPanel');
  const terminalPanel = document.getElementById('terminalPanel');
  const panelSplitter = document.getElementById('panelSplitter');
  const btnToggleAutoFollow = document.getElementById('btnToggleAutoFollow');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnDoneSettings = document.getElementById('btnDoneSettings');
  const settingsModal = document.getElementById('settingsModal');
  const settingLanguage = document.getElementById('settingLanguage');
  const settingTheme = document.getElementById('settingTheme');
  const btnCopyRunsDir = document.getElementById('btnCopyRunsDir');
  const btnOpenRunsDir = document.getElementById('btnOpenRunsDir');
  const settingRunsDirPath = document.getElementById('settingRunsDirPath');

  // Batch render buffer
  let pendingLines = [];
  let rafScheduled = false;

  // Bind global button interaction events (Avoids CSP inline onclick blocks)
  function initEventListeners() {
    if (hookStatusEl) {
      hookStatusEl.addEventListener('click', () => {
        vscode.postMessage({ command: 'toggleHook' });
      });
    }

    if (btnToggleAutoFollow) {
      btnToggleAutoFollow.addEventListener('click', () => {
        vscode.postMessage({ command: 'toggleAutoFollow' });
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        vscode.postMessage({ command: 'refresh' });
      });
    }

    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => {
        vscode.postMessage({ command: 'clearHistory' });
      });
    }

    if (btnScrollLock) {
      btnScrollLock.addEventListener('click', toggleAutoScroll);
    }

    if (btnCopyCommand) {
      btnCopyCommand.addEventListener('click', copyCommand);
    }

    if (btnOpenInEditor) {
      btnOpenInEditor.addEventListener('click', openInEditor);
    }

    if (btnBannerOpen) {
      btnBannerOpen.addEventListener('click', openInEditor);
    }

    // Settings modal and user preferences
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', openSettingsModal);
    }
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', closeSettingsModal);
    }
    if (btnDoneSettings) {
      btnDoneSettings.addEventListener('click', closeSettingsModal);
    }
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          closeSettingsModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
      }
    });

    if (settingLanguage) {
      settingLanguage.addEventListener('change', (e) => {
        state.languagePref = e.target.value;
        try {
          localStorage.setItem('ccm_language_preference', state.languagePref);
        } catch (err) {}
        if (state.languagePref === 'auto') {
          state.locale = state.ideLocale || 'zh';
        } else {
          state.locale = state.languagePref;
        }
        vscode.postMessage({ command: 'saveLanguage', value: state.languagePref });
        applyI18n();
        renderSessions(state.sessions);
        if (state.activeRunId) {
          updateActiveTaskHeader();
        }
      });
    }

    if (settingTheme) {
      settingTheme.addEventListener('change', (e) => {
        state.themePref = e.target.value;
        try {
          localStorage.setItem('ccm_theme_preference', state.themePref);
        } catch (err) {}
        vscode.postMessage({ command: 'saveTheme', value: state.themePref });
        applyThemePreference(state.themePref);
      });
    }

    if (btnCopyRunsDir) {
      btnCopyRunsDir.addEventListener('click', copyRunsDirPath);
    }
    if (settingRunsDirPath) {
      settingRunsDirPath.addEventListener('click', copyRunsDirPath);
    }
    if (btnOpenRunsDir) {
      btnOpenRunsDir.addEventListener('click', () => {
        vscode.postMessage({ command: 'openRunsDir' });
      });
    }

    const btnClearFinishedTasks = document.getElementById('btnClearFinishedTasks');
    if (btnClearFinishedTasks) {
      btnClearFinishedTasks.addEventListener('click', () => {
        if (btnClearFinishedTasks.disabled) return;
        btnClearFinishedTasks.disabled = true;
        const textBtnClearFinished = document.getElementById('textBtnClearFinished');
        if (textBtnClearFinished) {
          textBtnClearFinished.textContent = state.locale === 'zh' ? '正在安全清理...' : 'Cleaning...';
        }
        vscode.postMessage({ command: 'clearCompletedTasks' });
      });
    }

    // Bind category filter pills
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.filterCategory = pill.getAttribute('data-filter') || 'all';
        renderSessions(state.sessions);
      });
    });

    // Bind real-time search input
    if (taskSearchInput) {
      taskSearchInput.addEventListener('input', (e) => {
        state.filterSearch = e.target.value.trim();
        if (btnClearSearch) {
          btnClearSearch.style.display = state.filterSearch ? 'block' : 'none';
        }
        renderSessions(state.sessions);
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (taskSearchInput) taskSearchInput.value = '';
        state.filterSearch = '';
        btnClearSearch.style.display = 'none';
        renderSessions(state.sessions);
      });
    }

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
      });
    });

    // Scroll position observer and auto-scroll lock
    if (terminalOutput) {
      terminalOutput.addEventListener('scroll', () => {
        const isAtBottom = terminalOutput.scrollHeight - terminalOutput.scrollTop - terminalOutput.clientHeight < 35;
        if (isAtBottom && !state.autoScroll) {
          state.autoScroll = true;
          updateScrollButton();
        } else if (!isAtBottom && state.autoScroll) {
          state.autoScroll = false;
          updateScrollButton();
        }
      });
    }

    // Horizontal scroll helper (supports standard wheel, horizontal wheel, and trackpad)
    function enableHorizontalWheelScroll(element) {
      if (!element) return;
      element.addEventListener('wheel', (e) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta !== 0) {
          const maxScroll = element.scrollWidth - element.clientWidth;
          if (maxScroll > 0) {
            element.scrollLeft += delta;
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }, { passive: false });
    }

    // Enable horizontal scrolling for category pills bar
    enableHorizontalWheelScroll(document.querySelector('.filter-pills-row'));
    enableHorizontalWheelScroll(document.querySelector('.header-bar'));

    // Load persisted height configuration
    function getSavedSplitHeight() {
      try {
        const val = localStorage.getItem('claude_tasks_height');
        if (val) {
          const num = parseFloat(val);
          if (!isNaN(num) && num >= 60) return num;
        }
      } catch (e) {}
      return null;
    }

    // Draggable vertical splitter interaction (resizes panels freely)
    if (panelSplitter && tasksPanel && terminalPanel) {
      let isDragging = false;
      let startY = 0;
      let startHeight = 0;

      panelSplitter.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDragging = true;
        startY = e.clientY;
        startHeight = tasksPanel.getBoundingClientRect().height;
        panelSplitter.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        try {
          panelSplitter.setPointerCapture(e.pointerId);
        } catch (err) {}
      });

      panelSplitter.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const delta = e.clientY - startY;
        const mainContainer = document.querySelector('.main-container');
        const containerHeight = mainContainer ? mainContainer.clientHeight : window.innerHeight - 28;

        // Clamp task list height: min 60px, max containerHeight - 50px
        let newHeight = startHeight + delta;
        newHeight = Math.max(60, Math.min(containerHeight - 50, newHeight));

        tasksPanel.style.flex = `0 0 ${newHeight}px`;
        tasksPanel.style.maxHeight = 'none';
      });

      const stopDragging = (e) => {
        if (!isDragging) return;
        isDragging = false;
        panelSplitter.classList.remove('dragging');
        document.body.style.cursor = '';
        try {
          panelSplitter.releasePointerCapture(e.pointerId);
        } catch (err) {}

        const currentHeight = tasksPanel.getBoundingClientRect().height;
        try {
          localStorage.setItem('claude_tasks_height', String(Math.round(currentHeight)));
        } catch (err) {}
      };

      panelSplitter.addEventListener('pointerup', stopDragging);
      panelSplitter.addEventListener('pointercancel', stopDragging);
    }

    // Restore user height preference on initialization
    try {
      const savedHeight = getSavedSplitHeight();
      if (savedHeight && tasksPanel) {
        tasksPanel.style.flex = `0 0 ${savedHeight}px`;
      }
    } catch (e) {}
  }

  // Listen for messages from VS Code extension host
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'init':
        if (message.locale) {
          state.ideLocale = message.locale;
        }
        if (message.runsDir) {
          state.runsDir = message.runsDir;
        }
        if (message.userLanguage && !localStorage.getItem('ccm_language_preference')) {
          state.languagePref = message.userLanguage;
        }
        if (message.userTheme && !localStorage.getItem('ccm_theme_preference')) {
          state.themePref = message.userTheme;
        }
        if (state.languagePref === 'auto') {
          state.locale = state.ideLocale || 'zh';
        } else {
          state.locale = state.languagePref;
        }
        applyThemePreference(state.themePref);
        applyI18n();
        updateSettingsModalValues();
        state.hookEnabled = message.hookEnabled;
        state.autoFollow = message.autoFollow !== undefined ? message.autoFollow : true;
        state.maxLines = message.maxLines || 3000;
        updateHookBadge();
        updateAutoFollowBadge();
        renderSessions(message.sessions || {});
        if (message.activeRunId) {
          selectTask(message.activeRunId, message.activeSessionId, false);
        }
        break;

      case 'set_language':
        state.languagePref = message.language || 'auto';
        try {
          localStorage.setItem('ccm_language_preference', state.languagePref);
        } catch (e) {}
        if (state.languagePref === 'auto') {
          state.locale = state.ideLocale || 'zh';
        } else {
          state.locale = state.languagePref;
        }
        applyI18n();
        renderSessions(state.sessions);
        if (state.activeRunId) {
          updateActiveTaskHeader();
        }
        updateSettingsModalValues();
        break;

      case 'set_theme':
        state.themePref = message.theme || 'auto';
        try {
          localStorage.setItem('ccm_theme_preference', state.themePref);
        } catch (e) {}
        applyThemePreference(state.themePref);
        updateSettingsModalValues();
        break;

      case 'open_settings_modal':
        openSettingsModal();
        break;

      case 'auto_follow':
        state.autoFollow = !!message.enabled;
        updateAutoFollowBadge();
        break;

      case 'hook_status':
        state.hookEnabled = message.enabled;
        updateHookBadge();
        break;

      case 'session_list':
        renderSessions(message.sessions || {});
        break;

      case 'cleared_finished_tasks': {
        const btnClear = document.getElementById('btnClearFinishedTasks');
        if (btnClear) btnClear.disabled = false;
        const textBtnClearFinished = document.getElementById('textBtnClearFinished');
        if (textBtnClearFinished) {
          const original = t('btnClearFinished');
          const notice = state.locale === 'zh'
            ? `✓ 已清理 ${message.count} 个已完成`
            : `✓ Cleared ${message.count} completed`;
          textBtnClearFinished.textContent = notice;
          setTimeout(() => {
            textBtnClearFinished.textContent = original;
          }, 2000);
        }
        break;
      }

      case 'task_start':
        addTask(message.task);
        if (state.autoFollow) {
          selectTask(message.task.run_id, message.task.session_id, false);
          setTimeout(() => {
            const taskEl = document.getElementById(`task-item-${message.task.run_id}`);
            if (taskEl) {
              taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 60);
        }
        break;

      case 'task_status':
        updateTaskStatus(message.run_id, message.session_id, message.status, message);
        break;

      case 'task_selected':
        renderFullTaskLogs(message);
        if (message.runId) {
          document.querySelectorAll('.task-item').forEach((el) => {
            el.classList.toggle('active', el.id === `task-item-${message.runId}`);
          });
          const taskEl = document.getElementById(`task-item-${message.runId}`);
          if (taskEl && state.autoFollow) {
            taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        break;

      case 'task_output':
        if (message.runId === state.activeRunId) {
          appendOutput(message.stream, message.lines);
        }
        break;

      case 'task_reset_output':
        if (!message.runId || message.runId === state.activeRunId) {
          clearTerminal();
        }
        break;
    }
  });

  function updateHookBadge() {
    if (!hookStatusEl) return;
    if (state.hookEnabled) {
      hookStatusEl.className = 'hook-status-badge hook-enabled';
      hookStatusEl.textContent = t('hookEnabled');
      hookStatusEl.title = t('hookTooltip');
    } else {
      hookStatusEl.className = 'hook-status-badge hook-disabled';
      hookStatusEl.textContent = t('hookDisabled');
      hookStatusEl.title = t('hookTooltip');
    }
  }

  function updateAutoFollowBadge() {
    if (!btnToggleAutoFollow) return;
    btnToggleAutoFollow.classList.toggle('active', !!state.autoFollow);
    btnToggleAutoFollow.title = state.autoFollow
      ? t('followTitleActive')
      : t('followTitleInactive');
  }

  function getCommandCategory(cmd) {
    if (!cmd) return 'other';
    const c = cmd.trim().toLowerCase();
    if (/^git(\s+|$)/.test(c) || /\bgit\s+/.test(c)) return 'git';
    if (/\b(test|pytest|jest|vitest|mocha|unittest|cargo\s+test|go\s+test)\b/.test(c)) return 'test';
    if (/\b(npm|pnpm|yarn|cargo\s+build|go\s+build|pip|pip3|mvn|gradle|make|docker|npx)\b/.test(c)) return 'build';
    if (/\b(python|python3|node|bash|sh|\.\/|ts-node|deno|ruby)\b/.test(c)) return 'script';
    return 'other';
  }

  function isTaskMatchingFilter(task, sessionId, sessionTitle) {
    // 1. Status and category filtering
    if (state.filterCategory === 'running') {
      if (task.status !== 'running') return false;
    } else if (state.filterCategory === 'failed') {
      if (task.status !== 'failed' && task.status !== 'interrupted') return false;
    } else if (state.filterCategory === 'success') {
      if (task.status !== 'finished') return false;
    } else if (state.filterCategory === 'git') {
      if (getCommandCategory(task.command) !== 'git') return false;
    } else if (state.filterCategory === 'test') {
      if (getCommandCategory(task.command) !== 'test') return false;
    } else if (state.filterCategory === 'build') {
      if (getCommandCategory(task.command) !== 'build') return false;
    } else if (state.filterCategory === 'script') {
      if (getCommandCategory(task.command) !== 'script') return false;
    }

    // 2. Keyword search (matches command, description, session title and ID)
    if (state.filterSearch) {
      const q = state.filterSearch.toLowerCase();
      const cmd = (task.command || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      const title = (sessionTitle || '').toLowerCase();
      const sid = (sessionId || '').toLowerCase();
      if (!cmd.includes(q) && !desc.includes(q) && !title.includes(q) && !sid.includes(q)) {
        return false;
      }
    }

    return true;
  }

  function renderSessions(sessions) {
    state.sessions = sessions;
    if (!sessionsContainer) return;

    const sessionKeys = Object.keys(sessions);
    let totalTasks = 0;
    let totalFilteredTasks = 0;
    const isFilterActive = (state.filterCategory !== 'all' || state.filterSearch !== '');

    if (sessionKeys.length === 0) {
      sessionsContainer.innerHTML = `<div class="empty-state">${t('emptyState')}<br>${t('emptyStateDesc')}</div>`;
      if (taskCountBadge) taskCountBadge.innerText = t('taskCount', { n: 0 });
      return;
    }

    // Sort sessions in reverse chronological order
    sessionKeys.sort((a, b) => {
      const tasksA = Object.values(sessions[a].tasks || {});
      const tasksB = Object.values(sessions[b].tasks || {});
      const maxA = tasksA.reduce((m, t) => Math.max(m, t.started_at || 0), 0);
      const maxB = tasksB.reduce((m, t) => Math.max(m, t.started_at || 0), 0);
      return maxB - maxA;
    });

    const frag = document.createDocumentFragment();
    let renderedSessionCount = 0;

    sessionKeys.forEach((sessionId, sIdx) => {
      const session = sessions[sessionId];
      const tasks = Object.values(session.tasks || {});
      if (tasks.length === 0) return;

      totalTasks += tasks.length;
      const sessionTitle = session.title || sessionId;

      // Sort tasks in reverse chronological order
      tasks.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));

      // Filter tasks
      const matchedTasks = tasks.filter(t => isTaskMatchingFilter(t, sessionId, sessionTitle));
      if (matchedTasks.length === 0) return;
      totalFilteredTasks += matchedTasks.length;
      renderedSessionCount++;

      const card = document.createElement('div');
      card.className = 'session-card';

      // Smart collapse: expand all when filtering; otherwise expand first or active session
      const hasActiveTask = tasks.some(t => t.run_id === state.activeRunId);
      if (!isFilterActive && sIdx > 0 && !hasActiveTask) {
        card.classList.add('collapsed');
      }

      const header = document.createElement('div');
      header.className = 'session-header';
      header.title = t('sessionTitle', { title: sessionTitle, id: sessionId });
      header.innerHTML = `
        <div class="session-title">
          <span class="session-icon">💬</span>
          <span class="session-title-text" title="${escapeHtml(sessionTitle)}">${escapeHtml(sessionTitle)}</span>
        </div>
        <div class="session-meta">
          <span class="session-badge">${matchedTasks.length}${tasks.length !== matchedTasks.length ? ` / ${tasks.length}` : ''}</span>
        </div>
      `;

      // Click session header to toggle collapse/expand
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.toggle('collapsed');
      });

      const taskList = document.createElement('div');
      taskList.className = 'task-list';

      // Single session DOM guard: limit to latest 50 tasks
      const maxTasksPerSession = 50;
      const visibleTasks = matchedTasks.slice(0, maxTasksPerSession);

      visibleTasks.forEach((tTask) => {
        const item = document.createElement('div');
        item.className = `task-item ${tTask.run_id === state.activeRunId ? 'active' : ''}`;
        item.id = `task-item-${tTask.run_id}`;

        item.addEventListener('click', () => {
          selectTask(tTask.run_id, sessionId, true);
        });

        const statusClass = getStatusClass(tTask.status);
        const timeStr = formatTime(tTask.started_at);
        const durInfo = formatCombinedDuration(tTask);

        item.innerHTML = `
          <div class="task-status-indicator ${statusClass}"></div>
          <div class="task-content">
            <div class="task-cmd-line" title="${escapeHtml(tTask.command || '')}">$ ${escapeHtml(tTask.command || 'bash')}</div>
            <div class="task-sub-line">
              <span>${timeStr}</span>
              <span class="task-duration task-dur-${tTask.run_id}" data-started="${tTask.started_at || tTask.wrapper_started_at || ''}" data-wrapper-started="${tTask.wrapper_started_at || ''}" data-status="${tTask.status}" title="${escapeHtml(durInfo.title)}">${durInfo.text}</span>
              ${tTask.description ? `<span class="task-sub-desc" title="${escapeHtml(tTask.description)}">${escapeHtml(tTask.description)}</span>` : ''}
            </div>
          </div>
        `;
        taskList.appendChild(item);
      });

      if (matchedTasks.length > maxTasksPerSession) {
        const moreEl = document.createElement('div');
        moreEl.style.cssText = 'text-align:center;color:var(--vscode-descriptionForeground,#888);font-size:11px;padding:6px 0;user-select:none;';
        moreEl.textContent = t('hiddenOlder', { n: matchedTasks.length - maxTasksPerSession });
        taskList.appendChild(moreEl);
      }

      card.appendChild(header);
      card.appendChild(taskList);
      frag.appendChild(card);
    });

    if (renderedSessionCount === 0 && totalTasks > 0) {
      sessionsContainer.innerHTML = `<div class="empty-state">${t('emptyFiltered')}<br><span style="font-size:11px;color:var(--accent-blue);cursor:pointer;" id="btnResetFilter">${t('resetFilter')}</span></div>`;
      const resetBtn = document.getElementById('btnResetFilter');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.filterCategory = 'all';
          state.filterSearch = '';
          if (taskSearchInput) taskSearchInput.value = '';
          if (btnClearSearch) btnClearSearch.style.display = 'none';
          document.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.filter === 'all');
          });
          renderSessions(state.sessions);
        });
      }
    } else {
      sessionsContainer.innerHTML = '';
      sessionsContainer.appendChild(frag);
    }

    if (taskCountBadge) {
      if (isFilterActive) {
        taskCountBadge.innerText = t('tasksFilteredCount', { filtered: totalFilteredTasks, total: totalTasks });
      } else {
        taskCountBadge.innerText = `${totalTasks} ${t('tasksCount')}`;
      }
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case 'running': return 'status-running';
      case 'background': return 'status-background';
      case 'finished': return 'status-finished';
      case 'failed': return 'status-failed';
      case 'interrupted': return 'status-interrupted';
      case 'denied': return 'status-denied';
      default: return 'status-finished';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'running': return t('statusRunning');
      case 'background': return t('statusBackground');
      case 'finished': return t('statusFinished');
      case 'failed': return t('statusFailed');
      case 'interrupted': return t('statusInterrupted');
      case 'denied': return t('statusDenied');
      default: return t('statusFinished');
    }
  }

  function addTask(task) {
    if (!state.sessions[task.session_id]) {
      state.sessions[task.session_id] = { id: task.session_id, tasks: {} };
    }
    state.sessions[task.session_id].tasks[task.run_id] = task;
    renderSessions(state.sessions);
  }

  function updateTaskStatus(runId, sessionId, status, extra) {
    try {
      if (state.sessions[sessionId] && state.sessions[sessionId].tasks[runId]) {
        const task = state.sessions[sessionId].tasks[runId];
        task.status = status;
        if (extra) {
          if (extra.ended_at) task.ended_at = extra.ended_at;
          if (extra.actual_ended_at) task.actual_ended_at = extra.actual_ended_at;
          if (extra.rc !== undefined) task.exit_code = extra.rc;
          if (extra.actual_duration !== undefined) task.actual_duration = extra.actual_duration;
          if (extra.foreground_duration !== undefined) task.foreground_duration = extra.foreground_duration;
          if (extra.started_at && !task.started_at) task.started_at = extra.started_at;
        }
        // Preserve foreground duration
        if (task.foreground_duration === undefined && task.started_at) {
          const fgEnd = task.foreground_ended_at || task.ended_at || (Date.now() / 1000);
          task.foreground_duration = Math.max(0, fgEnd - task.started_at);
        }
      }
      const item = document.getElementById(`task-item-${runId}`);
      if (item) {
        const indicator = item.querySelector('.task-status-indicator');
        if (indicator) {
          indicator.className = `task-status-indicator ${getStatusClass(status)}`;
        }
      }
      const durEl = document.querySelector(`.task-dur-${runId}`);
      if (durEl) {
        durEl.dataset.status = status;
        const task = state.sessions[sessionId]?.tasks[runId];
        if (task) {
          const durInfo = formatCombinedDuration(task);
          durEl.textContent = durInfo.text;
          durEl.title = durInfo.title;
        }
      }
      if (runId === state.activeRunId) {
        updateActiveBar(runId, sessionId);
      }
    } catch (e) {}
  }

  function updateRunningDurations() {
    try {
      const now = Date.now() / 1000;
      // Performance optimization: only query running and background cards
      const runningSpans = document.querySelectorAll(
        '.task-duration[data-status="running"], .task-duration[data-status="background"]'
      );
      for (let i = 0; i < runningSpans.length; i++) {
        const span = runningSpans[i];
        const status = span.dataset.status;
        const started = parseFloat(span.dataset.started);
        if (started) {
          if (status === 'background') {
            const wrapStarted = parseFloat(span.dataset.wrapperStarted) || started;
            span.textContent = `⏱ ${t('bgDur')}: ${formatDuration(wrapStarted, now)}`;
          } else {
            span.textContent = `⏱ ${t('fgDur')}: ${formatDuration(started, now)}`;
          }
        }
      }
      if (state.activeRunId && state.activeSessionId) {
        updateActiveBar(state.activeRunId, state.activeSessionId);
      }
    } catch (e) {}
  }

  setInterval(updateRunningDurations, 1000);

  function selectTask(runId, sessionId, notifyHost) {
    state.activeRunId = runId;
    state.activeSessionId = sessionId;

    // Update selection styling
    document.querySelectorAll('.task-item').forEach((el) => {
      el.classList.toggle('active', el.id === `task-item-${runId}`);
    });

    updateActiveBar(runId, sessionId);

    if (notifyHost) {
      vscode.postMessage({
        command: 'selectTask',
        runId,
        sessionId,
      });
    }
  }

  function updateActiveBar(runId, sessionId) {
    const task = (state.sessions[sessionId] && state.sessions[sessionId].tasks[runId]) || null;
    const now = Date.now() / 1000;

    if (activeCmdText) {
      if (task) {
        activeCmdText.innerText = task.command || 'bash';
        activeCmdText.title = task.command || '';
      } else {
        activeCmdText.innerText = t('noTaskSelected');
        activeCmdText.title = '';
      }
    }

    // Status display (finished, failed, background, etc.)
    if (activeStatusBadge) {
      if (task && task.status) {
        activeStatusBadge.style.display = 'inline-block';
        activeStatusBadge.className = `cmd-status-badge status-${task.status}`;
        activeStatusBadge.textContent = getStatusText(task.status);
      } else {
        activeStatusBadge.style.display = 'none';
      }
    }

    // Exit code: wrapper takes precedence, displayed on finished/failed/interrupted
    if (activeExitBadge) {
      if (task && (task.status === 'finished' || task.status === 'failed' || task.status === 'interrupted' || task.exit_code !== undefined)) {
        activeExitBadge.style.display = 'inline-block';
        const rc = task.exit_code !== undefined ? task.exit_code : (task.status === 'finished' ? 0 : (task.status === 'interrupted' ? 130 : 1));
        if (rc === 0) {
          activeExitBadge.className = 'cmd-exit-badge success';
          activeExitBadge.textContent = 'Exit 0';
        } else if (rc === 130 || task.status === 'interrupted') {
          activeExitBadge.className = 'cmd-exit-badge interrupted';
          activeExitBadge.textContent = `Exit ${rc}`;
        } else {
          activeExitBadge.className = 'cmd-exit-badge fail';
          activeExitBadge.textContent = `Exit ${rc}`;
        }
      } else {
        activeExitBadge.style.display = 'none';
      }
    }

    // Display foreground and actual execution durations
    if (activeDurationBadge) {
      if (task) {
        activeDurationBadge.style.display = 'inline-block';
        if (task.status === 'running') {
          activeDurationBadge.className = 'cmd-duration-badge running';
        } else if (task.status === 'background') {
          activeDurationBadge.className = 'cmd-duration-badge background';
        } else {
          activeDurationBadge.className = `cmd-duration-badge ${task.status === 'interrupted' ? 'interrupted' : 'finished'}`;
        }
        const durInfo = formatCombinedDuration(task, now);
        activeDurationBadge.textContent = durInfo.text;
        activeDurationBadge.title = durInfo.title;
      } else {
        activeDurationBadge.style.display = 'none';
      }
    }
  }

  // Fully render historical logs for selected task
  function renderFullTaskLogs(data) {
    clearTerminal();

    state.activeRunId = data.runId;
    state.activeSessionId = data.sessionId;

    // Merge latest disk metadata from backend
    if (data.task && data.sessionId && data.runId) {
      if (!state.sessions[data.sessionId]) {
        state.sessions[data.sessionId] = { id: data.sessionId, tasks: {} };
      }
      state.sessions[data.sessionId].tasks[data.runId] = Object.assign(
        state.sessions[data.sessionId].tasks[data.runId] || {},
        data.task
      );
      const t = state.sessions[data.sessionId].tasks[data.runId];
      if (t && t.foreground_duration === undefined && t.started_at) {
        const fgEnd = t.foreground_ended_at || t.ended_at;
        if (fgEnd) {
          t.foreground_duration = Math.max(0, fgEnd - t.started_at);
        }
      }
    }

    updateActiveBar(data.runId, data.sessionId);

    const stdoutLines = data.stdoutLines || [];
    const stderrLines = data.stderrLines || [];

    const frag = document.createDocumentFragment();

    // Render stdout first
    for (let i = 0; i < stdoutLines.length; i++) {
      const text = stdoutLines[i];
      state.stdoutCount++;
      const lineEl = document.createElement('div');
      lineEl.className = 'term-line stdout';
      if (state.activeFilter === 'stderr') lineEl.classList.add('filter-hidden');
      lineEl.appendChild(document.createTextNode(text));
      frag.appendChild(lineEl);
    }

    // Render stderr next
    for (let i = 0; i < stderrLines.length; i++) {
      const text = stderrLines[i];
      state.stderrCount++;
      const lineEl = document.createElement('div');
      lineEl.className = 'term-line stderr';
      if (state.activeFilter === 'stdout') lineEl.classList.add('filter-hidden');

      const badge = document.createElement('span');
      badge.className = 'badge-err';
      badge.textContent = 'stderr';
      lineEl.appendChild(badge);

      lineEl.appendChild(document.createTextNode(text));
      frag.appendChild(lineEl);
    }

    terminalOutput.appendChild(frag);
    updateTabCounts();

    if (truncationBanner) {
      if (data.isTruncated) {
        truncationBanner.classList.add('show');
      } else {
        truncationBanner.classList.remove('show');
      }
    }

    if (state.autoScroll) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  }

  function clearTerminal() {
    pendingLines = [];
    terminalOutput.innerHTML = '';
    state.stdoutCount = 0;
    state.stderrCount = 0;
    updateTabCounts();
    if (truncationBanner) {
      truncationBanner.classList.remove('show');
    }
  }

  function updateTabCounts() {
    // Tab labels: clean titles without line count numbers in brackets
  }

  function appendOutput(stream, lines) {
    if (!lines || lines.length === 0) return;
    for (let i = 0; i < lines.length; i++) {
      pendingLines.push({ stream, text: lines[i] });
    }
    scheduleFlush();
  }

  function scheduleFlush() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(flushPendingLines);
  }

  function flushPendingLines() {
    rafScheduled = false;
    if (pendingLines.length === 0) return;

    const frag = document.createDocumentFragment();
    const batch = pendingLines;
    pendingLines = [];

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      if (item.stream === 'stderr') {
        state.stderrCount++;
      } else {
        state.stdoutCount++;
      }

      const lineEl = document.createElement('div');
      lineEl.className = `term-line ${item.stream}`;

      // Stream visibility filter control
      if (state.activeFilter === 'stdout' && item.stream === 'stderr') {
        lineEl.classList.add('filter-hidden');
      } else if (state.activeFilter === 'stderr' && item.stream === 'stdout') {
        lineEl.classList.add('filter-hidden');
      }

      if (item.stream === 'stderr') {
        const badge = document.createElement('span');
        badge.className = 'badge-err';
        badge.textContent = 'stderr';
        lineEl.appendChild(badge);
      }

      const textNode = document.createTextNode(item.text);
      lineEl.appendChild(textNode);
      frag.appendChild(lineEl);
    }

    terminalOutput.appendChild(frag);
    updateTabCounts();

    // Limit rendered line count to maxLines
    const currentCount = terminalOutput.children.length;
    if (currentCount > state.maxLines) {
      const toRemove = currentCount - state.maxLines;
      for (let i = 0; i < toRemove; i++) {
        if (terminalOutput.firstChild) {
          terminalOutput.removeChild(terminalOutput.firstChild);
        }
      }
      if (truncationBanner) {
        truncationBanner.classList.add('show');
      }
    }

    if (state.autoScroll) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  }

  function updateScrollButton() {
    if (!btnScrollLock) return;
    btnScrollLock.classList.toggle('active', state.autoScroll);
    btnScrollLock.title = state.autoScroll ? t('scrollLockActiveTitle') : t('scrollLockInactiveTitle');
  }

  // Tab filter button click
  function setFilter(filterType) {
    state.activeFilter = filterType;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    // Re-apply stream visibility
    const lines = terminalOutput.children;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isErr = line.classList.contains('stderr');
      if (filterType === 'all') {
        line.classList.remove('filter-hidden');
      } else if (filterType === 'stdout') {
        line.classList.toggle('filter-hidden', isErr);
      } else if (filterType === 'stderr') {
        line.classList.toggle('filter-hidden', !isErr);
      }
    }

    if (state.autoScroll) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  }

  function toggleAutoScroll() {
    state.autoScroll = !state.autoScroll;
    updateScrollButton();
    if (state.autoScroll) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  }

  function openInEditor() {
    if (!state.activeRunId) return;
    vscode.postMessage({
      command: 'openLogFile',
      runId: state.activeRunId,
      sessionId: state.activeSessionId,
    });
  }

  function copyCommand() {
    if (!state.activeRunId || !state.activeSessionId) return;
    const task = state.sessions[state.activeSessionId]?.tasks[state.activeRunId];
    if (task && task.command) {
      vscode.postMessage({ command: 'copyText', text: task.command });
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(task.command).catch(() => {});
        }
      } catch (e) {}
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  function formatDuration(start, end) {
    if (start === undefined || start === null || isNaN(start)) return '0s';
    let sec;
    if (end === undefined) {
      sec = Math.max(0, Number(start));
    } else {
      const endTime = end || (Date.now() / 1000);
      sec = Math.max(0, Number(endTime) - Number(start));
    }
    if (isNaN(sec)) return '0s';

    // High-precision formatting: never display sub-second tasks as meaningless "0s"
    if (sec <= 0) return '0s';
    if (sec < 0.001) return '<1ms';
    if (sec < 0.1) return `${Math.round(sec * 1000)}ms`;
    if (sec < 1) return `${sec.toFixed(2)}s`;
    if (sec < 10) return `${sec.toFixed(1)}s`;
    if (sec < 60) return `${Math.round(sec)}s`;
    const min = Math.floor(sec / 60);
    const remainSec = Math.round(sec % 60);
    return `${min}m ${remainSec}s`;
  }

  // Helper: extract foreground duration (entire lifecycle up to tool response)
  function getForegroundDurationText(t, now) {
    if (!t) return null;
    const isRunning = (t.status === 'running');
    if (isRunning) {
      const start = t.started_at || t.wrapper_started_at;
      if (!start) return null;
      return formatDuration(start, now || (Date.now() / 1000));
    }
    if (t.foreground_duration !== undefined && t.foreground_duration !== null) {
      return formatDuration(t.foreground_duration);
    }
    const fgEnd = t.foreground_ended_at || t.ended_at;
    if (t.started_at && fgEnd) {
      return formatDuration(t.started_at, fgEnd);
    }
    return null;
  }

  // Helper: extract actual execution duration (wrapper process execution time)
  function getActualDurationText(t, now) {
    if (!t) return null;
    const isRunning = (t.status === 'running' || t.status === 'background');
    if (isRunning) {
      const start = t.wrapper_started_at;
      if (!start) return null;
      return formatDuration(start, now || (Date.now() / 1000));
    }
    if (t.actual_duration !== undefined && t.actual_duration !== null) {
      return formatDuration(t.actual_duration);
    }
    if (t.actual_ended_at && t.wrapper_started_at) {
      return formatDuration(t.wrapper_started_at, t.actual_ended_at);
    }
    return null;
  }

  // Combined duration formatting: formats both foreground and actual durations
  function formatCombinedDuration(tTask, now) {
    if (!tTask) return { text: '⏱ 0s', title: `${t('durUnit')}: 0s` };
    const isRunning = (tTask.status === 'running');
    const isBackground = (tTask.status === 'background');

    if (isRunning) {
      const fg = getForegroundDurationText(tTask, now) || '0s';
      return {
        text: `⏱ ${t('fgDur')}: ${fg}`,
        title: t('tooltipRunning', { t: fg })
      };
    }

    if (isBackground) {
      const fg = getForegroundDurationText(tTask, now);
      const bgTotal = formatDuration(tTask.wrapper_started_at || tTask.started_at, now || (Date.now() / 1000));
      return {
        text: `⏱ ${t('fgDur')}: ${fg || '...'} · ${t('bgDur')}: ${bgTotal}`,
        title: t('tooltipBackground', { fg: fg || '...', bg: bgTotal })
      };
    }

    // Completed tasks (finished, failed, interrupted, denied)
    const fg = getForegroundDurationText(tTask);
    const act = getActualDurationText(tTask);

    if (fg && act) {
      return {
        text: `⏱ ${t('fgDur')}: ${fg} · ${t('actDur')}: ${act}`,
        title: t('tooltipFinished', { fg, act })
      };
    } else if (fg) {
      return {
        text: `⏱ ${t('fgDur')}: ${fg}`,
        title: t('tooltipSingleFg', { fg })
      };
    } else if (act) {
      return {
        text: `⏱ ${t('actDur')}: ${act}`,
        title: t('tooltipSingleAct', { act })
      };
    }
    return { text: '⏱ 0s', title: `${t('durUnit')}: 0s` };
  }

  // Initialization complete: apply theme and language preferences immediately
  applyThemePreference(state.themePref);
  applyI18n();
  updateSettingsModalValues();
  initEventListeners();
  vscode.postMessage({ command: 'ready' });
})();
