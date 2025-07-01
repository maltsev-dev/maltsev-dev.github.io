+++
title = "Debugging firmware"
date = "2025-07-01"

[taxonomies]
tags = ["rust", "embedded", "basic"]
+++

Classic software development is always inside the cycle of write - run - check - fix.  
In classic systems, debugging is simplified by built-in logs, breakpoints and step-by-step code execution directly in the IDE.  

When developing programs for microcontrollers, debugging is significantly more complicated since the code is written on a PC and executed on a device with a completely different architecture.  
Obtaining debug information, setting breakpoints, accessing registers and local variables require a special environment and integration of tools, and the process itself becomes much less obvious.  
🟠 In this article I want to describe the standard process when debugging software running on a microcontroller and describe the tools that play a key role in this.

<!-- more -->
---

# &emsp;&emsp;&emsp; 🏗️ Debug Interfaces

## JTAG (Joint Test Action Group)
- standard serial port for testing and debugging ([JTAG - Wikipedia](https://en.wikipedia.org/wiki/JTAG#:~:text=JTAG%20,testing%20%2078%20after%20manufacture)).  
Since 1990, an industry standard (IEEE 1149.1) for testing electronics.  
Can use 4 or 5 lines:
* `TDI` (test data input )
* `TDO` (test data output)
* `TCK` (test clock)
* `TMS` (test mode select )
* `TRST` (test reset) line optional
With these lines, you can write a program image to memory, receive debug messages, read the internal state, stop and step through the code.  
Provides access to the internal registers and memory of the chip for debugging.  

## SWD (Serial Wire Debug) 
- alternative **2-pin** ARM debug interface ([Serial Wire Debug (SWD) Issue #785 riscv/riscv-debug-spec GitHub](https://github.com/riscv/riscv-debug-spec/issues/785#:~:text=Serial%20Wire%20Debug%20,same%20JTAG%20protocol%20on%20top)).  
Similar to JTAG, but uses only `SWDIO` and `SWCLK` lines, saving MCU pins.

# &emsp;&emsp;&emsp; ⚒️ Debugging tools
## 📟 Hardware
* Connect to the device via **JTAG** (4-5 lines) or **SWD** (2 lines).
| **Tool** | **Protocol** | **Target platforms** |
|----------------------|--------------|------------------------------|
| **Black Magic Probe**| SWD/JTAG | General-purpose (ARM, RISC-V) |
| **ST-Link** | SWD | STM32 |
| **J-Link** | SWD/JTAG | Multi-platform |
| **Rusty Probe** | SWD | Specialized for Rust |

## 💽 Software
### 🖥️ Servers
#### OpenOCD (Open On Chip Debugger)
- `OpenOCD`: An open source tool for debugging, testing and programming embedded systems, providing an interface between the **host** and the **hardware**, often used with `GDB`.
    * Since 2005, Open Source supports almost every architecture.
    * Until recently, `OpenOCD` paired with the `GDB` debugger was the way you developed your embedded project code.

#### probe-rs
- `probe-rs`: Modern framework for flashing and debugging microcontrollers. Works as an alternative to OpenOCD (supports SWD/JTAG).
    * `probe-rs-cli` — allows flashing a binary and reading memory via a USB debugger.
    * `cargo-embed` — Combines assembly, flashing via `probe-rs`, logging via `RTT` and connecting to `GDB`. (`cargo embed --chip STM32F103` will upload the program to the board and start outputting in the console.)
    * `probe-rs-tools`

### 🔬 Debuggers
- `GDB`: General-purpose debugger for examining program state, setting breakpoints/checkpoints, and inspecting memory and registers.  
Can connect to built-in targets via `OpenOCD` or `probe-rs`.  
Supports Rust-specific debugging (pretty printing, IDE integration).  

# &emsp;&emsp;&emsp; 📐 Logging
## defmt
- `[defmt](https://crates.io/crates/defmt)` (deferred formatting): an efficient logging framework for embedded systems:  
    * Formats logs on the host, passing only indexes and values ​​from the device.
    * Integrates with GDB, suitable for real-time debugging.
    * Part of the Knurling-rs project.

- `[defmt-rtt](https://crates.io/crates/defmt-rtt)` — transport layer for `defmt`:  
    * Uses **RTT** (Real-Time Transfer) for fast log transfer.
    * Uses macros (`defmt::info!`, `defmt::error!`) with lazy formatting.
    * Minimizes the load on **MCU**, saving useful data for analysis on the **host** side.
    * This approach provides compact and fast debug messages without performance losses.

```rust
use panic_probe as _;
use defmt_rtt as _;

#[panic_handler]
fn panic(info: &core::panic::PanicInfo) -> ! {
    defmt::error!("PANIC: {}", defmt::Display2Format(info));
    loop {}
}
```

## rtt 
- [rtt-target](https://crates.io/crates/rtt-target)  

Low-level library for direct RTT logging.
Allows writing strings directly to the RTT buffer without additional logic.
* no built-in formatting on the host,
* higher load on the **MCU**,
* strings are transmitted as is - takes up more memory and traffic.

```toml
[dependencies]
rtt-target = "0.6.0"
```

```rust
use rtt_target::{rtt_init_print, rprintln};

rtt_init_print!();
rprintln!("\nREAD from address 0x1B");
```

In VS Code, you can install the “Debugger for probe-rs” extension.  
Then open the project and start debugging by pressing `F5` – it uses `probe-rs` to flash and run the application.  
This approach allows you to see the `defmt`/`RTT` output directly in the VSCode console.


# Debugging memory in Embedded Rust
* **Memory inspection** via `GDB`: access to variables, registers and memory areas (print, `x/10x 0x...`). Memory is defined in memory.x.
* **Linker errors**: check that `memory.x` matches the chip configuration.
* **Reading registers**: include .svd to correctly display peripherals.

Despite Rust's safety, `unsafe` blocks are often necessary for low-level work. They should be checked manually and supplemented with static analysis (**Clippy**, **Miri**) and profiling (high-water marks) for reliability and optimal memory usage.  

This approach combines Rust's compile-time safety with analysis tools, ensuring high stability of embedded software.  

# &emsp;&emsp;&emsp; 🔄 Typical workflow
1. Write code → add `rprintln!()` for logs.  
2. `cargo build` → `cargo flash --chip ...`  
3. Run `probe-rs run --gdb` in the background.  
4. Connect VS Code/GDB → set breakpoints → run.  
5. Analyze variables/logs → fix error → repeat.  
6. In case of panic → look at call stack and RTT logs.  

| Stage | Tools | Flow | Point |
|:-------------------|:---------------------------------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Development** | rustc + cargo </br> embedded-hal, rtt-target, panic-halt, etc | #![no_std]</br> #![no_main] | `no_std` disables the standard library. </br> `panic_handler` catches panics (will not compile without it). </br> `RTT/defmt` add a channel for logging. |
| **Compilation** | - `cargo` + target toolchain (e.g. `thumbv7em-none-eabihf`) </br> - `probe-rs` (or `cargo-binutils`) | `cargo build --target thumbv7em-none-eabihf` (Build with debug symbols) </br> `cargo objcopy --bin app -- -O binary firmware.bin` (Convert to .bin for flashing) | * Toolchain (`thumbv7...`) generates code for a specific ARM Cortex-M processor. </br> * `objcopy` creates a binary image for the bootloader. |U. |
| **Flashing** | **Hardware:** ST-Link, J-Link, Black Magic Probe </br> **Software:** `probe-rs`, `openocd`, `cargo-flash` | `probe-rs download --chip STM32F411CEUx firmware.bin`(Firmware the binary onto the device) </br> `cargo flash --chip STM32F411CEUx`(Or one command (build + firmware)) | `probe-rs` works directly with debug probes without configs. </br> Specify the exact chip model (`--chip`) to avoid errors. |
| **Debugging** | **Debugging server:** `probe-rs`/`openocd` </br> **Client:** GDB (`arm-none-eabi-gdb`) + IDE (VS Code) | 1. Run the server `probe-rs run --gdb` on `:1337` port<br/> 2. Connect GDB `arm-none-eabi-gdb target/thumbv7em-none-eabihf/debug/app` <br/> `(gdb) target extended-remote :1337`<br/>`(gdb) break main # Set a breakpoint`<br/>`(gdb) continue # Start execution` <br/>`(gdb) print _x # Look at the variable`<br/> 3. **Or in VS Code (via Cortex-Debug)** | GDB allows you to step through the code, look at variables. <br/> VS Code provides a visual interface for breakpoints, call stack. |
| **Diagnostics** | - **RTT Viewer** (SEGGER J-Link) <br/> - **defmt-print** <br/>- **GDB commands** | 1. RTT logs `probe-rs rtt --chip STM32F411CEUx` - output `Debug value: 42` <br/> 2. Memory analysis in GDB:<br/>`(gdb) x/16x 0x20000000 # View RAM`<br/>`(gdb) p &_x # Variable address`<br/>3. **View registers:**<br/>In VS Code: via `.svd` file (Peripherals panel). <br/> In GDB: `info registers`. | RTT shows real-time logs without UART. <br/> Memory viewing helps find data corruption. <br/> Registers indicate the state of peripherals (GPIO, UART, etc.). |
| **Panic Handling** | - `panic-probe` + `defmt` <br/>GDB backtrace | For **panic with backtrace:** Always include `debug=2` in `Cargo.toml`.

* Automate builds in VS through `tasks.json`.
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

## Key Points

- **RTT instead of UART:** No extra pins needed, works at any speed.
- **probe-rs > OpenOCD:** Easier installation, better integration with Rust.
- **defmt for complex projects:** Compressed logs, formatting structures.
- **SVD files:** Automate register viewing in the IDE.