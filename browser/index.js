const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,  // Add this - crucial for loading localhost
      allowRunningInsecureContent: true // Add this too
    },
    menu: null, 
    frame: false,
    titleBarStyle: 'hidden',
  })

  win.loadFile('index.html')
  
  // Open DevTools to see what's happening
  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})