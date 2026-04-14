# VPN Setup and Troubleshooting

## Initial VPN Setup

### Windows

1. Open the **Company Portal** app (pre-installed on company laptops)
2. Search for "GlobalProtect VPN" and click **Install**
3. Once installed, open **GlobalProtect** from the system tray
4. Enter the portal address: vpn.company.com
5. Sign in with your company email and password
6. Complete MFA verification when prompted
7. Click **Connect**

### Mac

1. Open **Self Service** application
2. Find "GlobalProtect VPN" and click **Install**
3. Open **GlobalProtect** from the menu bar
4. Enter portal: vpn.company.com
5. Sign in with company credentials
6. Approve MFA prompt
7. Click **Connect**

## Troubleshooting

### VPN Won't Connect

1. Check your internet connection first
2. Restart the GlobalProtect application
3. Try disconnecting and reconnecting
4. Restart your computer
5. If still failing, uninstall and reinstall GlobalProtect

### Slow VPN Connection

- Use split tunneling if available (check Settings then Connection)
- Connect to the nearest VPN gateway
- Close unnecessary applications using bandwidth
- Try a wired connection instead of Wi-Fi

### Authentication Failed Error

1. Verify your password has not expired
2. Reset your password at https://passwordreset.microsoftonline.com
3. Ensure MFA is properly set up on your account
4. Contact IT if the issue persists

## VPN Access Policy

- VPN is required for accessing internal company resources remotely
- VPN sessions automatically disconnect after 12 hours of inactivity
- Split tunneling is enabled so only company traffic goes through the VPN
