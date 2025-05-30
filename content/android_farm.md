+++
title = "Android Emulator Launcher"
date = "2023-07-05"

[taxonomies]
tags = ["java", "android"]
+++

Invent a wheel that launches and configures Android emulators for you.

<!-- more -->
---

### Android Emulator Launcher

![java Version](https://img.shields.io/badge/java-21%20-green)  
![java Version](https://img.shields.io/badge/java_swing%20-orange)

### Features
* If the required emulator image is missing, the program automatically `downloads` it from the Internet
* The device image must have `Google Play support`
* The program is capable of running `N` emulators
* The program must allow creating emulators with API versions from `22` to `33`
* The emulator screen must have the `screen -off` mode
* Program output: N running emulators, list of installed devices

### Used Packages:
`SDKMANAGER`
`AVDMANGER`
`EMULATOR`
`ADB`

### Use Case:
1. Update path to avdmanager, sdkmanager, emulator
2. Run Application

<video controls width="720">
<source src="/media/java_swing_android_emulator_launcher.webm" type="video/webm" />
</video>