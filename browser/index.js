const { app, BrowserWindow } = require('electron')
const path = require('path')
const express = require('express');
const cors = require('cors');
const { dialog, globalShortcut } = require('electron/main')
const fetch = require('node-fetch')

let win;

function createWindow() {
  win = new BrowserWindow({
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
  })

  win.loadFile('index.html')

  // Open DevTools to see what's happening
  win.webContents.openDevTools()
}

// Internal Express server running in Electron main process
const server = express();
server.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'], // Add 3001
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

server.get('/url', (req, res) => {
  const url = req.query.to;
  if (url && win) {
    win.loadURL(url); // This navigates the Electron window!
    res.send(`Navigated Electron window to: ${url}`);
  } else {
    res.status(400).send('Missing window or url');
  }
});

const PORT = 4400;
server.listen(PORT, () => {
  console.log(`Internal server on http://localhost:${PORT}`);
});

// allow for localhost usage
app.commandLine.appendSwitch('--allow-running-insecure-content')
app.commandLine.appendSwitch('--allow-insecure-localhost', 'true')
app.commandLine.appendSwitch('--ignore-ssl-errors')

app.whenReady().then(() => {

  globalShortcut.register('CommandOrControl+W', () => {
    console.log('yes!!');
    win.loadURL('http://localhost:3000'); // This navigates the Electron window!
  })

  globalShortcut.register('CommandOrControl+D', async () => {
    console.log('🎯 Ctrl+D pressed in Electron!');
    
    // Get the current URL from the Electron window
    const currentUrl = win.webContents.getURL();
    console.log('📤 Current URL:', currentUrl);
    
    try {
      // First, get the most recent den from the frontend
      // We'll use a simple approach: get the most recent den from the backend
      // In a real implementation, you might want to store this in a global variable
      // or get it from the frontend via IPC
      
      // For now, let's create a simple den or use a default one
      const denQuery = "electron-browser-pages"; // Default query for browser pages
      
      // Create or get a den for browser pages
      let denResponse = await fetch(`http://localhost:4000/make-den-main?query=${encodeURIComponent(denQuery)}`);
      let denData = null;
      
      if (denResponse.ok) {
        denData = await denResponse.json();
        console.log('🏠 Using den for browser pages:', denData);
      } else {
        // Fallback: create a simple den structure
        denData = {
          query: denQuery,
          pages: [],
          conceptList: [],
          children: []
        };
        console.log('🏠 Created fallback den for browser pages');
      }
      
      // Send the current page to the den via the backend
      const response = await fetch('http://localhost:4000/send-to-den', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          node: denData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Page sent to den successfully!');
        console.log('📊 Den content after processing:');
        console.log('  - Query:', result.node?.query);
        console.log('  - Pages:', result.node?.pages, `(length: ${result.node?.pages?.length})`);
        console.log('  - Concepts:', result.node?.conceptList, `(length: ${result.node?.conceptList?.length})`);
        console.log('📈 Statistics:');
        console.log('  - Concepts added:', result.concepts_added);
        console.log('  - Concepts removed:', result.concepts_removed);
      } else {
        console.error('❌ Failed to send page to den:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sending page to den:', error);
    }
  })
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

