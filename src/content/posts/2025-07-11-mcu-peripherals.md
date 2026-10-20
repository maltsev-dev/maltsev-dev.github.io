---
title: "MCU Peripherals"
date: "2025-07-11"
tags: ["embedded", "basic", "peripherals"]
---
Microcontroller peripherals are functional blocks integrated into the chip that enable it to interact with the outside world or carry out specific tasks — often without involving the processor core.

🟠 When selecting a microcontroller, your choice should depend on the required peripherals, not the other way around.

<!-- more -->
---

The **peripherals of a microcontroller** act like its **senses**, enabling it to interact with the outside world, process analog signals, manage time, communicate with other devices, and perform various application-specific tasks.

Each microcontroller includes a different set of **peripheral modules**, depends on its architecture, manufacturer, specific model etc, and which determine its capabilities and cost.  
Typical peripherals include:
* **ADC** (Analog-to-Digital Converter)
* **Timers** and **PWM Generators**
* **Analog Comparators**
* **Communication interfaces** such as UART (serial port), SPI, I2C, USB, and CAN  

Most microcontrollers, regardless of brand or architecture, include a core set of these essential peripherals.

![Block diagram of an MCU with arrows pointing out to the typical peripheral blocks around it: timers, PWM, DAC/ADC, GPIO, SPI and I2C](/images/emb/mcu_peripherals.png)

---

<style> 
table { 
width: 100%; 
border-collapse: collapse; 
margin-bottom: 20px; 
} 

th, 
td { 
border: 1px solid #ddd; 
padding: 8px; 
vertical-align: top; 
} 

th { 
background-color: #f59140; 
color: white; 
text-align: center; 
} 

td:first-child { 
width: auto; 
}
</style>

<table>
<thead>
<tr>
<th>Category</th>
<th>How it can be different</th>
<th>MCU examples</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>GPIO</strong></td>
<td>Number of pins, alt-functions, open-drain/push-pull, switching speed, pull-up resistors.</td>
<td>
<code>STM32F103</code> – basic set, alt-functions via AFIO<br/>
<code>ESP32S3</code> – up to 45 pins, flexible routing via GPIO matrix<br/>
<code>RP2040</code> – 30 GPIO, PIO support
</td>
</tr>
<tr>
<td><strong>TIMER / PWM</strong></td>
<td>Bit depth (8/16/32 bit), number of timers, modes (OneShot, PWM, Capture), channels, dead-time.</td>
<td>
<code>STM32H7</code> – advanced timers with dead-time, synchronization<br/>
<code>RP2040</code> – 8 PWM blocks with independent channels<br/>
<code>ATmega328P</code> – 3 timers (2×8 bit, 1×16 bit)
</td>
</tr>
<tr>
<td><strong>UART / USART</strong></td>
<td>Number of ports, DMA support, auto-detection of speed, support for IrDA, LIN, RS-485.</td>
<td>
<code>STM32F4</code> – up to 6 USARTs, IrDA and SmartCard support<br/>
<code>ESP32</code> – 3 UARTs, all with DMA<br/>
<code>RP2040</code> – 2 UARTs, software implementation via PIO
</td>
</tr>
<tr>
<td><strong>SPI / I2C</strong></td>
<td>Number of modules, speed (up to 80+ MHz), master/slave modes, DMA support, multi-master.</td>
<td>
<code>STM32L4</code> – SPI with CRC and NSS support<br/>
<code>ESP32S3</code> – up to 4 SPI/I2C, with DMA and master/slave modes<br/>
<code>AVR ATmega328P</code> – I2C (TWI) and SPI with basic functionality
</td>
</tr>
<tr>
<td><strong>ADC / DAC</strong></td>
<td>Bit depth (8-16 bit), number of channels, speed, built-in buffers, calibration.</td>
<td>
<code>STM32G4</code> – 16-bit ADC, 2 MSPS<br/>
<code>ESP32</code> – 12-bit ADC (low quality), 2 DAC<br/>
<code>RP2040</code> – 12-bit ADC, no DAC
</td>
</tr>
<tr>
<td><strong>DMA</strong></td>
<td>Number of channels, peripheral support, linked list, circular mode, prio levels.</td>
<td>
<code>STM32F4</code> – up to 16 DMA channels, peripherals + memory<br/>
<code>RP2040</code> – 12 channels, programmable transfers<br/>
<code>ESP32</code> – built-in DMA controller with SPI/UART
</td>
</tr>
<tr>
<td><strong>USB</strong></td>
<td>Support for host/device/OTG mode, protocols (CDC, HID, MSC), built-in or external PHY.</td>
<td>
<code>STM32F103</code> – USB FS device<br/>
<code>STM32H7</code> – HS + FS, OTG<br/>
<code>ESP32S3</code> – USB OTG (host + device)
</td>
</tr>
<tr>
<td><strong>Wi-Fi / BLE</strong></td>
<td>Version support (BLE 4.2/5.0), co-existence, built-in stack or external module.</td>
<td>
<code>ESP32S3</code> – Wi-Fi 2.4 GHz, BLE 5.0<br/>
<code>nRF52840</code> – BLE 5.3, Thread/Zigbee<br/>
<code>STM32WB</code> – STM32 + BLE on a single chip
</td>
</tr>
<tr>
<td><strong>RTC / WDT / Power</strong></td>
<td>External quartz support, wakeup from sleep, low power, independence from system clock.</td>
<td>
<code>STM32L4</code> – RTC + deep sleep<br/>
<code>ESP32</code> – ULP core, wake-on-touch<br/>
<code>AVR</code> – the simplest WDT, deep sleep with interrupts
</td>
</tr>
<tr>
<td><strong>Specialized</strong></td>
<td>PIO, machine vision, crypto modules, LED drivers, graphic accelerators, LCD controllers.</td>
<td>
<code>RP2040</code> – 2 PIO blocks<br/>
<code>ESP32S3</code> – AI acceleration + LCD controller<br/>
<code>STM32H7</code> – ChromART GPU, JPEG decoder
</td>
</tr>
</tbody>
</table>

## 💡 Usage examples

| Device | Peripherals involved |
| ----------------- | ---------------------------------------------------------- |
| Smart lamp | GPIO, PWM, UART (for BLE), ADC (for light sensor) |
| Weather station | I2C (sensors), ADC (analog sensors), UART (screen), RTC |
| Robot on wheels | PWM (motors), UART (Bluetooth), SPI (IMU), GPIO |
| Oscilloscope on MCU | ADC, DMA, SPI display, USB |

---

## 🚀 Tips for working with peripherals

* Use **HAL libraries** or **register access** depending on the task.
* Always **initialize peripherals correctly**: setting up pins, frequencies, interrupts.
* **Handle errors**: buffer overflows, loss of synchronization, etc.
* **Use the datasheet** of the microcontroller - everything is described there in detail.