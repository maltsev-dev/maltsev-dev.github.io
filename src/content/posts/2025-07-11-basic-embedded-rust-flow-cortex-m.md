---
title: "Basic Embedded Rust Flow (Cortex-M)"
date: "2025-07-11"
description: "A step-by-step template for a Cortex-M Rust project: config.toml, rust-toolchain.toml, memory.x, probe-rs, defmt and the panic handler."
tags: ["rust", "embedded", "basic"]
---
A Rust project for microcontrollers needs a handful of files before it will compile, flash and print something. This is the set I keep coming back to, and the order I set it up in.

| Step | Goal | Result |
|---|---|---|
| Creating a project | Starting with a clean Rust project | Creating a `cargo new` structure with `main.rs` |
| Configuring `.cargo/config.toml` | Specifying target and runner (`probe-rs`, `qemu`, etc.) | Compiling for STM32 and automatically running the firmware |
| Creating `rust-toolchain.toml` | Locking nightly version and components | Unified environment on all machines |
| Add `memory.x` | Detecting microcontroller memory map | Linking works correctly, firmware is loaded |
| Add `Embed.toml` | Configuring `probe-rs` (chip, speed, RTT) | You can flash, run, view `defmt` logs |
| Add dependencies | Connecting HAL, cortex-m, panic, defmt | You can access STM32 peripherals in Rust |
| Implementation of `#[panic_handler]` | Ensuring correct handling of `panic!` | Error-free compilation, correct debugging |
| Definition of `#[entry] fn main()` | Start point of the program | Code runs after reset of the microcontroller |
| Configuring `RTT / semihosting` | Adding text output for debugging | Messages can be printed via `defmt::info!` |
| Interrupt handling | Adding reactions to timers, UART, external events | Interrupts work, you can react to events |
| Compilation and firmware | Checking the entire pipeline | Working STM32 firmware in Rust |

## 1. Project setup

### Project creation

```bash
cargo new --bin my_project
cd my_project
```

### Add target and toolchain

Create file `rust-toolchain.toml`:

```toml
[toolchain]
channel = "nightly-2022-06-28"   # or stable channel = "1.86"
components = ["rust-src", "rustfmt"]
targets = ["thumbv6m-none-eabi"]
```

Create file `.cargo/config.toml`:

```toml
[build]
target = "thumbv6m-none-eabi"

[target.thumbv6m-none-eabi]
rustflags = [
  "-C", "link-arg=--nmagic",
  "-C", "link-arg=-Tlink.x",
  "-C", "link-arg=-Tdefmt.x",
  "-C", "no-vectorize-loops",
]
runner = "elf2uf2-rs -d"   # or another, see below
```

#### QEMU runner

```toml
runner = """
  qemu-system-arm \
  -cpu cortex-m3 \
  -machine lm3s6965evb \
  -nographic \
  -semihosting-config enable=on,target=native
"""
```

#### probe-rs runner
```toml
runner = "probe-rs run"
```

#### Embed.toml configuration
To run via `probe-rs`, create an `Embed.toml` file in the project root:

```toml
[default]
chip = "nrf52840"   # or other: stm32f103c8, rp2040, atsamd21g18, etc.
probe = "Auto"      # you can specify a specific one (by serial or by name)
speed = 1000        # SWD/JTAG frequency in kHz

[default.rtt]
enabled = true
channels = [{ name = "defmt", up = true, down = false }]
```

```bash
cargo run            # flashing and launching
cargo embed          # flashing only
cargo embed --reset-halt  # stop at startup
cargo embed --list-probes  # list of available programmers
cargo embed --chip rp2040  # specify the chip manually
```

### Linking and memory

Create a `memory.x` file in the project root:

```ld
MEMORY
{
  FLASH : ORIGIN = 0x08000000, LENGTH = 256K
  RAM   : ORIGIN = 0x20000000, LENGTH = 64K
}
```

> Used by the linker (`link.x`) to determine the address space of the chip.

## 2. Panic handler

Without defining `#[panic_handler]` the project will not compile.

```rust
use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}
```

## 3. Main function

Add dependencies:

```bash
cargo add cortex-m --features inline-asm
cargo add cortex-m-rt
```

```rust
use cortex_m_rt::entry;

#[entry]
fn main() -> ! {
    loop {}
}
```

## 4. Text output: Semihosting

To output messages to the host (usually via `QEMU` or debug probe):

```bash
cargo add cortex-m-semihosting
```

```rust
use cortex_m_rt::entry;
use cortex_m_semihosting::hprintln;

#[entry]
fn main() -> ! {
    hprintln!("Start program").unwrap();
    loop {}
}
```

> Semihosting is slow, but convenient for debugging. Works only with debugger/QEMU support.

## 5. Interrupts / exceptions (e.g. SysTick)

```rust
use cortex_m_rt::exception;
use cortex_m_semihosting::hprintln;

#[exception]
fn SysTick() {
    hprintln!("SysTick interrupt").ok();
}
```

## Summary of steps

1. Initialize project: `cargo new`, configure `.cargo/config.toml`, `memory.x`, `rust-toolchain.toml`
2. Add dependencies: `cortex-m`, `cortex-m-rt`, `cortex-m-semihosting`
3. Define:
- `#[entry]`
- `#[panic_handler]`
- `#[exception]`
4. Configure runner: depends on environment (`probe-rs`, `QEMU`, `elf2uf2`, etc.)
5. Compile: `cargo build`, `cargo run` (if runner is configured)
