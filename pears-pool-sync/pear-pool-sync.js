/**
 * Conceal Network Pool Sync - A Pears application for sharing and updating mining pool information
 * This application facilitates the peer-to-peer sharing of Conceal Network mining pools.
 */

// For interactive documentation and code auto-completion in editor
/** @typedef {import('pear-interface')} */ 

/* global Pear */
import Hyperswarm from 'hyperswarm'
import crypto from 'bare-crypto'
import b4a from 'b4a'
import fs from 'bare-fs'
import path from 'bare-path'
import os from 'bare-os'
import process from 'bare-process'
import child_process from 'bare-subprocess'
import readline from 'bare-readline'
import tty from 'bare-tty'

const { teardown, config } = Pear

// Define constants for topic and file paths
const POOL_TOPIC = 'ccx-mining-pools-v1'

// Define user data directory (XDG standard)
const HOME_DIR = os.homedir()
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(HOME_DIR, '.local', 'share')
const USER_DATA_DIR = path.join(XDG_DATA_HOME, 'PingCCXPool')

// Define file paths
const USER_POOL_FILE = path.join(USER_DATA_DIR, 'pear-pools.json')
const LOCAL_POOL_FILE = path.join(process.cwd(), 'pear-pools.json')
const DEFAULT_POOL_FILE = path.join(process.cwd(), 'pools.json')

// Initialize variables
let swarm
let poolsData = { pools: [] }
let peers = 0
let lastUpdate = null
let useUserDataDir = false

// Create a hash of the topic for discovery
const topicHash = crypto.createHash('sha256').update(POOL_TOPIC).digest()

// Set up readline interface for terminal input
const rl = readline.createInterface({
  input: new tty.ReadStream(0),
  output: new tty.WriteStream(1)
})

// Enable automatic reloading for the app

// Clean up resources when the app is closed
teardown(() => {
  if (swarm) swarm.destroy()
  rl.close()
})

// Global variable to store discovery object
let globalDiscovery = null;

/**
 * Ensure the user data directory exists
 */
function ensureUserDataDir() {
  try {
    if (!fs.existsSync(USER_DATA_DIR)) {
      // Create the directory structure
      fs.mkdirSync(USER_DATA_DIR, { recursive: true })
      console.log(`Created user data directory: ${USER_DATA_DIR}`)
    }
    return true
  } catch (e) {
    console.error(`Failed to create user data directory: ${e.message}`)
    return false
  }
}

/**
 * Check if we can write to the user data directory
 */
async function canWriteToUserDataDir() {
  try {
    // Ensure the directory exists
    if (!ensureUserDataDir()) {
      return false
    }
    
    // Try writing a test file to the directory
    const testFile = path.join(USER_DATA_DIR, '.write-test')
    try {
      fs.writeFileSync(testFile, 'test', { flag: 'w' })
      fs.unlinkSync(testFile)
      return true
    } catch (e) {
      console.log(`Cannot write to user data directory: ${e.message}`)
      return false
    }
  } catch (e) {
    console.log(`Error checking user data directory: ${e.message}`)
    return false
  }
}

/**
 * Copy default pools to user data and local files
 */
function copyDefaultPools() {
  try {
    if (fs.existsSync(DEFAULT_POOL_FILE)) {
      const defaultData = fs.readFileSync(DEFAULT_POOL_FILE, 'utf8')
      const defaultPools = JSON.parse(defaultData)
      
      if (defaultPools.pools && Array.isArray(defaultPools.pools) && defaultPools.pools.length > 0) {
        poolsData = defaultPools
        console.log(`Copied ${poolsData.pools.length} pools from default file`)
        savePoolData()
        return true
      }
    }
    return false
  } catch (e) {
    console.error(`Error copying default pools: ${e.message}`)
    return false
  }
}

/**
 * Initialize the application
 */
