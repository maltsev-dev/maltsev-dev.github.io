+++
title = "Basic Embedded Rust Flow (Cortex-M)"
date = "2025-07-11"

[taxonomies]
tags = ["rust", "embedded", "basic" ]
+++

🟠 A must-have template for creating a Rust project for microcontrollers.

<!-- more -->
---

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 10px;
    vertical-align: top;
  }
  th {
    background-color: #f59140;
    color: white;
    text-align: center;
  }
  td:first-child {
    width: 25%;
    font-weight: bold;
  }
</style>

<table>
<thead>
<tr>
<th>Step</th>
<th>Goal</th>
<th>Result</th>
</tr>
</thead>
<tbody>
<tr>
<td>Creating a project</td>
<td>Starting with a clean Rust project</td>
<td>Creating a `cargo new` structure with `main.rs`</td>
</tr>
<tr>
<td>Configuring `.cargo/config.toml`</td>
<td>Specifying target and runner (`probe-rs`, `qemu`, etc.)</td>
<td>Compiling for STM32 and automatically running the firmware</td>
</tr>
<tr>
<td>Creating `rust-toolchain.toml`</td>
<td>Lock nightly version and components</td>
<td>Unified environment on all machines</td>
</tr>
<tr>
<td>Add `memory.x`</td>
<td>Detect microcontroller memory map</td>
<td>Linking works correctly, firmware is loaded</td>
</tr>
<tr>
<td>Add `Embed.toml`</td>
<td>Configure `probe-rs` (chip, speed, RTT)</td>
<td>You can flash, run, view `defmt` logs</td>
</tr>
<tr>
<td>Add dependencies</td>
<td>Connect HAL, cortex-m, panic, defmt</td>
<td>You can access STM32 peripherals in Rust</td>
</tr>
<tr>
<td>Implementation of `#[panic_handler]`</td>
<td>Ensure correct handling of `panic!`</td>
<td>Error-free compilation, correct debugging</td>
</tr>
<tr>
<td>Definition of `#[entry] fn main()`</td>
<td>Start point of the program</td>
<td>Code runs after reset of the microcontroller</td>
</tr>
<tr>
<td>Configuring `RTT / semihosting`</td>
<td>Add text output for debugging</td>
<td>Messages can be printed via `defmt::info!`</td>
</tr>
<tr>
<td>Interrupt handling</td>
<td>Add reactions to timers, UART, external events</td>
<td>Interrupts work, you can react to events</td>
</tr>
<tr>
<td>Compilation and firmware</td>
<td>Checking the entire pipeline</td>
<td>Working STM32 firmware in Rust</td>
</tr>
</tbody>
</table>

### 📌 1. Project Setup

#### ✅ Project Creation

```bash
cargo new --bin my_project
cd my_project
```

#### ✅ Add target and toolchain

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
runner = "elf2uf2-rs -d"   # или другой, см. ниже
```

##### QEMU Runner

```toml
runner = """
  qemu-system-arm \
  -cpu cortex-m3 \
  -machine lm3s6965evb \
  -nographic \
  -semihosting-config enable=on,target=native
"""
```

##### probe-rs Runner
```toml
runner = "probe-rs run"
```

##### 🧩 Embed.toml configuration
To run via `probe-rs`
Create `Embed.toml` file in the project root:
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
cargo run — flashing and launching
cargo embed — flashing only
cargo embed --reset-halt — stop at startup
cargo embed --list-probes — list of available programmers
cargo embed --chip rp2040 — specify the chip manually
```


#### ✅ Linking and Memory

create file `memory.x` file in the project root

```ld
MEMORY
{
  FLASH : ORIGIN = 0x08000000, LENGTH = 256K
  RAM   : ORIGIN = 0x20000000, LENGTH = 64K
}
```

> Used by the linker (`link.x`) to determine the address space of the chip.

---

### 📌 2. Panic Handler

Without defining `#[panic_handler]` the project will not compile.

```rust
use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}
```

---

### 📌 3. Main Function

add dependencies:

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

---

### 📌 4. Text output: Semihosting

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

---

### 📌 5. Interrupts / Exceptions (e.g. SysTick)

```rust
use cortex_m_rt::exception;
use cortex_m_semihosting::hprintln;

#[exception]
fn SysTick() {
    hprintln!("SysTick interrupt").ok();
}
```

---

### 🔄 Summary of steps

1. **Initialize project**: `cargo new`, configure `.cargo/config.toml`, `memory.x`, `rust-toolchain.toml`
2. **Add dependencies**: `cortex-m`, `cortex-m-rt`, `cortex-m-semihosting`
3. **Define**:
* `#[entry]`
* `#[panic_handler]`
* `#[exception]`
4. **Configure runner**: depends on environment (`probe-rs`, `QEMU`, `elf2uf2`, etc.)
5. **Compile**: `cargo build`, `cargo run` (if runner is configured)