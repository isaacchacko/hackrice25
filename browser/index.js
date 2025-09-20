const { app, BrowserWindow } = require('electron')
const express = require('express');
const cors = require('cors');
const { dialog, globalShortcut } = require('electron/main')
const fetch = require('node-fetch')

let win;
// Global variable to store current hop session
let currentHopSession = null;
// Global variable to store current den data
let currentDenData = null;
const fs = require('fs');
const path = require('path');

let win;
let lastUrl;

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
  const denData = req.query.denData;

  if (url && win) {
    win.loadURL(url); // This navigates the Electron window!

    // Set the hop session if provided
    if (hopSessionId) {
      currentHopSession = hopSessionId;
      console.log('🎯 Hop session set from URL request:', hopSessionId);
    }

    // Set the den data if provided
    if (denData) {
      try {
        currentDenData = JSON.parse(denData);
        console.log('🏠 Den data set from URL request:', currentDenData.query);
        console.log('📊 Den pages count:', currentDenData.pages?.length || 0);
        console.log('📊 Den concepts count:', currentDenData.conceptList?.length || 0);
      } catch (err) {
        console.warn('Could not parse den data:', err);
      }
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

app.whenReady().then(async () => {

  const stateFile = path.join(__dirname, '../electron-state.json');

  function updateState(action, data = {}) {
    try {
      // Read existing state
      let currentState = { nodes: [], timestamp: 0 };
      if (fs.existsSync(stateFile)) {
        console.log('Reading local file');
        currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        // Ensure nodes array exists for backward compatibility
        if (!currentState.nodes) {
          currentState.nodes = [];
        }
      }

      let updatedState;

      switch (action) {
        case 'CREATE_NODE':
          console.log('Creating new node:', data);

          // Generate node with default values and override with provided data
          const newNode = {
            id: `node-${currentState.nodes.length + 1}-${Date.now()}`,
            data: {
              label: data.query || 'New Node',
              type: data.type || 'default',
              createdAt: data.timestamp || new Date().toISOString()
            },
            position: data.position || {
              x: Math.random() * 400 - 200,
              y: Math.random() * 400 - 200
            },
            style: {
              background: data.type === 'random' ? '#10b981' :
                data.type === 'custom' ? '#6366f1' :
                  '#db2777',
              color: '#fff',
              border: '2px solid #fff',
              width: 100,
              height: 100,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '5px',
              ...data.style // Override with custom styles if provided
            },
            ...data.additionalProps // Any other node properties
          };

          updatedState = {
            ...currentState,
            nodes: [...currentState.nodes, newNode],
            timestamp: Date.now(),
            lastAction: 'CREATE_NODE'
          };
          break;

        case 'CLEAR_NODES':
          console.log('Clearing all nodes');
          updatedState = {
            ...currentState,
            nodes: [],
            timestamp: Date.now(),
            lastAction: 'CLEAR_NODES'
          };
          break;

        default:
          console.warn('Unknown action:', action);
          return;
      }

      // Write updated state to file
      console.log('Writing local file with action:', action);
      fs.writeFileSync(stateFile, JSON.stringify(updatedState, null, 2));
      console.log('State updated successfully. Total nodes:', updatedState.nodes.length);

    } catch (error) {
      console.error('Error updating state:', error);
    }
  }

  // Your shortcuts
  globalShortcut.register('Alt+G', () => {
    updateState({ action: "CREATE_NODE" })
    if (!lastUrl) {
      lastUrl = win.webContents.getURL();
      win.loadURL('http://localhost:3000/graph');
    } else {
      win.loadURL(lastUrl);
      lastUrl = undefined;
    }

  });

  globalShortcut.register('Alt+H', () => {
    if (lastUrl) updateState({ action: 'CLEAR_NODES' });
  });

  globalShortcut.register('Alt+W', async () => {
    console.log('refreshing the prompt!!');
    win.loadURL('http://localhost:3000'); // This navigates the Electron window!
    updateState({ action: 'CLEAR_NODES' });
    lastUrl = undefined;
  });

  globalShortcut.register('CommandOrControl+D', async () => {
    console.log('🎯 Ctrl+D pressed in Electron!');

    // Get the current URL from the Electron window
    const currentUrl = win.webContents.getURL();
    console.log('📤 Current URL:', currentUrl);

    try {
      let denData = currentDenData;

      // If no den data exists, we can't proceed
      if (!denData) {
        console.log('❌ No den data available. Please search first to create a den.');
        console.log('💡 Tip: Search for something in the frontend to create a den, then use Ctrl+D on the results.');
        return;
      }

      console.log('🏠 Using existing den for query:', denData.query);
      console.log('📊 Den BEFORE processing:');
      console.log('  - Pages:', denData.pages?.length || 0);
      console.log('  - Concepts:', denData.conceptList?.length || 0);

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

        // Update the stored den data with the new data
        currentDenData = result.node;
        console.log('🔄 Updated stored den data');
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