async function initialize() {
  // Check if we can use the user data directory
  useUserDataDir = await canWriteToUserDataDir()
  console.log(`Using user data directory: ${useUserDataDir}`)
  
  // Check which pool file to use
  const userFileExists = fs.existsSync(USER_POOL_FILE)
  const localFileExists = fs.existsSync(LOCAL_POOL_FILE)
  const defaultFileExists = fs.existsSync(DEFAULT_POOL_FILE)
  
  // Load pool data
  try {
    let poolFile
    let shouldCopyDefaultPools = false
    
    if (useUserDataDir && userFileExists) {
      poolFile = USER_POOL_FILE
      console.log(`Loading pools from user data file: ${poolFile}`)
      
      // Check if the file is empty or has invalid content
      const data = fs.readFileSync(poolFile, 'utf8')
      try {
        const parsedData = JSON.parse(data)
        if (!parsedData.pools || !Array.isArray(parsedData.pools) || parsedData.pools.length === 0) {
          console.log('User data file exists but pools array is empty. Will copy default pools.')
          shouldCopyDefaultPools = true
        }
      } catch (e) {
        console.log('User data file exists but has invalid JSON. Will copy default pools.')
        shouldCopyDefaultPools = true
      }
    } else if (localFileExists) {
      poolFile = LOCAL_POOL_FILE
      console.log(`Loading pools from local file: ${poolFile}`)
      
      // Check if the file is empty or has invalid content
      const data = fs.readFileSync(poolFile, 'utf8')
      try {
        const parsedData = JSON.parse(data)
        if (!parsedData.pools || !Array.isArray(parsedData.pools) || parsedData.pools.length === 0) {
          console.log('Local file exists but pools array is empty. Will copy default pools.')
          shouldCopyDefaultPools = true
        }
      } catch (e) {
        console.log('Local file exists but has invalid JSON. Will copy default pools.')
        shouldCopyDefaultPools = true
      }
    } else if (defaultFileExists) {
      poolFile = DEFAULT_POOL_FILE
      console.log(`Loading pools from default file: ${poolFile}`)
      shouldCopyDefaultPools = true
    } else {
      // Create an empty pool list
      poolsData = { pools: [] }
      console.log('No pool file found. Starting with empty pool list.')
      return
    }
    
    // Load the pool data
    const data = fs.readFileSync(poolFile, 'utf8')
    poolsData = JSON.parse(data)
    
    // Ensure the poolsData has the correct structure
    if (!poolsData.pools || !Array.isArray(poolsData.pools)) {
      console.log('Invalid pools data format, resetting to empty')
      poolsData = { pools: [] }
      shouldCopyDefaultPools = true
    } else if (poolsData.pools.length === 0) {
      console.log('Pools array is empty, will copy default pools')
      shouldCopyDefaultPools = true
    } else {
      console.log(`Loaded ${poolsData.pools.length} pools from ${poolFile}`)
    }
    
    // If we should copy the default pools, do so now
    if (shouldCopyDefaultPools && defaultFileExists) {
      copyDefaultPools()
    }
  } catch (e) {
    console.error(`Error loading pools: ${e.message}`)
    poolsData = { pools: [] }
    
    // Try to load from default file as a fallback
    if (defaultFileExists) {
      copyDefaultPools()
    }
  }
  
  // Print current pools
  printPools()
}

/**
 * Merge received pools with our pool list
 */
