/**
 * Conceal Network Pool Sync - A Pears application for sharing and updating mining pool information
 * This application facilitates the peer-to-peer sharing of Conceal Network mining pools.
 */

import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'

// Define constants for topic and file paths
const POOL_TOPIC = b4a.from('ccx-mining-pools-v1')
const SYSTEM_DIR = '/usr/share/PingCCXPool'
const SYSTEM_POOL_FILE = path.join(SYSTEM_DIR, 'pear-pools.json')
const LOCAL_POOL_FILE = path.join(process.cwd(), 'pear-pools.json')
const DEFAULT_POOL_FILE = path.join(process.cwd(), 'pools.json')

// Initialize variables
let swarm
let poolsData = { pools: [] }
let peers = 0
let lastUpdate = null
let useSystemLocation = false

const topicKey = crypto.createHash(POOL_TOPIC)

/**
 * Check if we can write to the system location
 * If not, we'll use the local file
 */
async function canWriteToSystemLocation() {
  try {
    // Check if directory exists
    if (!fs.existsSync(SYSTEM_DIR)) {
      // Try to create it with elevated privileges
      try {
        await new Promise((resolve, reject) => {
          exec(`pkexec mkdir -p ${SYSTEM_DIR}`, (error) => {
            if (error) {
              console.log(`Failed to create system directory: ${error.message}`)
              reject(error)
            } else {
              console.log(`Created system directory: ${SYSTEM_DIR}`)
              resolve()
            }
          })
        })
      } catch (e) {
        console.log(`Could not create system directory with pkexec: ${e.message}`)
        return false
      }
    }
    
    // Try writing a test file to the directory
    const testFile = path.join(SYSTEM_DIR, '.write-test')
    try {
      fs.writeFileSync(testFile, 'test', { flag: 'w' })
      fs.unlinkSync(testFile)
      return true
    } catch (e) {
      console.log(`Cannot write to system location: ${e.message}`)
      return false
    }
  } catch (e) {
    console.log(`Error checking system location: ${e.message}`)
    return false
  }
}

/**
 * Initialize the application
 */
async function initialize() {
  // Check if we can use the system location
  useSystemLocation = await canWriteToSystemLocation()
  console.log(`Using system location: ${useSystemLocation}`)
  
  // Check which pool file to use
  const systemFileExists = fs.existsSync(SYSTEM_POOL_FILE)
  const localFileExists = fs.existsSync(LOCAL_POOL_FILE)
  const defaultFileExists = fs.existsSync(DEFAULT_POOL_FILE)
  
  // Load pool data
  try {
    let poolFile
    
    if (useSystemLocation && systemFileExists) {
      poolFile = SYSTEM_POOL_FILE
      console.log(`Loading pools from system file: ${poolFile}`)
    } else if (localFileExists) {
      poolFile = LOCAL_POOL_FILE
      console.log(`Loading pools from local file: ${poolFile}`)
    } else if (defaultFileExists) {
      poolFile = DEFAULT_POOL_FILE
      console.log(`Loading pools from default file: ${poolFile}`)
    } else {
      // Create an empty pool list
      poolsData = { pools: [] }
      console.log('No pool file found. Starting with empty pool list.')
      return
    }
    
    const data = fs.readFileSync(poolFile, 'utf8')
    poolsData = JSON.parse(data)
    
    // Ensure the poolsData has the correct structure
    if (!poolsData.pools || !Array.isArray(poolsData.pools)) {
      console.log('Invalid pools data format, resetting to empty')
      poolsData = { pools: [] }
    }
    
    console.log(`Loaded ${poolsData.pools.length} pools from ${poolFile}`)
  } catch (e) {
    console.error(`Error loading pools: ${e.message}`)
    poolsData = { pools: [] }
  }
  
  // Update UI
  updateUI()
}

/**
 * Handle a new connection with a peer
 */
function handleConnection(conn) {
  console.log('New peer connected!')
  peers++
  updateUI()
  
  // Send our pools to the new peer
  sendPools(conn)
  
  // Listen for messages from this peer
  conn.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString())
      
      if (message.type === 'POOLS') {
        console.log(`Received ${message.poolsData.pools.length} pools from peer`)
        mergePools(message.poolsData.pools)
      }
    } catch (e) {
      console.error(`Error handling message: ${e.message}`)
    }
  })
  
  // Handle peer disconnection
  conn.on('close', () => {
    console.log('Peer disconnected')
    peers--
    updateUI()
  })
}

/**
 * Merge received pools with our pool list
 */
function mergePools(newPools) {
  if (!Array.isArray(newPools)) return
  
  let poolsChanged = false
  
  // Add new pools if they don't exist in our list
  newPools.forEach(newPool => {
    const exists = poolsData.pools.some(p => 
      p.address === newPool.address && p.port === newPool.port
    )
    
    if (!exists) {
      poolsData.pools.push(newPool)
      poolsChanged = true
    }
  })
  
  // If we added new pools, save the updated list
  if (poolsChanged) {
    lastUpdate = new Date()
    savePoolData()
    updateUI()
    broadcastPools()
  }
}

