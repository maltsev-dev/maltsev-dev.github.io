---
title: "📱 Android Emulator Launcher"
date: "2023-07-05"
tags: ["java", "android", "project"]
---
**A desktop application built with Java Swing for easy configuration, creation, and management of Android emulators.**

<!-- more -->
---

### 🔧 Overview

This tool simplifies managing Android Virtual Devices (AVDs) by providing a user-friendly GUI to create and launch emulators.  
It automatically downloads missing emulator system images as needed and supports multiple simultaneous running emulators.  
The interface displays the list of active emulators along with their connection details.

---

### 🛠️ Technologies & Tools

* **Java 21**
* **Java Swing** for desktop UI
* Android SDK tools:

  * `sdkmanager` — manages SDK packages
  * `avdmanager` — creates and manages Android Virtual Devices
  * `emulator` — runs the Android emulator
  * `adb` — Android Debug Bridge for device interaction

---

### 🚀 Features

* **Automatic download** of emulator system images if missing, ensuring Google Play support
* Supports creating emulators with API levels from **22 to 33**
* Ability to launch and manage **multiple (N)** emulators simultaneously
* Emulators can be started with screen **off mode** to save resources
* Displays a list of all running emulator devices and their addresses for easy access

---

### ⚙️ How to Use

1. Configure the paths to the Android SDK tools (`avdmanager`, `sdkmanager`, `emulator`) within the application settings.
2. Launch the application and select desired emulator parameters.
3. The program will automatically handle image downloads and create the emulator.
4. Running emulators and their connection info will be shown in the UI.

---

### 🎥 Demo

<video controls width="720">
<source src="/media/java_swing_android_emulator_launcher.webm" type="video/webm" />
</video>

---

### 📄 License

This project is licensed under the **MIT License**.