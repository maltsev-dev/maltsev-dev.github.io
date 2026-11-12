---
title: "CPU and Peripheral I/O Communication: Approaches and Trade-offs"
date: "2025-07-02"
tags: ["embedded", "basic", "cpu"]
---
A microcontroller talks to its peripherals through one of a small number of I/O models, and the choice decides how much of the CPU's time the transfer costs, how quickly the peripheral gets serviced, and how much code the driver needs.

The six are MMIO, PMIO, programmed I/O, DMA, interrupt-driven I/O and message-based I/O.

## MMIO
Peripherals are mapped into the memory space and accessed with standard load/store instructions. About 90% of microcontrollers work this way (`ARM`, `RISC-V`, etc.).

The advantages are a simple programming model, operation on most architectures (`ARM`, `RISC-V`, `x86`, `MIPS`), high performance, unified memory and peripheral addressing, and easy access from standard Rust code (`unsafe` with `volatile`).

The disadvantages are that the CPU can end up busy polling, that complex systems need memory protection (`MPU`/`MMU`), that caching needs care (regions are often marked as `non-cacheable`), and that the address layout gets complicated in large SoCs.

Tools and crates: `cortex-m`, `riscv`, `volatile-register`, `peripheral`.

## PMIO
PMIO (port-mapped I/O) uses a separate `I/O` address space and dedicated instructions like `in` / `out`. It is primarily an x86 thing.

The advantages are a strict separation of memory and I/O, and support in legacy PC hardware. The disadvantages are that it is not portable, since it requires special instructions, and that modern microcontrollers do not support it.

This is not **applicable in Rust** embedded; it is mostly C and assembly for x86.

## PIO
With programmed I/O the CPU directly polls the peripheral register status, via `MMIO` or `PMIO`, in a loop. It is very common in simple or early-stage systems.

The advantages are that it is easy to implement and that it works without `interrupts` or `DMA`. The disadvantages are that it is very inefficient, since the CPU is fully occupied, and that it scales poorly and costs power.

Any HAL with polling read/write will do, for example `embedded-hal`.

## DMA
A dedicated DMA controller handles the data transfer between the peripheral and memory, not the CPU. It is widely used in **high-throughput** peripherals.

The advantages are that it offloads the CPU, that it gives high-speed data transfer (e.g. `SPI`, `SDIO`, `Ethernet`), and that it enables low-power, autonomous operation. The disadvantages are setup complexity, a requirement for compatible hardware, and the need for careful buffer and interrupt handling.

Tools and crates: `stm32-dma`, `esp-hal`, `nrf-dma`, manual register config.

## Interrupt-driven I/O
Peripherals signal the CPU via hardware interrupts, which triggers event-driven processing. It is very common in `RTOS` and multitasking environments.

The advantages are that it is reactive and efficient, that it fits low-latency responses (e.g. buttons, timers), that it frees the CPU from busy-waiting, and that it integrates with task scheduling and the `RTOS`. The disadvantages are the need for careful handling of race conditions and priority, and the complexity it adds to shared-state management.

Tools and crates: `#[interrupt]`, `cortex-m-rt`, `riscv-rt`, `RTIC`, `embassy`, `freertos-rust`, `tock`.

## Message-based I/O
Communication goes through message passing (mailboxes, channels), typically in multicore `SoCs` or `OS-based systems`. It is used in SMP systems, OS kernels and Linux SoCs.

The advantages are that processing is decoupled from the hardware, that it scales well, and that it enables safe inter-core or inter-process communication. The disadvantages are that it requires an advanced OS or firmware and that it increases system complexity.

Tools and crates: `heapless::spsc`, `embassy-channel`, `tock` IPC, RTOS queues.

## The trade-offs
None of these methods wins outright. `PIO` is the simplest to implement, but it leaves the CPU fully occupied. `DMA` takes the load off the CPU entirely, at the cost of setup complexity and a hard requirement on compatible hardware. Interrupt-driven I/O gives low-latency, event-driven behavior, but asks you to handle race conditions and shared state carefully. Message-based I/O decouples processing from hardware and scales well, but assumes an OS or firmware with a scheduler to carry the messages. `MMIO` is the default on modern microcontrollers; `PMIO` survives mainly in legacy x86 designs.
