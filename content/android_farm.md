+++
title = "Android Emulator Launcher"
date = "2023-07-05"

[taxonomies]
tags = ["java", "android"]
+++

Invent a wheel that launches and configures Android emulators for you.  

<!-- more -->
---

### &emsp;&emsp;&emsp; Android Emulator Launcher

<h3 style="text-align:center; margin-bottom:8px;">Technologies Used</h3>
<p align="center" style="margin:0; padding:0;">
  <img src="https://img.shields.io/badge/java-21%20-green" alt="java Version"/>
  <img src="https://img.shields.io/badge/java_swing%20-orange" alt="Swing Version"/>
</p>

### &emsp;&emsp;&emsp; Features
* If the required emulator image is missing, the program automatically `downloads` it from the Internet
* The device image must have `Google Play support`
* The program is capable of running `N` emulators
* The program must allow creating emulators with API versions from `22` to `33`
* The emulator screen must have the `screen -off` mode
* Program output: N running emulators, list of installed devices

### &emsp;&emsp;&emsp; Used Packages:
`SDKMANAGER`
`AVDMANGER`
`EMULATOR`
`ADB`

### &emsp;&emsp;&emsp; Use Case:
1. Update path to avdmanager, sdkmanager, emulator
2. Run Application

<video controls width="720">
<source src="/media/java_swing_android_emulator_launcher.webm" type="video/webm" />
</video>