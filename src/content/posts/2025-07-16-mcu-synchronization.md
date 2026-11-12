---
title: "MCU Synchronization"
date: "2025-07-16"
tags: ["embedded", "basic", "clock", "timers", "interrupts"]
---
Synchronization is what keeps the processor, the peripherals, the timers and the interrupts operating in a consistent and accurate manner, based on a common clock source.

## How to achieve synchronization

[Clocks](/blog/2025-07-15-mcu-clock-system/) provide the basis for [timers](/blog/2025-07-14-timers/) to work, and timers, in turn, generate [interrupts](/blog/2025-07-15-interrupts-isr-ivt-nvic/) to perform tasks with precise timing control.

### 1. Clock system

The main synchronization source. It provides a basic clock signal, which all other blocks are guided by. Via `dividers` and `PLL`, it generates the required frequencies for:

- CPU
- Buses (AHB/APB)
- Timers, UART, SPI

Clock setup:

- Always check `SYSCLK`, `HCLK`, `PCLK` frequencies in the datasheet.
- Use `PLL` to increase the frequency if high performance is required.
- If the clock source, for example an RC oscillator, is unstable, timers may give inaccurate intervals. That is critical for TinyML, for example for audio processing, so use an external crystal or calibrate the RC oscillator.

### 2. Timers

Timers convert a clock signal into a time interval. They count time, generate periodic signals such as PWM, and synchronize task launches. They are interconnected with the clock system via prescalers.

Timer optimization:

- Choose a timer with the required resolution (`16` or `32` bits) depending on the task.
- Use `DMA` to transfer data from the timer.
- If the timer counter is too small, for example 16 bits, it may overflow at low frequencies. Use `32-bit` timers or increase the prescaler.

### 3. Interrupts

Interrupts allow the system to respond to events strictly on time, for example triggering every 10 ms. They are the mechanism for interrupting the main thread at the moment an important event is triggered. Timers often initialize interrupts, for example when a counter overflows.

Interrupt settings:

- Minimize code in `ISR` by pushing complex tasks to the main program via flags or queues.
- Use `cortex-m::interrupt::free` for safe access to shared resources.
- If multiple interrupts, for example a timer and a UART, fire at the same time, there may be a delay. Set priorities via `NVIC` (Nested Vectored Interrupt Controller).

## How it all works together

1. The clock generates a stable clock signal, for example 12 MHz.
2. This signal is sent to the timer, which counts ticks, decreasing or increasing the counter.
3. When the counter reaches a threshold, the timer generates an interrupt.
4. The interrupt calls the `ISR`, and the code reacts: it starts a task, updates data, wakes up the device.
5. The cycle repeats.

This cycle allows you to start tasks accurately, without the main code.
