+++
title = "🧪 nrf52833 BBC micro:bit"
date = "2025-07-24"

[taxonomies]
tags = ["rust", "nrf52833", "embedded", "project"]
+++

**Experiments, Prototypes & Notes with the micro:bit v2.21**

This repository contains my projects, experiments, and notes using the **micro:bit v2.21**, built on the **nrf52833** microcontroller.  
It serves as a playground for testing ideas, learning embedded concepts, and building small prototypes.

<!-- more -->
---


**Goals:**

* Explore nrf52833 features with `microbit::hal`
* Interface with peripherals (GPIO, I2C, SPI, UART, ADC, PWM)
* Experiment with power management, timers, interrupts
* Integrate with sensors and modules (temperature, motion, light, etc.)

---

## ⚙️ Hardware Used

* micro:bit v2.21
* Breadboard & jumper wires
* Sensors: DHT11, MPU6050, BH1750, HW-416A, HC-SR04, HW-504, etc
* Power: USB / battery / external supply 

---

## 🧩 Projects & Experiments

| Project Name            | Description                         | Status         |
| ----------------------- | ----------------------------------- | -------------- |
| `led_circle`  | led matrix circle controlled by bsc           | ✅ Done         |
| `xxx`             | planned | ⏳ Planned       |


*More to come.*

---

## 🔧 Tools & Tech Stack

* Languages:  Rust
* IDEs: VSCode
* Libraries: `microbit::bsc`, `microbit::hal`, `panic_rtt_target`, `cortex_m_rt`
* Protocols: GPIO, MQTT, UDP, TCP
* Flash storage & OTA update experiments (planned)

---


## 📎 Notes

This is an open lab space – not a polished library or framework. Things may be messy, experimental, or half-finished.
If you're tinkering with the micro:bit too, feel free to fork, comment, or share ideas.


## 📺 Demos

[📚 Source led_circle](https://github.com/maltsev-dev/microbit_rust/blob/master/src/led_matrix.rs)  
```linker
led-matrix  :
section              size        addr
.vector_table         256         0x0
.text                6812       0x100
.rodata               856      0x1b9c
.data                   0  0x20000000
.gnu.sgstubs            0      0x1f00
.bss                 1092  0x20000000
.uninit                 0  0x20000444
.debug_loc          14715         0x0
.debug_abbrev        3137         0x0
.debug_info         69578         0x0
.debug_aranges        648         0x0
.debug_ranges       12304         0x0
.debug_str          76193         0x0
.comment              153         0x0
.ARM.attributes        56         0x0
.debug_frame         1260         0x0
.debug_line         21193         0x0
Total              208253
```
<video controls width="720">  
<source src="/media/nrf53833/led_circle.webm" type="video/webm" />  
</video>  