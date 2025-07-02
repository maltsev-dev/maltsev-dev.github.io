+++
title = "CPU–Peripheral I/O Communication: Approaches and Trade-offs"
date = "2025-07-02"

[taxonomies]
tags = ["embedded", "basic", "cpu"]
+++ 

🟠 Data Transmission Between CPU and Peripheral Devices via I/O Methods

<!-- more -->

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
      <th>Method</th>
      <th>Description</th>
      <th>Usage Frequency</th>
      <th>✅ Advantages</th>
      <th>❌ Disadvantages</th>
      <th>🛠️ Tools / Crates</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>MMIO (Memory-Mapped I/O)</strong></td>
      <td>Peripherals are mapped into the memory space; accessed via standard load/store instructions.</td>
      <td>~90% in microcontrollers (`ARM`, `RISC-V`, etc.)</td>
      <td>
        - Simple programming model<br>
        - Works on most architectures (`ARM`, `RISC-V`, `x86`, `MIPS`)<br>
        - High performance<br>
        - Unified memory and peripheral addressing<br>
        - Easy access via standard Rust code (`unsafe` with `volatile`)
      </td>
      <td>
        - CPU can be busy polling<br>
        - Requires memory protection (`MPU`/`MMU`) in complex systems<br>
        - Needs care with caching (often regions marked as `non-cacheable`)<br>
        - Address layout can get complex in large SoCs
      </td>
      <td>
        <code>cortex-m</code>, <code>riscv</code>, <code>volatile-register</code>, <code>peripheral</code>
      </td>
    </tr>
    <tr>
      <td><strong>PMIO (Port-Mapped I/O)</strong></td>
      <td>Uses a separate `I/O` address space and dedicated instructions like <code>in</code> / <code>out</code>.</td>
      <td>Primarily x86</td>
      <td>
        - Strict separation of memory and I/O<br>
        - Supported by legacy PC hardware
      </td>
      <td>
        - Non-portable (requires special instructions)<br>
        - Not supported on modern microcontrollers
      </td>
      <td>
        Not **applicable in Rust** embedded; mostly C/ASM for x86
      </td>
    </tr>
    <tr>
      <td><strong>PIO (Programmed I/O)</strong></td>
      <td>CPU directly polls the peripheral registers status (via `MMIO` or `PMIO`) in a loop.</td>
      <td>Very common in simple or early-stage systems</td>
      <td>
        - Easy to implement<br>
        - Works without `interrupts` or `DMA`
      </td>
      <td>
        - Very inefficient (CPU is fully occupied)<br>
        - Poor scalability and power consumption
      </td>
      <td>
        Any HAL (e.g. <code>embedded-hal</code>) with polling read/write
      </td>
    </tr>
    <tr>
      <td><strong>DMA (Direct Memory Access)</strong></td>
      <td>Data transfer between peripheral and memory handled by a dedicated DMA controller, not CPU.</td>
      <td>Widely used in **high-throughput** peripherals</td>
      <td>
        - Offloads CPU<br>
        - High-speed data transfer (e.g. `SPI`, `SDIO`, `Ethernet`)<br>
        - Enables low-power, autonomous operation
      </td>
      <td>
        - Setup complexity<br>
        - Requires compatible hardware<br>
        - Needs careful buffer and interrupt handling
      </td>
      <td>
        <code>stm32-dma</code>, <code>esp-hal</code>, <code>nrf-dma</code>, manual register config
      </td>
    </tr>
    <tr>
      <td><strong>Interrupt-driven I/O</strong></td>
      <td>Peripherals signal the CPU via hardware interrupts to trigger event-driven processing.</td>
      <td>Very common in `RTOS` and multitasking environments</td>
      <td>
        - Reactive and efficient<br>
        - Good for low-latency responses (e.g. buttons, timers)<br>
        - Frees CPU from busy-waiting<br>
        - Integrates with task scheduling / `RTOS`
      </td>
      <td>
        - Requires careful handling of race conditions and priority<br>
        - May introduce complexity in shared-state management
      </td>
      <td>
        <code>#[interrupt]</code>, <code>cortex-m-rt</code>, <code>riscv-rt</code><br>
        <code>RTIC</code>, <code>embassy</code>, <code>freertos-rust</code>, <code>tock</code>
      </td>
    </tr>
    <tr>
      <td><strong>Message-based I/O (mailbox, queues)</strong></td>
      <td>Communication via message passing (mailboxes, channels) typically in multicore `SoCs` or `OS-based systems`.</td>
      <td>Used in SMP systems, OS kernels, Linux SoCs</td>
      <td>
        - Decouples processing from hardware<br>
        - Highly scalable<br>
        - Enables safe inter-core or inter-process communication
      </td>
      <td>
        - Requires advanced OS or firmware<br>
        - Increased system complexity
      </td>
      <td>
        <code>heapless::spsc</code>, <code>embassy-channel</code>, <code>tock</code> IPC, RTOS queues
      </td>
    </tr>
  </tbody>
</table>