/**
 * Send pool data to a specific peer
 */
function sendPools(conn) {
  const message = {
    type: 'POOLS',
    poolsData: poolsData
  }
  
  conn.write(JSON.stringify(message))
}

/**
 * Broadcast pool data to all connected peers
 */
function broadcastPools() {
  if (!swarm) return
  
  for (const conn of swarm.connections) {
    sendPools(conn)
  }
}

/**
 * Save pool data to file
 */
async function savePoolData() {
  try {
    // Determine target file based on permissions
    const targetFile = useSystemLocation ? SYSTEM_POOL_FILE : LOCAL_POOL_FILE
    
    if (useSystemLocation) {
      // For system location, we may need elevated privileges
      try {
        // First, write to a temporary file
        const tempFile = path.join(os.tmpdir(), 'temp-pools.json')
        fs.writeFileSync(tempFile, JSON.stringify(poolsData, null, 2), 'utf8')
        
        // Then use pkexec to copy it to the system location
        await new Promise((resolve, reject) => {
          exec(`pkexec cp ${tempFile} ${SYSTEM_POOL_FILE}`, (error) => {
            if (error) {
              console.error(`Failed to save to system location: ${error.message}`)
              // Fall back to local file
              fs.writeFileSync(LOCAL_POOL_FILE, JSON.stringify(poolsData, null, 2), 'utf8')
              console.log(`Saved pools to local file: ${LOCAL_POOL_FILE}`)
            } else {
              console.log(`Saved pools to system file: ${SYSTEM_POOL_FILE}`)
            }
            // Clean up temp file
            fs.unlinkSync(tempFile)
            resolve()
          })
        })
      } catch (e) {
        console.error(`Error saving to system location: ${e.message}`)
        // Fall back to local file
        fs.writeFileSync(LOCAL_POOL_FILE, JSON.stringify(poolsData, null, 2), 'utf8')
        console.log(`Saved pools to local file: ${LOCAL_POOL_FILE}`)
      }
    } else {
      // For local file, just save directly
      fs.writeFileSync(targetFile, JSON.stringify(poolsData, null, 2), 'utf8')
      console.log(`Saved pools to: ${targetFile}`)
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
  
  // Check if pool already exists
  const exists = poolsData.pools.some(p => 
    p.address === address && p.port === port
  )
  
  if (exists) {
    console.log(`Pool ${address}:${port} already exists`)
    return false
  }
  
  // Add new pool
  const newPool = { address: address, port: port }
  poolsData.pools.push(newPool)
  
  // Save and broadcast
  lastUpdate = new Date()
  savePoolData()
  updateUI()
  broadcastPools()
  return true
}

/**
 * Update the user interface
 */
function updateUI() {
  // Update connection status
  const statusElement = document.getElementById('connection-status')
  if (statusElement) {
    statusElement.textContent = swarm ? 'Connected to network' : 'Not connected'
  }
  
  // Update peer count
  const peerCountElement = document.getElementById('peer-count')
  if (peerCountElement) {
    peerCountElement.textContent = peers.toString()
  }
  
  // Update last update time
  const lastUpdateElement = document.getElementById('last-update')
  if (lastUpdateElement) {
    lastUpdateElement.textContent = lastUpdate ? lastUpdate.toLocaleString() : 'Never'
  }
  
  // Update pools table
  const poolsListElement = document.getElementById('pools-list')
  if (poolsListElement) {
    if (poolsData.pools.length === 0) {
      poolsListElement.innerHTML = '<tr><td colspan="2">No pools available</td></tr>'
    } else {
      poolsListElement.innerHTML = poolsData.pools.map(pool => `
        <tr>
          <td>${pool.address}</td>
          <td>${pool.port}</td>
        </tr>
      `).join('')
    }
  }
}

/**
 * Start the peer-to-peer network
 */
async function startNetwork() {
  // Create the swarm
  swarm = new Hyperswarm()
  
  // Join the topic for pool sharing
  const discovery = swarm.join(POOL_TOPIC, { server: true, client: true })
  await discovery.flushed()
  console.log('Joined the mining pools topic')
  
  // Handle new connections
  swarm.on('connection', (conn) => {
    handleConnection(conn)
  })
  
  // Update UI to show we're connected
  updateUI()
}

/**
 * When the DOM is loaded, initialize everything
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the application
  await initialize()
  
  // Start the peer-to-peer network
  await startNetwork()
  
  // Add event listener for the add pool button
  const addButton = document.getElementById('add-pool-button')
  if (addButton) {
    addButton.addEventListener('click', () => {
      const addressInput = document.getElementById('pool-address')
      const portInput = document.getElementById('pool-port')
      
      const address = addressInput.value.trim()
      const port = portInput.value.trim()
      
      if (address && port) {
        if (addPool(address, port)) {
          // Clear inputs on success
          addressInput.value = ''
          portInput.value = ''
        }
      }
    })
  }
})

// Export functions for external access
export { poolsData, addPool, initialize, startNetwork } 