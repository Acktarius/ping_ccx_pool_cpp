# ping_ccx_pool
*return average response time for selected Conceal mining pool*
### this file is subject to Licence
### Copyright (c) 2023-2024, Acktarius


## this script is delivered "as is" and I deny any and all liability for any damages arising out of using this script

# UBUNTU / DEBIAN
## Option 1 : Legacy Bash script

### Ubuntu Dependencies Installation

`sudo apt install nmap`

zenity is ussually install on Ubuntu, nevertheless if you want to try this script on other distro, you might need to install it :

`sudo apt install zenity`


### Install
ideally place in the /opt folder, for CCX-BOX user : /opt/conceal-toolbox/ping_ccx_pool/

`cd /opt/conceal-toolbox`

`git clone https://github.com/Acktarius/ping_ccx_pool.git`

`cd ping_ccx_pool`

`sudo chmod 755 ping_ccx_pool.sh`

### Running the Application

#### Launch in terminal 
`cd /opt/conceal-toolbox/ping_ccx_pool`

`sudo ./ping_ccx_pool.sh`

#### Create a Desktop Shortcut

1. Copy the icon file:
   ```bash
   mkdir -p ~/.icons
   cp /opt/conceal-toolbox/ping_ccx_pool/pp.png ~/.icons/
   ```

2. Create a .desktop file:
   ```bash
   nano ~/.local/share/applications/ping_pool.desktop
   ```

3. Add the following content to the file:
   ```
   [Desktop Entry]
   Version=1.0
   Type=Application
   Name=CCX Ping Pool
   Comment=Ping Conceal Network mining pools
   Exec=sudo /opt/conceal-toolbox/ping_ccx_pool/ping_ccx_pool.sh
   Icon=pp
   Path=/opt/conceal-toolbox/ping_ccx_pool
   Terminal=false
   Categories=Network;Utility;
   ```

4. Save the file and exit the editor (in nano, press Ctrl+X, then Y, then Enter).

5. Make the .desktop file executable:
   ```bash
   chmod +x ~/.local/share/applications/ping_pool.desktop
   ```

6. Refresh the desktop database:
   ```bash
   update-desktop-database ~/.local/share/applications
   ```

Now you should see the "CCX Ping Pool" shortcut in your applications menu. You can also search for it in the Ubuntu dashboard.

Note: When you click the shortcut, you may be prompted for your sudo password due to the use of sudo in the Exec line.

### Troubleshooting

If the shortcut doesn't appear immediately:
- Log out and log back in, or
- Restart the GNOME Shell by pressing Alt+F2, typing 'r', and pressing Enter (on GNOME desktop environments).

If you encounter permission issues, ensure that the script and its parent directories have the correct permissions:

```bash
sudo chown -R $USER:$USER /opt/conceal-toolbox/ping_ccx_pool
sudo chmod -R 755 /opt/conceal-toolbox/ping_ccx_pool
```

---


## Option 2 : Building from Source the C++ version for Ubuntu/Debian users  

1. Dependencies:
   ```bash
   sudo apt update
   sudo apt install build-essential cmake libwxgtk3.0-gtk3-dev git nlohmann-json3-dev nmap
   ```
*note, is case of error installing libwxgtk3.0-gtk3-dev, you can try instead :* `sudo apt install libwxgtk3.2-dev`


2. Clone the repository:
   ```bash
   git clone https://github.com/Acktarius/ping_ccx_pool_cpp.git
   cd ping_ccx_pool_cpp
   ```

3. Create a build directory:
   ```bash
   mkdir build && cd build
   ```

4. Configure the project with CMake:
   ```bash
   cmake ..
   ```
   
   *   Alternatively, to automatically copy the policy file to /usr/share/polkit-1/actions/:
      ```bash
      cmake -DINSTALL_POLKIT_POLICY=ON ..
      ```

5. Build the project:
   ```bash
   cmake --build .
   ```

5. Create a shortcut to the binary:
   ```bash
   cmake --install .
   ```


   After installation, you may need to adjust the permissions of the desktop shortcut:
   ```bash
   chmod 755 ~/Desktop/PingCCXPool.desktop
   ```

## Manual Policy File Installation

If you didn't use the `-DINSTALL_POLKIT_POLICY=ON` option with CMake, you need to manually copy the policy file `org.acktarius.nping.policy` in `/usr/share/polkit-1/actions/`


## Running the Application

After building, you can run the application from the build directory or icon on desktop if you created the shortcut with `cmake --install .`

## Option 3: Pears Integration for Community-Maintained Pool List

The C++ version of PingCCXPool now supports integration with a Pears application for community-maintained pool lists.

### How It Works

1. The main application checks for a `pear-pools.json` file first
2. If found, it uses this file which contains community-maintained pool information
3. If not found, it falls back to the bundled `pools.json`

### Setting Up the Pears Integration

1. Install Pears:
   ```bash
   npm install -g @pearsproject/pear
   ```

2. Run the Pool Sync application directly from the Pears network:
   ```bash
   pear run pear://ejq6mirh68ffk4pxja6c6g8knwu6ekbzhbicwyx3cw5bbix89z9y
   ```

   Or from the local directory:
   ```bash
   cd pears-pool-sync
   pear run --dev .
   ```

3. Use the interface to add new pools or see pools shared by other users

4. Run the regular PingCCXPool application - it will automatically use the updated pools list

### Benefits

- Community-maintained pool list that stays up-to-date
- Peer-to-peer sharing means no central server needed
- Add new pools as they come online without waiting for official updates
- Completely optional - the main application works fine without it

For more details, see the [PEARS_README.md](PEARS_README.md) file.
