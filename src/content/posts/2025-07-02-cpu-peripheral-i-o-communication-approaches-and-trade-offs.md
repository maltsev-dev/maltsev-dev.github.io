---
title: "CPU–Peripheral I/O Communication: Approaches and Trade-offs"
date: "2025-07-02"
tags: ["embedded", "basic", "cpu"]
---

🟠 Data Transmission Between CPU and Peripheral Devices via I/O Methods

A microcontroller talks to its peripherals through one of a small number of I/O models, and the choice decides how much of the CPU's time the transfer costs, how quickly the peripheral gets serviced, and how much code the driver needs. Below are the six approaches: what each one does, how often it is used, what it buys you, what it costs you, and the tools that implement it on real hardware.

## MMIO (memory-mapped I/O)

**Description.** Peripherals are mapped into the memory space; accessed via standard load/store instructions.

**Usage frequency.** ~90% in microcontrollers (`ARM`, `RISC-V`, etc.).

**Advantages**
- Simple programming model
- Works on most architectures (`ARM`, `RISC-V`, `x86`, `MIPS`)
- High performance
- Unified memory and peripheral addressing
- Easy access via standard Rust code (`unsafe` with `volatile`)

**Disadvantages**
- CPU can be busy polling
- Requires memory protection (`MPU`/`MMU`) in complex systems
- Needs care with caching (often regions marked as `non-cacheable`)
- Address layout can get complex in large SoCs

**Tools / crates.** `cortex-m`, `riscv`, `volatile-register`, `peripheral`

## PMIO (port-mapped I/O)

**Description.** Uses a separate `I/O` address space and dedicated instructions like `in` / `out`.

**Usage frequency.** Primarily x86.

**Advantages**
- Strict separation of memory and I/O
- Supported by legacy PC hardware

**Disadvantages**
- Non-portable (requires special instructions)
- Not supported on modern microcontrollers

**Tools / crates.** Not **applicable in Rust** embedded; mostly C/ASM for x86

## PIO (programmed I/O)

**Description.** CPU directly polls the peripheral registers status (via `MMIO` or `PMIO`) in a loop.

**Usage frequency.** Very common in simple or early-stage systems.

**Advantages**
- Easy to implement
- Works without `interrupts` or `DMA`

**Disadvantages**
- Very inefficient (CPU is fully occupied)
- Poor scalability and power consumption

**Tools / crates.** Any HAL (e.g. `embedded-hal`) with polling read/write

## DMA (direct memory access)

**Description.** Data transfer between peripheral and memory handled by a dedicated DMA controller, not CPU.

**Usage frequency.** Widely used in **high-throughput** peripherals.

**Advantages**
- Offloads CPU
- High-speed data transfer (e.g. `SPI`, `SDIO`, `Ethernet`)
- Enables low-power, autonomous operation

**Disadvantages**
- Setup complexity
- Requires compatible hardware
- Needs careful buffer and interrupt handling

**Tools / crates.** `stm32-dma`, `esp-hal`, `nrf-dma`, manual register config

## Interrupt-driven I/O

**Description.** Peripherals signal the CPU via hardware interrupts to trigger event-driven processing.

**Usage frequency.** Very common in `RTOS` and multitasking environments.

**Advantages**
- Reactive and efficient
- Good for low-latency responses (e.g. buttons, timers)
- Frees CPU from busy-waiting
- Integrates with task scheduling / `RTOS`

**Disadvantages**
- Requires careful handling of race conditions and priority
- May introduce complexity in shared-state management

**Tools / crates.** `#[interrupt]`, `cortex-m-rt`, `riscv-rt`, `RTIC`, `embassy`, `freertos-rust`, `tock`

## Message-based I/O (mailbox, queues)

**Description.** Communication via message passing (mailboxes, channels) typically in multicore `SoCs` or `OS-based systems`.

**Usage frequency.** Used in SMP systems, OS kernels, Linux SoCs.

**Advantages**
- Decouples processing from hardware
- Highly scalable
- Enables safe inter-core or inter-process communication

**Disadvantages**
- Requires advanced OS or firmware
- Increased system complexity

**Tools / crates.** `heapless::spsc`, `embassy-channel`, `tock` IPC, RTOS queues

## The trade-offs

None of these methods wins outright. `PIO` is the simplest to implement, but it leaves the CPU fully occupied. `DMA` takes the load off the CPU entirely, at the cost of setup complexity and a hard requirement on compatible hardware. Interrupt-driven I/O gives low-latency, event-driven behavior, but asks you to handle race conditions and shared state carefully. Message-based I/O decouples processing from hardware and scales well, but assumes an OS or firmware with a scheduler to carry the messages. `MMIO` is the default on modern microcontrollers; `PMIO` survives mainly in legacy x86 designs.
