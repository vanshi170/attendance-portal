# Student Scanner - iOS Native Installation Guide (No Mac Required)

This guide walks you through compiling the native iOS app via **GitHub Actions** and installing it onto your physical iPhone from your **Windows PC** using **Sideloadly**.

---

## Prerequisites on Windows

1. **iTunes for Windows** (Standard Apple Installer):
   - Download the official installer from Apple (do NOT use Microsoft Store edition):
     - [iTunes 64-bit Windows Installer](https://www.apple.com/itunes/download/win64)
2. **iCloud for Windows** (Standard Apple Installer):
   - Download from Apple:
     - [iCloud 64-bit Windows Installer](https://updates.cdn-apple.com/2020/windows/001-39935-20200911-450E3466-F416-47B2-8D40-F55F618E4C9C/iCloudSetup.exe)
3. **Sideloadly for Windows** (100% Free):
   - Download the installer from the official website:
     - [https://sideloadly.io](https://sideloadly.io)

---

## Step 1: Trigger GitHub Actions to Build Your IPA

1. Push your commits to GitHub:
   ```bash
   git push origin main
   ```
2. Open your repository on GitHub in your browser.
3. Click on the **Actions** tab.
4. You will see the workflow **"Build Native iOS App (Student Scanner)"** running on a free Apple Silicon Mac runner (`macos-14`).
5. When the build completes (usually ~2 to 3 minutes), click on the completed run.
6. Scroll down to the **Artifacts** section at the bottom.
7. Click on **`StudentScanner-iOS-IPA`** to download `StudentScanner.zip`.
8. Unzip it on your Windows PC to get `StudentScanner.ipa`.

---

## Step 2: Install onto Your iPhone with Sideloadly

1. **Connect your iPhone** to your Windows laptop using a USB Lightning or USB-C cable.
2. If prompted on your iPhone, tap **"Trust This Computer"** and enter your passcode.
3. Open **Sideloadly** on your Windows PC.
4. Under **"Connected Device"**, verify that your iPhone is detected.
5. Under **"Apple ID"**, enter your normal personal Apple ID email.
6. Drag and drop the downloaded `StudentScanner.ipa` into the large IPA icon box on the left side of Sideloadly.
7. Click the **"Start"** button at the bottom.
   - Sideloadly communicates directly with Apple's free developer signing servers.
   - If prompted for your Apple ID password or 2-factor authentication code, enter it (Sideloadly uses it solely to generate a personal development provisioning profile).
8. Once the progress bar reaches **100% Complete**, the app icon **"Student Portal"** will appear on your iPhone's home screen!

---

## Step 3: First-Time iPhone Permissions

Because you are installing your own personal developer build, iOS requires you to trust your certificate once:

1. **Trust Developer Profile:**
   - On your iPhone, open **Settings**.
   - Navigate to **General** $\rightarrow$ **VPN & Device Management**.
   - Under **Developer App**, tap your Apple ID email.
   - Tap **"Trust <your-email>"** and confirm.
2. **Enable iOS Developer Mode (iOS 16+):**
   - Go to **Settings** $\rightarrow$ **Privacy & Security**.
   - Scroll down to the bottom and tap **Developer Mode**.
   - Toggle **Developer Mode** to **ON**.
   - Your iPhone will prompt you to restart. Tap **Restart**.
   - After rebooting, unlock your iPhone and tap **Turn On** when prompted.

---

## Step 4: Open & Use the Dual Camera Scanner

1. Launch **Student Portal** from your iPhone home screen.
2. Sign in with your PRN or register a new identity.
3. Tap **"Scan Attendance QR"**:
   - Both your **Back Camera** (pointing at the board QR) and **Front Camera** (pointing at your face) will open and stream **simultaneously in real-time**!
