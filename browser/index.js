const { app, BrowserWindow } = require('electron')
const path = require('path')
const express = require('express');
const cors = require('cors');
const { dialog, globalShortcut } = require('electron/main')
const fetch = require('node-fetch')

let win;
// Global variable to store current hop session
let currentHopSession = null;

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

  // DevTools are now closed by default
  // Uncomment the line below if you need to open DevTools manually
  // win.webContents.openDevTools()
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
  const hopSessionId = req.query.hopSessionId;
  
  if (url && win) {
    win.loadURL(url); // This navigates the Electron window!
    
    // Set the hop session if provided
    if (hopSessionId) {
      currentHopSession = hopSessionId;
      console.log('🎯 Hop session set from URL request:', hopSessionId);
    }
    
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

  globalShortcut.register('CommandOrControl+Left', async () => {
    console.log('🎯 Ctrl+Left pressed in Electron!');
    
    if (!currentHopSession) {
      console.log('❌ No active hop session. Please search first to create a hop session.');
      return;
    }
    
    try {
      console.log('🔄 Navigating to previous page in hop session...');
      const response = await fetch(`http://localhost:4000/hop/${currentHopSession}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction: 'prev' })
      });
      
      if (response.ok) {
        const result = await response.json();
        const newUrl = result.currentPage.url;
        console.log('✅ Navigated to previous page!');
        console.log('📍 New URL:', newUrl);
        console.log('📊 Hop session state:');
        console.log('  - Current index:', result.hopState.currentIndex);
        console.log('  - Total pages:', result.hopState.pages.length);
        console.log('  - Query:', result.hopState.query);
        
        // Navigate the Electron window to the new URL
        win.loadURL(newUrl);
      } else {
        console.error('❌ Failed to navigate hop session:', response.status);
      }
    } catch (error) {
      console.error('❌ Error navigating hop session:', error);
    }
  })

  globalShortcut.register('CommandOrControl+Right', async () => {
    console.log('🎯 Ctrl+Right pressed in Electron!');
    
    if (!currentHopSession) {
      console.log('❌ No active hop session. Please search first to create a hop session.');
      return;
    }
    
    try {
      console.log('🔄 Navigating to next page in hop session...');
      const response = await fetch(`http://localhost:4000/hop/${currentHopSession}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction: 'next' })
      });
      
      if (response.ok) {
        const result = await response.json();
        const newUrl = result.currentPage.url;
        console.log('✅ Navigated to next page!');
        console.log('📍 New URL:', newUrl);
        console.log('📊 Hop session state:');
        console.log('  - Current index:', result.hopState.currentIndex);
        console.log('  - Total pages:', result.hopState.pages.length);
        console.log('  - Query:', result.hopState.query);
        
        // Navigate the Electron window to the new URL
        win.loadURL(newUrl);
      } else {
        console.error('❌ Failed to navigate hop session:', response.status);
      }
    } catch (error) {
      console.error('❌ Error navigating hop session:', error);
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

