+++
title = "MCU Synchronization"
date = "2025-07-16"

[taxonomies]
tags = ["embedded", "basic", "clock", "timers", "interrupts"]
+++

🟠 **Synchronization** is a fundamental concept that ensures that the processor, peripherals, timers, and interrupts operate in a consistent and accurate manner based on a common clock source.

<!-- more -->
---

## 🔁 How to achieve synchronization
[Clocks](https://maltsev-dev.github.io/emb-clock/) provide the basis for [timers](https://maltsev-dev.github.io/emb-timers/) to work, and timers, in turn, generate [interrupts](https://maltsev-dev.github.io/emb-interrupt/) to perform tasks with precise timing control.

### 1. **Clock System**

* Main synchronization source.
* Provides a basic clock signal, which all other blocks are guided by.
* Via `dividers` and `PLL`, generates the required frequencies for:
    * CPU
    * Buses (AHB/APB)
    * Timers, UART, SPI, etc.

* **Clock setup**:
    - Always check `SYSCLK`, `HCLK`, `PCLK` frequencies in the datasheet.
    - Use `PLL` to **increase** the frequency if high performance is required.
    - If the clock source (e.g. RC oscillator) is unstable, timers may give inaccurate intervals, which is critical for TinyML (e.g. for audio processing) - use an external crystal or calibrate the RC oscillator.

### 2. **Timers**

* Convert a **clock signal** into a **time interval**.
* Count time, generate periodic signals (e.g. PWM), synchronize task launches.
* Interconnected with the `Clock System` via prescalers.

- **Timer optimization**:
    - Choose a timer with the required resolution (`16` or `32 bits`) depending on the task.
    - Use `DMA` to transfer data from the timer.
    - If the timer counter is too small (e.g. 16 bits), it may overflow at **low frequencies** - use `32-bit` timers or increase the **prescaler**.

### 3. **Interrupts**

* Allow the system to respond to events `strictly on time` (for example, triggering every 10 ms).
* Serve as a mechanism for "interrupting" the main thread at the moment an important event is triggered.
* Timers often initialize interrupts (for example, when a counter overflows).

* **Interrupts Settings**:
    - Minimize code in `ISR` (interrupt handler) by pushing complex tasks to the main program via flags or queues.
    - Use `cortex-m::interrupt::free` for safe access to shared resources.
    - If multiple interrupts (e.g. timer and UART) fire at the same time, there may be a delay - set priorities via `NVIC` (Nested Vectored Interrupt Controller).

---

## 🧩 How does it all work together?

1. The **clock** generates a stable clock signal (e.g. 12 MHz).
2. This signal is sent to the **timer**, which counts ticks, decreasing (or increasing) the counter.
3. When the counter reaches a threshold, the **timer** generates an **interrupt**.
4. The **interrupt** calls **ISR**, and the code reacts - starts a task, updates data, wakes up the device, etc.
5. The cycle repeats.

This cycle allows you to accurately start tasks, without the main code.