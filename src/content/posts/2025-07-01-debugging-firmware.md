---
title: "Debugging firmware"
date: "2025-07-01"
tags: ["rust", "embedded", "basic"]
---
Software development runs in a cycle: write, run, check, fix. On a desktop, debugging is simplified by built-in logs, breakpoints and step-by-step code execution directly in the IDE.

When developing programs for microcontrollers, debugging is more complicated, since the code is written on a PC and executed on a device with a completely different architecture. Obtaining debug information, setting breakpoints, accessing registers and local variables require a special environment and integration of tools, and the process itself becomes much less obvious.

The standard process for debugging software running on a microcontroller goes through a debug probe, a server, a client and a logging channel, and each of those has its own tooling.

## JTAG
JTAG (Joint Test Action Group) is a standard serial port for testing and debugging ([JTAG - Wikipedia](https://en.wikipedia.org/wiki/JTAG#:~:text=JTAG%20,testing%20%2078%20after%20manufacture)). Since 1990 it has been an industry standard (IEEE 1149.1) for testing electronics.

It can use 4 or 5 lines:
- `TDI` (test data input)
- `TDO` (test data output)
- `TCK` (test clock)
- `TMS` (test mode select)
- `TRST` (test reset), optional

With these lines you can write a program image to memory, receive debug messages, read the internal state, and stop and step through the code. They provide access to the internal registers and memory of the chip for debugging.

## SWD
SWD (Serial Wire Debug) is an alternative **2-pin** ARM debug interface ([Serial Wire Debug (SWD) Issue #785 riscv/riscv-debug-spec GitHub](https://github.com/riscv/riscv-debug-spec/issues/785#:~:text=Serial%20Wire%20Debug%20,same%20JTAG%20protocol%20on%20top)). It is similar to JTAG, but uses only `SWDIO` and `SWCLK` lines, which saves MCU pins.

## Hardware
You connect to the device via **JTAG** (4-5 lines) or **SWD** (2 lines).

| Tool | Protocol | Target platforms |
|---|---|---|
| Black Magic Probe | SWD/JTAG | General-purpose (ARM, RISC-V) |
| ST-Link | SWD | STM32 |
| J-Link | SWD/JTAG | Multi-platform |
| Rusty Probe | SWD | Specialized for Rust |

## Software

### Servers

#### OpenOCD (open on-chip debugger)
`OpenOCD` is an open source tool for debugging, testing and programming embedded systems, providing an interface between the **host** and the **hardware**, and is often used with `GDB`.
- Since 2005, Open Source support covers almost every architecture.
- Until recently, `OpenOCD` paired with the `GDB` debugger was the way you developed your embedded project code.

#### probe-rs
`probe-rs` is a modern framework for flashing and debugging microcontrollers. It works as an alternative to OpenOCD and supports SWD/JTAG.
- `probe-rs-cli` allows flashing a binary and reading memory via a USB debugger.
- `cargo-embed` combines assembly, flashing via `probe-rs`, logging via `RTT` and connecting to `GDB`. (`cargo embed --chip STM32F103` will upload the program to the board and start outputting in the console.)
- `probe-rs-tools`

### Debuggers
`GDB` is a general-purpose debugger for examining program state, setting breakpoints/checkpoints, and inspecting memory and registers. It can connect to built-in targets via `OpenOCD` or `probe-rs`, and it supports Rust-specific debugging (pretty printing, IDE integration).

## defmt
[defmt](https://crates.io/crates/defmt) (deferred formatting) is an efficient logging framework for embedded systems.
- Formats logs on the host, passing only indexes and values from the device.
- Integrates with GDB, suitable for real-time debugging.
- Part of the Knurling-rs project.

[defmt-rtt](https://crates.io/crates/defmt-rtt) is the transport layer for `defmt`.
- Uses **RTT** (Real-Time Transfer) for fast log transfer.
- Uses macros (`defmt::info!`, `defmt::error!`) with lazy formatting.
- Minimizes the load on the **MCU**, saving useful data for analysis on the **host** side.
- This approach provides compact and fast debug messages without performance losses.

```rust
use panic_probe as _;
use defmt_rtt as _;

#[panic_handler]
fn panic(info: &core::panic::PanicInfo) -> ! {
    defmt::error!("PANIC: {}", defmt::Display2Format(info));
    defmt::info!("Hello from probe-rs!");
    loop {}
}
```

## rtt
[rtt-target](https://crates.io/crates/rtt-target) is a low-level library for direct RTT logging. It allows writing strings directly to the RTT buffer without additional logic.
- no built-in formatting on the host
- higher load on the **MCU**
- strings are transmitted as is, which takes up more memory and traffic

```toml
[dependencies]
rtt-target = "0.6.0"
```

```rust
use rtt_target::{rtt_init_print, rprintln};

rtt_init_print!();
rprintln!("\nREAD from address 0x1B");
```

In VS Code you can install the "Debugger for probe-rs" extension. Then open the project and start debugging by pressing `F5`. It uses `probe-rs` to flash and run the application, and the `defmt`/`RTT` output appears directly in the VSCode console.

## Debugging memory in embedded Rust
- Memory inspection via `GDB`: access to variables, registers and memory areas (print, `x/10x 0x...`). Memory is defined in memory.x.
- Linker errors: check that `memory.x` matches the chip configuration.
- Reading registers: include .svd to correctly display peripherals.

Despite Rust's safety, `unsafe` blocks are often necessary for low-level work. They should be checked manually and supplemented with static analysis (**Clippy**, **Miri**) and profiling (high-water marks) for reliability and optimal memory usage. This approach combines Rust's compile-time safety with analysis tools, which keeps the embedded software stable.

## Typical workflow
1. Write code and add `rprintln!()` for logs.
2. `cargo build`, then `cargo flash --chip ...`
3. Run the server `probe-rs run --gdb` in the background.
4. Connect VS Code/GDB, set breakpoints, run.
5. Analyze variables/logs, fix the error, repeat.
6. In case of panic, look at the call stack and the RTT logs.

| Stage | Tools | Flow | Point |
|---|---|---|---|
| 1. Development | rustc + cargo<br>embedded-hal<br>rtt-target<br>panic-halt, etc | `#![no_std]`<br>`#![no_main]` | `no_std` disables the standard library.<br>`panic_handler` is required.<br>RTT/defmt adds a logging channel. |
| 2. Compilation | cargo + target toolchain (e.g. `thumbv7em-none-eabihf`)<br>probe-rs / cargo-binutils | `cargo build --target thumbv7em-none-eabihf`<br>`cargo objcopy --bin app -- -O binary firmware.bin` | The toolchain generates code for a specific Cortex-M.<br>objcopy creates the firmware image. |
| 3. Flashing | Hardware: ST-Link, J-Link, Black Magic Probe<br>Software: probe-rs, openocd, cargo-flash | `probe-rs download --chip STM32F411CEUx firmware.bin`<br>`cargo flash --chip STM32F411CEUx` | probe-rs works without config files.<br>Use `--chip` to match the target MCU. |
| 4. Debugging | Server: probe-rs / openocd<br>Client: GDB, Cortex-Debug (VS Code) | 1. Run the server `probe-rs run --gdb`<br>2. Connect GDB `gdb target/thumbv7em-none-eabihf/debug/app`<br>`(gdb) target extended-remote :1337`<br>`(gdb) break main`<br>`(gdb) continue`<br>`(gdb) print _x`<br>3. Or use VS Code. | GDB enables stepping and variable inspection.<br>VS Code offers a GUI for debugging. |
| 5. Diagnostics | RTT Viewer (J-Link)<br>defmt-print<br>GDB commands | 1. RTT logs `probe-rs rtt --chip STM32F411CEUx`<br>2. GDB memory:<br>- `x/16x 0x20000000`<br>- `p &_x`<br>3. View registers:<br>- In VS Code via .svd<br>- In GDB: `info registers` | RTT provides real-time logs.<br>The memory view helps detect corruption.<br>Registers show peripheral states. |
| 6. Panic handling | panic-probe + defmt<br>GDB backtrace | Enable backtrace: set `debug = 2` in `Cargo.toml` | Allows debugging the panic location with full context. |

Automate builds in VS through `tasks.json`.
```json
// .vscode/launch.json
{
  "type": "cortex-debug",
  "servertype": "probe-rs",
  "executable": "target/.../app",
  "request": "launch",
  "device": "STM32F411CEUx"
}
```

## Key points
RTT is worth preferring over UART: it needs no extra pins and works at any speed. probe-rs is easier to install than OpenOCD and integrates better with Rust. defmt earns its place on complex projects, with compressed logs and formatting for structures. SVD files let the IDE show registers without you looking them up.