function mergePools(newPools) {
  try {
    console.log('Starting pool merge process...')
    
    if (!Array.isArray(newPools)) {
      console.log('Received invalid pools data (not an array)')
      console.log(`Data type: ${typeof newPools}`)
      console.log(`Data: ${JSON.stringify(newPools).substring(0, 100)}...`)
      return
    }
    
    if (newPools.length === 0) {
      console.log('Received empty pools list from peer')
      return
    }
    
    console.log(`Processing ${newPools.length} pools from peer`)
    
    let poolsChanged = false
    let addedCount = 0
    let invalidCount = 0
    let duplicateCount = 0
    
    // Add new pools if they don't exist in our list
    newPools.forEach((newPool, index) => {
      console.log(`Processing pool ${index + 1}/${newPools.length}: ${JSON.stringify(newPool)}`)
      
      // Validate pool data
      if (!newPool.address || !newPool.port) {
        console.log(`Skipping invalid pool data at index ${index}: ${JSON.stringify(newPool)}`)
        invalidCount++
        return
      }
      
      const exists = poolsData.pools.some(p => 
        p.address === newPool.address && p.port === newPool.port
      )
      
      if (exists) {
        console.log(`Pool already exists: ${newPool.address}:${newPool.port}`)
        duplicateCount++
      } else {
        poolsData.pools.push(newPool)
        poolsChanged = true
        addedCount++
        console.log(`Added new pool: ${newPool.address}:${newPool.port}`)
      }
    })
    
    // If we added new pools, save the updated list
    if (poolsChanged) {
      console.log(`Added ${addedCount} new pools from peer (${invalidCount} invalid, ${duplicateCount} duplicates)`)
      lastUpdate = new Date()
      savePoolData()
      printPools()
      broadcastPools()
    } else {
      console.log(`No new pools to add from peer (${invalidCount} invalid, ${duplicateCount} duplicates)`)
    }
  } catch (e) {
    console.error(`Error merging pools: ${e.message}`)
    console.error(e.stack)
  }
}

/**
 * Broadcast pool data to all connected peers
 */
function broadcastPools() {
  sharePoolsWithPeers()
}

/**
 * Save pool data to file
 */
async function savePoolData() {
  try {
    // Determine target file based on permissions
    const targetFile = useUserDataDir ? USER_POOL_FILE : LOCAL_POOL_FILE
    
    // Save to the appropriate location
    fs.writeFileSync(targetFile, JSON.stringify(poolsData, null, 2), 'utf8')
    console.log(`Saved pools to: ${targetFile}`)
    
    // Also save to local file as a backup if using user data dir
    if (useUserDataDir && targetFile !== LOCAL_POOL_FILE) {
      fs.writeFileSync(LOCAL_POOL_FILE, JSON.stringify(poolsData, null, 2), 'utf8')
      console.log(`Also saved a backup to: ${LOCAL_POOL_FILE}`)
    }
  } catch (e) {
    console.error(`Error saving pools: ${e.message}`)
  }
}

/**
 * Add a new pool and broadcast to peers
 */
function addPool(address, port) {
  // Validate input
  if (!address || !port) return false
  
  // Create the new pool object
  const newPool = { address: address, port: port }
  
  // Check if pool already exists
  const exists = poolsData.pools.some(p => 
    p.address === newPool.address && p.port === newPool.port
  )
  
  if (exists) {
    console.log(`Pool ${address}:${port} already exists`)
    return false
  }
  
  // Add new pool
  poolsData.pools.push(newPool)
  
  // Save and broadcast
  lastUpdate = new Date()
  savePoolData()
  printPools()
  broadcastPools()
  return true
}

/**
 * Check network connectivity
 */
async function checkNetworkConnectivity() {
  try {
    console.log('Checking network connectivity...')
    
    // Log topic information
    console.log(`\nTopic: ${POOL_TOPIC}`)
    console.log(`Topic hash: ${topicHash.toString('hex')}`)
    
    // Log connection information
    if (swarm) {
      console.log(`\nSwarm connections: ${swarm.connections.length}`)
      console.log(`Connected peers: ${peers}`)
    } else {
      console.log('\nSwarm not initialized')
    }
    
    return true
  } catch (e) {
    console.error(`Error checking network connectivity: ${e.message}`)
    return false
  }
}

/**
 * Print the current status to the terminal
 */
