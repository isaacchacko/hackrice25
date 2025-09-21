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
// Global variable to track which node is currently the focus
let currentFocusNode = null;
const fs = require('fs');
const path = require('path');

let lastUrl;

// Helper function to update a babyNode in the den data structure
function updateBabyNodeInDenData(updatedBabyNode) {
  if (!currentDenData || !currentDenData.children) {
    console.warn('No den data or children array available for update');
    return;
  }
  
  // Find and update the babyNode in the children array
  const childIndex = currentDenData.children.findIndex(child => 
    child.title === updatedBabyNode.title && 
    child.pages && updatedBabyNode.pages && 
    child.pages[0] === updatedBabyNode.pages[0]
  );
  
  if (childIndex !== -1) {
    currentDenData.children[childIndex] = updatedBabyNode;
    console.log(`✅ Updated babyNode "${updatedBabyNode.title}" in den data structure`);
  } else {
    console.warn(`⚠️ Could not find babyNode "${updatedBabyNode.title}" in den data structure`);
  }
}

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
        // Set the focus node to the root (bigDaddyNode) initially
        currentFocusNode = currentDenData;
        console.log('🏠 Den data set from URL request:', currentDenData.query);
        console.log('🎯 Focus node set to root (bigDaddyNode)');
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

// New endpoint to change the focus node
server.post('/set-focus-node', (req, res) => {
  try {
    const { nodeType, nodeId } = req.body;
    
    if (!nodeType || !nodeId) {
      return res.status(400).json({ error: 'nodeType and nodeId are required' });
    }
    
    if (!currentDenData) {
      return res.status(400).json({ error: 'No den data available' });
    }
    
    if (nodeType === 'bigDaddyNode') {
      // Set focus to the root bigDaddyNode
      currentFocusNode = currentDenData;
      console.log('🎯 Focus changed to bigDaddyNode:', currentFocusNode.query);
    } else if (nodeType === 'babyNode') {
      // Find the specific babyNode by ID or title
      const babyNode = findBabyNodeById(currentDenData, nodeId);
      if (babyNode) {
        currentFocusNode = babyNode;
        console.log('🎯 Focus changed to babyNode:', currentFocusNode.title);
      } else {
        return res.status(404).json({ error: 'BabyNode not found' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid nodeType. Must be "bigDaddyNode" or "babyNode"' });
    }
    
    res.json({ 
      success: true, 
      focusNode: {
        type: nodeType,
        title: currentFocusNode.title || currentFocusNode.query,
        pages: currentFocusNode.pages?.length || 0,
        concepts: currentFocusNode.conceptList?.length || 0
      }
    });
  } catch (error) {
    console.error('Error setting focus node:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to find a babyNode by ID or title
function findBabyNodeById(denData, nodeId) {
  if (!denData.children) return null;
  
  // First try to find by exact ID match
  let found = denData.children.find(child => child.id === nodeId);
  if (found) return found;
  
  // Then try to find by title match
  found = denData.children.find(child => child.title === nodeId);
  if (found) return found;
  
  // Recursively search in nested children
  for (const child of denData.children) {
    const nested = findBabyNodeById(child, nodeId);
    if (nested) return nested;
  }
  
  return null;
}

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
    currentFocusNode = null;
    currentDenData = null;
    console.log('refreshing the prompt!!');
    
    // Clear memory on backend
    try {
      const response = await fetch('http://localhost:4000/clear-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log('✅ Backend memory cleared successfully');
      } else {
        console.warn('⚠️ Failed to clear backend memory');
      }
    } catch (error) {
      console.error('❌ Error clearing backend memory:', error);
    }
    
    win.loadURL('http://localhost:3000'); // This navigates the Electron window!
    updateState({ action: 'CLEAR_NODES' });
    lastUrl = undefined;
  });

  globalShortcut.register('CommandOrControl+D', async () => {
    console.log('🎯 Ctrl+D pressed in Electron!');
  
    const currentUrl = win.webContents.getURL();
    console.log('📤 Current URL:', currentUrl);
  
    try {
      if (!currentFocusNode) {
        console.log('❌ No focus node available. Please search first to create a den.');
        return;
      }
  
      console.log('🎯 BEFORE processing - Focus node state:');
      console.log('  - Type:', currentFocusNode.query ? 'bigDaddyNode' : 'babyNode');
      console.log('  - Title/Query:', currentFocusNode.query || currentFocusNode.title);
      console.log('  - Pages:', currentFocusNode.pages?.length || 0);
      console.log('  - Concepts:', currentFocusNode.conceptList?.length || 0);
      console.log('  - Children:', currentFocusNode.children?.length || 0);
      console.log('  - Children details:', currentFocusNode.children?.map(c => c.title) || []);
  
      const response = await fetch('http://localhost:4000/send-to-den', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          node: currentFocusNode
        })
      });
  
      const result = await response.json();
  
      if (response.ok && result.success) {
        console.log('✅ Page sent to den successfully!');
  
        // ✅ CRITICAL FIX: Properly sync the modified node back to local state
        if (result.node) {
          // Update all properties from the backend response
          if (result.node.pages) {
            currentFocusNode.pages = [...result.node.pages];
          }
          
          if (result.node.conceptList) {
            currentFocusNode.conceptList = [...result.node.conceptList];
          }
          
          // ✅ MOST IMPORTANT: Update children array
          if (result.node.children) {
            console.log('🔄 Updating children array from backend response');
            console.log('  - Backend returned children count:', result.node.children.length);
            
            // Create new child objects and restore parent references
            currentFocusNode.children = result.node.children.map(backendChild => {
              const childNode = {
                title: backendChild.title,
                pages: [...backendChild.pages],
                conceptList: [...backendChild.conceptList],
                denned: backendChild.denned || false,
                parent: currentFocusNode, // ✅ Restore parent reference
                children: backendChild.children || [],
                comparisonScore: backendChild.comparisonScore || 0
              };
              return childNode;
            });
            
            console.log('✅ Children array updated successfully');
            console.log('  - New children count:', currentFocusNode.children.length);
            console.log('  - Children titles:', currentFocusNode.children.map(c => c.title));
          }
          
          // Update answer for bigDaddyNode
          if (result.node.answer !== undefined && 'answer' in currentFocusNode) {
            currentFocusNode.answer = result.node.answer;
          }
  
          // ✅ CRITICAL: Update the global den data if this is the root node
          console.log('🔍 Debug: currentFocusNode === currentDenData?', currentFocusNode === currentDenData);
          console.log('🔍 Debug: currentFocusNode type:', currentFocusNode?.query ? 'bigDaddyNode' : 'babyNode');
          console.log('🔍 Debug: currentDenData type:', currentDenData?.query ? 'bigDaddyNode' : 'babyNode');
          
          if (currentFocusNode === currentDenData) {
            console.log('🏠 Updated global den data (root node modified)');
            // currentDenData is already updated since it's the same reference
          } else {
            // If it's a baby node, update it in the parent's structure
            console.log('👶 Updated baby node in parent structure');
            updateBabyNodeInDenData(currentFocusNode);
          }
          
          // Always sync the central node (currentDenData) to backend
          try {
            console.log('🔄 Syncing central node with backend...');
            console.log('📊 Current den data children count:', currentDenData.children?.length || 0);
            console.log('📊 Current den data children:', currentDenData.children?.map(c => c.title) || []);
            
            const updateResponse = await fetch('http://localhost:4000/update-central-node', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ node: currentDenData })
            });
            
            if (updateResponse.ok) {
              const responseData = await updateResponse.json();
              console.log('✅ Central node synced with backend');
              console.log('📊 Backend response children count:', responseData.centralNode?.children?.length || 0);
            } else {
              const errorText = await updateResponse.text();
              console.warn('⚠️ Failed to sync central node with backend:', errorText);
            }
          } catch (error) {
            console.error('❌ Error syncing central node:', error);
          }
  
          console.log('🎯 AFTER processing - Focus node state:');
          console.log('  - Pages:', currentFocusNode.pages?.length || 0);
          console.log('  - Concepts:', currentFocusNode.conceptList?.length || 0);
          console.log('  - Children:', currentFocusNode.children?.length || 0);
          console.log('  - Children details:', currentFocusNode.children?.map(c => c.title) || []);
          
          console.log('📈 Processing Statistics:');
          console.log('  - Concepts added:', result.concepts_added);
          console.log('  - Concepts removed:', result.concepts_removed);
          console.log('  - Child nodes created:', result.child_nodes_created);
          
          // Detailed child node logging
          if (currentFocusNode.children && currentFocusNode.children.length > 0) {
            console.log('👶 Child nodes created:');
            currentFocusNode.children.forEach((child, index) => {
              console.log(`  ${index + 1}. "${child.title}" (score: ${child.comparisonScore || 'N/A'})`);
            });
          }
        }
      } else {
        console.error('❌ Failed to send page to den:', response.status);
        if (result.error) {
          console.error('❌ Error details:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error sending page to den:', error);
    }
  });

  globalShortcut.register('CommandOrControl+Left', async () => {
    console.log('🎯 Ctrl+Left pressed in Electron!');

    

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

