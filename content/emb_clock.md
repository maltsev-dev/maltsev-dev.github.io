+++
title = "MCU Clock System"
date = "2025-07-15"

[taxonomies]
tags = ["embedded", "basic", "clock"]
+++

🟠 **Clock is the basis for timers and interrupts**
The clock system sets the pace of all digital components of the microcontroller. Timers use its signals to generate interrupts and perform tasks with precise time control.

<!-- more -->
---

## ⏱ What is a clock in an MCU?

A clock is not primarily about "`time`" - it is a system that generates clock signals to `synchronize` the CPU and peripheral modules (timers, UART, ADC, etc.). The frequency of the clock signal determines how fast the MCU executes instructions and processes events.  
MCU components usually operate at different frequencies and need to be synchronized to perform operations at the same time.  

A simple digital signal switches between high and low levels at a certain **frequency** (in Hertz).  
Frequency is the number of events that occur per unit of time, usually per second.  
- 1 Hz = 1 switching per second
- 1 MHz = 1 million switchings per second
    
**Important:** High frequency provides performance, but increases power consumption and heat generation. Therefore, peripheral devices often operate at a lower frequency.


## ⚙️ How do clocks work?

The most common clock generator is the **quartz crystal**.  
It is used because it can vibrate at a stable frequency (the resonant frequency) when voltage is applied to it.  

One of the disadvantages of a quartz crystal is that it is usually limited to generating a single frequency in the megahertz range. On complex boards, this can be a problem, since different components often operate at different frequencies and at much higher speeds. To solve the problem of having to use multiple frequencies on a single board, designers often use a PLL and prescalers.  

To obtain different frequencies, use:  

- **PLL (phase-locked loop)** - a circuit that creates a desired frequency from a base signal (for example, 1 GHz from 100 MHz). It is used to obtain high and accurate clock signals from a limited number of resonators.  

- **Prescalers** - reduce the frequency for individual modules.


## 🔧 Clock system components

- **Clock sources**
    - Internal RC oscillator (less accurate, but energy-saving)
    - External quartz (high stability)
    - PLL — frequency multiplication

- **Dividers and prescalers**
Allow you to set the desired frequency for each block

- **System clock (SYSCLK)**
Main processor clock signal

- **Peripheral clock**
Frequency division between modules (e.g. AHB, APB in STM32)


## ⌚ Clock types
Clocks are also used for their usual function - `keeping time`. There are 2 types of clocks for this purpose:
- **RTC (Real-Time Clock)**
Hardware clock that works even when the power is off (from the battery).
Used for accurate real-time counting.

- **System Clock**
Virtual clock, monitored by the OS, initialized at startup (usually from the RTC).
    

## 🛠 Example of clocks setup in Rust (RP2040)

```rust
use rp2040_hal as hal;
const XTAL_FREQ_HZ: u32 = 12_000_000;

let mut watchdog = hal::Watchdog::new(pac.WATCHDOG);

let clocks = hal::clocks::init_clocks_and_plls(
    XTAL_FREQ_HZ,
    pac.XOSC,
    pac.CLOCKS,
    pac.PLL_SYS,
    pac.PLL_USB,
    &mut pac.RESETS,
    &mut watchdog,
).unwrap();
```

## ⚡ Communicating with interrupts

- Timers receive their frequency from the system clock and use it to accurately generate interrupts.
- Without proper frequency settings, timers may work with errors or become unstable.
- Some interrupts (e.g. Watchdog) use independent clock sources (e.g. **LSI** in STM32).