function printStatus() {
  console.log(`\n=== STATUS ===`)
  console.log(`Connected to network: ${swarm ? 'Yes' : 'No'}`)
  console.log(`Connected peers: ${peers}`)
  console.log(`Last update: ${lastUpdate ? lastUpdate.toLocaleString() : 'Never'}`)
  console.log(`Using user data directory: ${useUserDataDir ? USER_DATA_DIR : 'No'}`)
  
  if (swarm) {
    console.log(`Active connections: ${swarm.connections.length}`)
    console.log(`Topic: ${POOL_TOPIC}`)
    console.log(`Topic hash: ${topicHash.toString('hex')}`)
  }
  
  console.log(`Pools count: ${poolsData.pools.length}`)
  console.log(`=============\n`)
}

/**
 * Print the current pools to the terminal
 */
function printPools() {
  console.log(`\n=== POOLS (${poolsData.pools.length}) ===`)
  
  if (poolsData.pools.length === 0) {
    console.log('No pools available')
  } else {
    console.log('INDEX  ADDRESS                                PORT')
    console.log('-----+---------------------------------------+------')
    poolsData.pools.forEach((pool, index) => {
      console.log(`${(index + 1).toString().padStart(5)}  ${pool.address.padEnd(40)} ${pool.port}`)
    })
  }
  
  console.log(`===================\n`)
}

/**
 * Remove a pool by its index (1-based)
 */
function removePool(index) {
  // Convert to 0-based index
  const actualIndex = index - 1;
  
  // Validate index
  if (actualIndex < 0 || actualIndex >= poolsData.pools.length) {
    console.log(`Invalid pool index. Please use a number between 1 and ${poolsData.pools.length}`);
    return false;
  }
  
  // Get the pool to be removed for logging
  const removedPool = poolsData.pools[actualIndex];
  
  // Remove the pool
  poolsData.pools.splice(actualIndex, 1);
  
  // Save and broadcast
  lastUpdate = new Date();
  console.log(`Removed pool: ${removedPool.address}:${removedPool.port}`);
  savePoolData();
  printPools();
  broadcastPools();
  return true;
}

/**
 * Print the help menu
 */
function printHelp() {
  console.log(`\n=== COMMANDS ===`)
  console.log(`help     - Show this help menu`)
  console.log(`status   - Show connection status`)
  console.log(`pools    - List all pools`)
  console.log(`add      - Add a new pool (format: add <address>:<port> or add <address> <port>)`)
  console.log(`remove   - Remove a pool by its index (format: remove <index>)`)
  console.log(`save     - Force save pools to file`)
  console.log(`sync     - Request pools from all connected peers`)
  console.log(`share    - Force send pools with all connected peers`)
  console.log(`network  - Check network connectivity`)
  console.log(`announce - Announce presence on the network`)
  console.log(`quit     - Exit the application`)
  console.log(`===============\n`)
}

/**
 * Start the peer-to-peer network
 */
