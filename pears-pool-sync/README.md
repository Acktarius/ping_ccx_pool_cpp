# Conceal Network Pool Sync

A peer-to-peer terminal application for sharing and maintaining a list of Conceal Network mining pools.

## Overview

This application allows miners to collaboratively maintain an up-to-date list of Conceal Network mining pools. It uses the Pears platform to create a peer-to-peer network where users can share pool information without relying on a central server.

## Integration with PingCCXPool

This application integrates with the PingCCXPool tool. When running, it maintains a `pear-pools.json` file that can be used by the PingCCXPool application to find the best mining pool.

### File Locations

The application saves pool data in the following locations:

1. **User data directory**: `~/.local/share/PingCCXPool/pear-pools.json` (primary location)
2. **Local directory**: `./pear-pools.json` (backup location)

The PingCCXPool application will automatically check these locations for the pool data.

## Requirements

- [Pears Runtime](https://pears.com/download)
- Node.js 16 or higher

## Installation

1. Install Pears:
   ```bash
   npm i -g pear
   ```
2. Setup
   ```
   pear
   ```

3. Add Pears to your PATH (if not already done):
   ```bash
   echo 'export PATH="$PATH:$HOME/.config/pear/bin"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. Run the application directly from the Pears network:
   ```bash
   pear run pear://ejq6mirh68ffk4pxja6c6g8knwu6ekbzhbicwyx3cw5bbix89z9y --terminal
   ```

   Or clone the repository:
   ```bash
   pear clone pear://ejq6mirh68ffk4pxja6c6g8knwu6ekbzhbicwyx3cw5bbix89z9y ccx-pool-sync
   cd ccx-pool-sync
   pear run --dev . --terminal
   ```

## Usage

The application provides a command-line interface with the following commands:

- `help` - Show the help menu
- `status` - Show connection status
- `pools` - List all pools
- `add` - Add a new pool (format: `add <address>:<port>` or `add <address> <port>`)
- `remove` - Remove a pool by its index (format: `remove <index>`)
- `save` - Force save pools to file
- `quit` or `exit` - Exit the application

### Adding a New Pool

To add a new pool, you can use either of these formats:

```
add pool.example.com:3333
```

or

```
add pool.example.com 3333
```

This will add the pool to your local list and share it with other peers in the network.

### Removing a Pool

To remove a pool, first use the `pools` command to see the list of pools with their index numbers:

```
pools
```

Then use the `remove` command followed by the index number of the pool you want to remove:

```
remove 3
```

This will remove the pool at index 3 from your local list and broadcast the change to other peers in the network.

### Viewing Pools

To view the current list of pools, use the `pools` command:

```
pools
```

## Commands

The application supports the following commands:

- `help` - Show the help menu with available commands
- `status` - Show connection status, including number of connected peers
- `pools` - List all available pools
- `add` - Add a new pool (format: `add <address>:<port>` or `add <address> <port>`)
- `remove` - Remove a pool by its index (format: `remove <index>`)
- `save` - Force save pools to file
- `sync` - Request pools from all connected peers (useful if your pool list is empty)
- `share` - Force send pools to all connected peers (useful if peers aren't receiving your pools)
- `network` - Check network connectivity and display network interfaces
- `quit` or `exit` - Exit the application

## Peer-to-Peer Synchronization

The application uses a peer-to-peer network to share and receive pool information:

1. When you connect to the network, your pools are automatically shared with other peers
2. When new peers connect, they will receive your pools and you will receive theirs
3. If your pool list is empty, the application will automatically request pools from connected peers
4. The application periodically checks for empty pools and requests updates from peers
5. You can manually trigger synchronization with the `sync` command
6. You can manually force sharing your pools with the `share` command

## Troubleshooting

If you're not seeing any pools after connecting, try the following:

1. Make sure both computers are on the same network
2. Check your connection status with the `status` command
3. If you have peers connected but no pools, use the `sync` command to request pools
4. If peers aren't receiving your pools, use the `share` command to force send them
5. Check your network connectivity with the `network` command
6. Try restarting the application on both computers
7. Make sure there are no firewalls blocking the connection
8. If using a VPN, try disabling it temporarily

### Common Issues

**No peers connected:**
- Make sure both computers are on the same network
- Check if there are any firewalls blocking the connection
- Try restarting the application on both computers

**Connected but no pools shared:**
- Use the `share` command on the computer with pools
- Use the `sync` command on the computer without pools
- Check the console output for any error messages

**Pools not saving:**
- Check if the application has write permissions to the user data directory
- Use the `save` command to force save the pools
- Check the console output for any error messages

## How It Works

The application uses the Hyperswarm library to create a peer-to-peer network. When you run the application, it:

1. Creates a user data directory at `~/.local/share/PingCCXPool/` if it doesn't exist
2. Loads existing pools from the available pool files
3. Connects to the peer-to-peer network
4. Shares your pool list with other peers
5. Receives pool lists from other peers
6. Merges new pools into your list
7. Saves the updated list to the user data directory and a local backup

## License

Same as PingCCXPool 