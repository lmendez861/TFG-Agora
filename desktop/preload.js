const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agoraDesktop', {
  getConfig: () => ipcRenderer.invoke('desktop:get-config'),
  saveConfig: (config) => ipcRenderer.invoke('desktop:save-config', config),
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  getMonitorOverview: () => ipcRenderer.invoke('desktop:get-monitor-overview'),
  prepare: (options) => ipcRenderer.invoke('desktop:prepare', options),
  startLocal: () => ipcRenderer.invoke('desktop:start-local'),
  stopLocal: () => ipcRenderer.invoke('desktop:stop-local'),
  startRemoteService: () => ipcRenderer.invoke('desktop:start-remote-service'),
  restartRemoteService: () => ipcRenderer.invoke('desktop:restart-remote-service'),
  restartRemoteApp: () => ipcRenderer.invoke('desktop:restart-remote-app'),
  restartRemoteDb: () => ipcRenderer.invoke('desktop:restart-remote-db'),
  rebuild: () => ipcRenderer.invoke('desktop:rebuild'),
  startPublic: () => ipcRenderer.invoke('desktop:start-public'),
  stopPublic: () => ipcRenderer.invoke('desktop:stop-public'),
  requestMfa: () => ipcRenderer.invoke('desktop:mfa-challenge'),
  verifyMfa: (code) => ipcRenderer.invoke('desktop:mfa-verify', code),
  runWorkflowSmoke: () => ipcRenderer.invoke('desktop:run-workflow-smoke'),
  runTestSuite: (suite) => ipcRenderer.invoke('desktop:run-test-suite', suite),
  openLogTarget: (target) => ipcRenderer.invoke('desktop:open-log-target', target),
  backupDatabase: () => ipcRenderer.invoke('desktop:backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('desktop:restore-database'),
  diagnoseDependencies: () => ipcRenderer.invoke('desktop:diagnose-dependencies'),
  open: (target, mode) => ipcRenderer.invoke('desktop:open', target, mode),
  openPath: (filePath) => ipcRenderer.invoke('desktop:open-path', filePath),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:status', listener);
    return () => ipcRenderer.removeListener('desktop:status', listener);
  },
  onTask: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:task', listener);
    return () => ipcRenderer.removeListener('desktop:task', listener);
  },
  onLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:log', listener);
    return () => ipcRenderer.removeListener('desktop:log', listener);
  },
  onWorkflow: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:workflow', listener);
    return () => ipcRenderer.removeListener('desktop:workflow', listener);
  },
});
