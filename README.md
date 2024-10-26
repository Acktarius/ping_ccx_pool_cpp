# ping_ccx_pool
*return average response time for selected Conceal mining pool*
### this file is subject to Licence
### Copyright (c) 2023-2024, Acktarius


## this script is delivered “as is” and I deny any and all liability for any damages arising out of using this script

# UBUNTU
## Option 1 : Legacy Bash script

### Ubuntu Dependencies Installation

`sudo apt install nmap`

zenity is ussually install on Ubuntu, nevertheless if you want to try this script on other distro, you might need to install it :

`sudo apt install zenity`


# Install
ideally place in the /opt folder, for CCX-BOX user : /opt/conceal-toolbox/ping_ccx_pool/

`cd /opt/conceal-toolbox`

`git clone https://github.com/Acktarius/ping_ccx_pool.git`

`cd ping_ccx_pool`

`sudo chmod 755 ping_ccx_pool.sh`

# Running the Application

## Launch in terminal 
`cd /opt/conceal-toolbox/ping_ccx_pool`

`sudo ./ping_ccx_pool.sh`

## Create a Desktop Shortcut

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

# Troubleshooting

If the shortcut doesn't appear immediately:
- Log out and log back in, or
- Restart the GNOME Shell by pressing Alt+F2, typing 'r', and pressing Enter (on GNOME desktop environments).

If you encounter permission issues, ensure that the script and its parent directories have the correct permissions:

```bash
sudo chown -R $USER:$USER /opt/conceal-toolbox/ping_ccx_pool
sudo chmod -R 755 /opt/conceal-toolbox/ping_ccx_pool
```

---


## Option 2 : Building from Source for the C++ version

1. Clone the repository:
   ```bash
   git clone https://github.com/Acktarius/ping_ccx_pool_cpp.git
   cd ping_ccx_pool_cpp
   ```

2. Create a build directory:
   ```bash
   mkdir build  && cd build
   ```

3. Configure the project with CMake:
   ```bash
   cmake ..
   ```
   
   Alternatively, to automatically copy the policy file to /usr/share/polkit-1/actions/:
   ```bash
   cmake -DINSTALL_POLKIT_POLICY=ON ..
   ```

4. Build the project:
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

If you didn't use the `-DINSTALL_POLKIT_POLICY=ON` option with CMake, you need to manually copy the policy file in /usr/share/polkit-1/actions/  

```
## Running the Application

After building, you can run the application from the build directory or icon on desktop if you created the shortcut