async function startNetwork() {
  try {
    console.log('Starting peer-to-peer network...')
    
    // Create the swarm
    swarm = new Hyperswarm()
    
    console.log('Swarm created, joining topic...')
    console.log(`Topic: ${POOL_TOPIC}`)
    console.log(`Topic hash: ${topicHash.toString('hex')}`)
    
    // Keep track of all connections
    const conns = []
    
    // Handle new connections
    swarm.on('connection', conn => {
      const name = b4a.toString(conn.remotePublicKey, 'hex').substr(0, 6)
      console.log(`New peer connected! Peer ID: ${name}`)
      peers++
      conns.push(conn)
      
      // Remove connection when closed
      conn.once('close', () => {
        console.log(`Peer disconnected: ${name}`)
        peers--
        const index = conns.indexOf(conn)
        if (index !== -1) {
          conns.splice(index, 1)
        }
        printStatus()
        rl.prompt() // Show prompt after status update
      })
      
      // Handle errors
      conn.on('error', e => {
        console.log(`Connection error with peer ${name}: ${e}`)
        rl.prompt() // Show prompt after error
      })
      
      // Handle incoming data
      conn.on('data', data => {
        try {
          // Log the received data size
          console.log(`Received data of size: ${data.length} bytes from peer ${name}`)
          
          // Parse the message
          const message = JSON.parse(data.toString())
          console.log(`Received message type: ${message.type} from peer ${name}`)
          
          if (message.type === 'POOLS') {
            if (!message.poolsData || !message.poolsData.pools) {
              console.log(`Received invalid pools data structure from peer ${name}`)
              rl.prompt() // Show prompt after log
              return
            }
            
            console.log(`Received ${message.poolsData.pools.length} pools from peer ${name}`)
            mergePools(message.poolsData.pools)
            rl.prompt() // Show prompt after merge
          } else if (message.type === 'REQUEST_POOLS') {
            console.log(`Received request for pools from peer ${name}`)
            // Add a small delay to avoid overwhelming the connection
            setTimeout(() => {
              // Create a deep copy of the pools data to avoid reference issues
              const poolsCopy = JSON.parse(JSON.stringify(poolsData))
              
              const message = {
                type: 'POOLS',
                poolsData: poolsCopy,
                timestamp: Date.now()
              }
              
              // Convert to string and log the size
              const messageStr = JSON.stringify(message)
              console.log(`Sending message of size: ${messageStr.length} bytes to peer ${name}`)
              
              // Send the data
              conn.write(messageStr)
              console.log(`Pools sent successfully to peer ${name}`)
              rl.prompt() // Show prompt after sending
            }, 500)
          }
        } catch (e) {
          console.error(`Error handling message from peer ${name}: ${e.message}`)
          console.error(`Raw data: ${data.toString().substring(0, 100)}...`)
          rl.prompt() // Show prompt after error
        }
      })
      
      // Send our pools to the new peer
      try {
        console.log(`Sending ${poolsData.pools.length} pools to peer ${name}`)
        
        // Create a deep copy of the pools data to avoid reference issues
        const poolsCopy = JSON.parse(JSON.stringify(poolsData))
        
        const message = {
          type: 'POOLS',
          poolsData: poolsCopy,
          timestamp: Date.now()
        }
        
        // Convert to string and log the size
        const messageStr = JSON.stringify(message)
        console.log(`Sending message of size: ${messageStr.length} bytes to peer ${name}`)
        
        // Send the data
        conn.write(messageStr)
        console.log(`Pools sent successfully to peer ${name}`)
      } catch (e) {
        console.error(`Error sending pools to peer ${name}: ${e.message}`)
      }
      
      // If we have no pools, explicitly request pools from the peer
      if (poolsData.pools.length === 0) {
        try {
          console.log(`Requesting pools from peer ${name}`)
          const message = {
            type: 'REQUEST_POOLS',
            timestamp: Date.now()
          }
          
          // Send the request
          conn.write(JSON.stringify(message))
          console.log(`Pool request sent successfully to peer ${name}`)
        } catch (e) {
          console.error(`Error requesting pools from peer ${name}: ${e.message}`)
        }
      }
      
      printStatus()
      rl.prompt() // Show prompt after status update
    })
    
    // Log swarm events - REDUCE FREQUENCY
    let lastUpdateLog = 0
    swarm.on('update', () => {
      // Only log updates every 60 seconds to reduce spam
      const now = Date.now()
      if (now - lastUpdateLog > 60000) {
        console.log(`Swarm update event: ${swarm.connections.size} connections`)
        lastUpdateLog = now
        rl.prompt() // Show prompt after update
      }
    })
    
    // Convert the topic to a buffer if it's not already
    const topicBuffer = Buffer.isBuffer(topicHash) ? topicHash : b4a.from(topicHash)
    
    // Join the topic for pool sharing
    console.log('Joining topic...')
    const discovery = swarm.join(topicBuffer, { 
      client: true, 
      server: true,
      announce: true,
      lookup: true
    })
    
    // Store discovery object globally
    globalDiscovery = discovery
    
    // Wait for the discovery to be flushed
    console.log('Flushing discovery...')
    await discovery.flushed()
    console.log('Discovery flushed, joined the mining pools topic')
    
    // Print status to show we're connected
    printStatus()
    
    // Set up a periodic check for empty pools and connection status - REDUCE FREQUENCY
    let lastConnectionLog = 0
    setInterval(() => {
      const now = Date.now()
      
      // If we have no pools and we have peers, request pools from all peers
      if (poolsData.pools.length === 0 && conns.length > 0) {
        console.log('No pools available. Requesting pools from all connected peers...')
        for (const conn of conns) {
          try {
            const name = b4a.toString(conn.remotePublicKey, 'hex').substr(0, 6)
            console.log(`Requesting pools from peer ${name}`)
            const message = {
              type: 'REQUEST_POOLS',
              timestamp: Date.now()
            }
            conn.write(JSON.stringify(message))
            console.log(`Pool request sent successfully to peer ${name}`)
          } catch (e) {
            console.error(`Error requesting pools: ${e.message}`)
          }
        }
        rl.prompt() // Show prompt after requests
      }
      
      // Log connection status periodically (every 5 minutes)
      if (now - lastConnectionLog > 300000) {
        console.log(`Connection status: ${conns.length} peers connected`)
        lastConnectionLog = now
        
        // If no peers, try to refresh discovery
        if (conns.length === 0) {
          try {
            console.log('No peers connected. Refreshing discovery...')
            discovery.refresh()
            console.log('Discovery refreshed')
          } catch (e) {
            console.error(`Error refreshing discovery: ${e.message}`)
          }
        }
        
        rl.prompt() // Show prompt after status update
      }
    }, 60000) // Check every 60 seconds instead of 15
    
    return true
  } catch (e) {
    console.error(`Error starting network: ${e.message}`)
    return false
  }
}

