const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendUrl: function(url) {
    ipcRenderer.send('send-url', url);
  }
});
