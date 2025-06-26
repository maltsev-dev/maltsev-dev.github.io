+++
title = "🧪 RP2040 Pico W Lab"
date = "2025-06-24"

[taxonomies]
tags = ["rust", "rp2040", "embedded", "project"]
+++

**Experiments, Prototypes & Notes with the Raspberry Pi Pico W**

This repository contains my projects, experiments, and notes using the **Raspberry Pi Pico W**, built on the **RP2040** microcontroller with integrated Wi-Fi.  
It serves as a playground for testing ideas, learning embedded concepts, and building small prototypes.

<!-- more -->
---


**Goals:**

* Explore RP2040 features with `rp2040_hal`
* Build Wi-Fi-enabled IoT devices
* Interface with peripherals (GPIO, I2C, SPI, UART, ADC, PWM)
* Experiment with power management, timers, interrupts
* Integrate with sensors and modules (temperature, motion, light, etc.)

---

## ⚙️ Hardware Used

* Raspberry Pi Pico W
* Breadboard & jumper wires
* Sensors: DHT11, MPU6050, BH1750, HW-416A, HC-SR04, HW-504, etc
* Modules: OLED, WS2812 (Neopixels), relay, MOSFET driver
* Power: USB / battery / external supply 

---

## 🧩 Projects & Experiments

| Project Name            | Description                         | Status         |
| ----------------------- | ----------------------------------- | -------------- |
| `blinky_led_by_button`  | External LED blink controlled by button           | ✅ Done         |
| `led_bar`               | Make LED flow on 10 LED bar graph   | ✅ Done |
| `led_lamp`              | LED ON and LED OFF with button         | ✅ Done      |
| `led_analog`            | Breathing LED with PWM                | ✅ Done |
| `led_bar_pwm`             | Make LED flow on 10 LED bar graph with PWM | ✅ Done      |
| `led_rgb`             | Experiments with RGB LED | ⏳ Planned      |

*More to come.*

---

## 🔧 Tools & Tech Stack

* Languages:  Rust
* IDEs: VSCode
* Libraries: `embedded_hal`, `rp2040_hal`, `panic_halt`, `hal`
* Protocols: GPIO, MQTT, UDP, TCP
* Flash storage & OTA update experiments (planned)

---

## 📁 Repo Structure

```
/bin/
  └── blinky_external_led/
  └── blinky_led_by_button/
  └── led_analog/
  └── led_bar/
  └── led_lamp/
  └── ...
/docs/
  └── wiring_schematics/
  └── setup_notes/
README.md
```

---

## 📎 Notes

This is an open lab space – not a polished library or framework. Things may be messy, experimental, or half-finished.
If you're tinkering with the Pico W too, feel free to fork, comment, or share ideas.


## 📺 Demos

[📚 Source led_lamp](https://github.com/maltsev-dev/pico_rust/blob/master/src/bin/led_lamp.rs)  
<video controls width="720">  
<source src="/media/led_lamp.webm" type="video/webm" />  
</video>  

[📚 Source led_bar](https://github.com/maltsev-dev/pico_rust/blob/master/src/bin/led_bar.rs)  
<video controls width="720">  
<source src="/media/led_bar.webm" type="video/webm" />  
</video>  

[📚 Source led_analog](https://github.com/maltsev-dev/pico_rust/blob/master/src/bin/led_analog.rs)  
<video controls width="720">  
<source src="/media/led_analog.webm" type="video/webm" />  
</video>  

[📚 Source led_bar_pwm](https://github.com/maltsev-dev/pico_rust/blob/master/src/bin/led_bar_pwm.rs)  
<video controls width="720">  
<source src="/media/led_bar_pwm.webm" type="video/webm" />  
</video>  