/**
 * Request pools from all connected peers
 */
function syncWithPeers() {
  if (!swarm) {
    console.log('Swarm not initialized. Cannot sync.')
    return
  }
  
  const conns = [...swarm.connections]
  if (conns.length === 0) {
    console.log('No peers connected. Cannot sync.')
    return
  }
  
  console.log(`Requesting pools from ${conns.length} connected peers...`)
  for (const conn of conns) {
    try {
      const name = b4a.toString(conn.remotePublicKey, 'hex').substr(0, 6)
      console.log(`Requesting pools from peer ${name}`)
      const message = {
        type: 'REQUEST_POOLS',
        timestamp: Date.now()
      }
      
      // Send the request
      conn.write(JSON.stringify(message))
      console.log(`Pool request sent successfully to peer ${name}`)
    } catch (e) {
      console.error(`Error requesting pools: ${e.message}`)
    }
  }
}

/**
 * Force send pools to all connected peers
 */
function sharePoolsWithPeers() {
  if (!swarm) {
    console.log('Swarm not initialized. Cannot share pools.')
    return
  }
  
  const conns = [...swarm.connections]
  if (conns.length === 0) {
    console.log('No peers connected. Cannot share pools.')
    return
  }
  
  console.log(`Forcefully sharing pools with ${conns.length} connected peers...`)
  for (const conn of conns) {
    try {
      const name = b4a.toString(conn.remotePublicKey, 'hex').substr(0, 6)
      console.log(`Sending ${poolsData.pools.length} pools to peer ${name}`)
      
      // Create a deep copy of the pools data to avoid reference issues
      const poolsCopy = JSON.parse(JSON.stringify(poolsData))
      
      const message = {
        type: 'POOLS',
        poolsData: poolsCopy,
        timestamp: Date.now()
      }
      
      // Convert to string and log the size
      const messageStr = JSON.stringify(message)
      console.log(`Sending message of size: ${messageStr.length} bytes to peer ${name}`)
      
      // Send the data
      conn.write(messageStr)
      console.log(`Pools sent successfully to peer ${name}`)
    } catch (e) {
      console.error(`Error sending pools: ${e.message}`)
    }
  }
}

