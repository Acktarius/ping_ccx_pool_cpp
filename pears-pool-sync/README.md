# Conceal Network Pool Sync

A peer-to-peer application for sharing and maintaining a list of Conceal Network mining pools.

![Conceal Pool Sync Screenshot](./screenshot.png)

## Overview

Conceal Network Pool Sync is a decentralized application built with Pears that allows miners to collectively maintain and share up-to-date information about mining pools for the Conceal Network cryptocurrency. Rather than relying on a centralized service, this application uses peer-to-peer technology to ensure the pool list stays current through community participation.

## Integration with PingCCXPool

This application is designed to work seamlessly with the PingCCXPool mining tool. The main features include:

- **Automatic Pool Detection**: The PingCCXPool application automatically checks for the `pear-pools.json` file in `/usr/share/PingCCXPool/`.
- **Compatible Format**: The application creates pool data in the same format expected by PingCCXPool.
- **Peer-to-Peer Updates**: As new pools are discovered by the community, they are automatically synchronized across all users.
- **Fallback System**: If no community-maintained pool list is found, PingCCXPool falls back to its bundled `pools.json` file.

### Pool File Format

The pool data is stored in JSON format that's fully compatible with the main application:

```json
{
  "pools": [
    {
      "address": "pool.conceal.network",
      "port": "3333"
    },
    {
      "address": "ccx.another-pool.com",
      "port": "4444"
    }
  ]
}
```

## Requirements

- **Node.js**: v16 or newer
- **Pears**: Pears runtime environment for decentralized applications
- **Operating System**: Linux, macOS, or Windows

## Installation

1. Install the Pears runtime if you haven't already:
   ```
   npm install -g @pearsproject/pear
   ```

2. Clone this repository:
   ```
   git clone https://github.com/yourusername/conceal-pool-sync.git
   cd conceal-pool-sync
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the application:
   ```
   npm start
   ```

## Usage

### Viewing Pools

Once started, the application will:
1. Load any existing pool data from the system location or fallback to local files
2. Connect to the peer-to-peer network to find other miners
3. Automatically share and receive updated pool information

### Adding New Pools

To add a new mining pool:
1. Enter the pool address (e.g., `pool.conceal.network`) and port (e.g., `3333`) in the form
2. Click "Add Pool"
3. The new pool will be saved locally and shared with peers
4. PingCCXPool will detect the updated list on its next run

## How It Works

### Peer-to-Peer Network

The application uses Hyperswarm, a distributed networking stack, to:
- Create a secure topic for Conceal pool sharing
- Find and connect to other miners running the application
- Automatically share pool information
- Receive updates from others

### Storage Locations

Pool data is saved in these locations, in order of preference:
1. **System-wide**: `/usr/share/PingCCXPool/pear-pools.json` (requires sudo/admin privileges)
2. **Local**: `pear-pools.json` in the current directory (fallback)

## Troubleshooting

### Permission Issues

If the application can't write to the system location:
- It will automatically fall back to saving in the local directory
- You can run with sudo/admin privileges to enable system-wide storage

### Peer Connectivity

If you're not connecting to peers:
- Check your internet connection and firewall settings
- Ensure the application has network access
- Try restarting the application

## License

Same as PingCCXPool

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 