/**
 * Announce presence on the network
 */
function announcePresence() {
  if (!swarm) {
    console.log('Swarm not initialized. Cannot announce presence.')
    return
  }
  
  if (!globalDiscovery) {
    console.log('Discovery not initialized. Cannot announce presence.')
    return
  }
  
  try {
    console.log('Announcing presence on the network...')
    globalDiscovery.refresh()
    console.log('Presence announced successfully')
  } catch (e) {
    console.error(`Error announcing presence: ${e.message}`)
  }
}

/**
 * Process user commands
 */
function processCommand(cmd) {
  const parts = cmd.trim().split(' ')
  const command = parts[0].toLowerCase()
  
  switch (command) {
    case 'help':
      printHelp()
      break
      
    case 'status':
      printStatus()
      break
      
    case 'pools':
      printPools()
      break
      
    case 'add':
      if (parts.length < 2) {
        console.log('Usage: add <address>:<port> or add <address> <port>')
      } else if (parts.length === 2) {
        // Check if input is in format address:port
        const addressPortParts = parts[1].split(':')
        if (addressPortParts.length === 2) {
          const address = addressPortParts[0]
          const port = addressPortParts[1]
          addPool(address, port)
        } else {
          console.log('Invalid format. Use: add <address>:<port> or add <address> <port>')
        }
      } else {
        // Traditional format: add address port
        const address = parts[1]
        const port = parts[2]
        addPool(address, port)
      }
      break
      
    case 'remove':
      if (parts.length !== 2) {
        console.log('Usage: remove <index>')
      } else {
        const index = parseInt(parts[1], 10)
        if (isNaN(index)) {
          console.log('Invalid index. Please provide a number.')
        } else {
          removePool(index)
        }
      }
      break
      
    case 'save':
      savePoolData()
      break
      
    case 'sync':
      syncWithPeers()
      break
      
    case 'share':
      sharePoolsWithPeers()
      break
      
    case 'network':
      checkNetworkConnectivity()
      break
      
    case 'announce':
      announcePresence()
      break
      
    case 'quit':
    case 'exit':
      console.log('Exiting...')
      if (swarm) swarm.destroy()
      rl.close()
      process.exit(0)
      break
      
    default:
      if (cmd.trim()) {
        console.log(`Unknown command: ${command}`)
        console.log('Type "help" for available commands')
      }
  }
}

// Main application flow
async function main() {
  console.log('=== Conceal Network Pool Sync ===')
  console.log('Type "help" for available commands\n')
  
  // Check network connectivity
  await checkNetworkConnectivity()
  
  // Initialize the application
  await initialize()
  
  // Start the peer-to-peer network
  await startNetwork()
  
  // Set up command processing
  rl.on('line', (line) => {
    processCommand(line)
    rl.prompt()
  })
  
  rl.on('close', () => {
    if (swarm) swarm.destroy()
    process.exit(0)
  })
  
  // Show the prompt
  console.log('\nReady for commands. Type "help" to see available commands.')
  rl.prompt()
}

/**
 * Custom logging function to ensure prompt is preserved
 */
const originalConsoleLog = console.log
console.log = function() {
  // Clear the current line if readline is active
  if (rl && rl.line) {
    process.stdout.write('\r\x1b[K')
  }
  
  // Call the original console.log with all arguments
  originalConsoleLog.apply(console, arguments)
  
  // Re-display the prompt and current input if readline is active
  if (rl && rl.line) {
    rl.prompt(true)
  }
}

// Start the application
main().catch(err => {
  console.error('Error starting application:', err)
  process.exit(1)
}) 