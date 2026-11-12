---
title: "MMIO (Memory-Mapped I/O)"
date: "2025-07-02"
tags: ["embedded", "basic", "mmio"]
---
MMIO (Memory-Mapped I/O) is a way for the central processing unit (CPU) to interact with peripheral hardware devices (e.g. `UART`, `timers`, `GPIO`, `SPI`, etc.) by "sticking" the registers of these devices to specific addresses in the CPU memory.

Those addresses do not store regular data. They allow reading and writing to the device control registers, which means that the peripheral device is accessed in the same way as regular memory, via regular memory read/write instructions (`LDR`, `STR`, `MOV`, etc.) at specific addresses.

## How it works inside the CPU
1. The CPU has a single **address bus**, which is used to access both RAM and MMIO devices.
2. When the CPU accesses an address that belongs to the MMIO area, the control logic understands that this is not ordinary memory but a device register, and the signals go to the **periphery**, not to **RAM/ROM**.

## Key features
- It is necessary to work through `volatile`, so that the compiler does not optimize access to the device.
- Addresses and devices are specified by the platform manufacturer (e.g. `ARM Cortex-M`, `x86`).

| Characteristic | `volatile` | `atomic` | `mutex` |
|---|---|---|---|
| Scenario | Read/write MMIO registers<br>Check flag or register status | Interthread counter, ready flag<br>Safe logical condition (compare, increment) | Work with buffer, list, structure |
| Ensures visibility of changes | Yes (to the compiler) | Yes (across threads/cores) | Yes |
| Ensures atomicity | No | Yes (e.g., `fetch_add`) | Yes (via locking) |
| Protects from data races | No | Yes (on primitive types) | Yes (on any resource) |
| Blocks other threads | No | No | Yes |
| Supports complex operations | No | Limited (e.g., arithmetic, flags) | Yes (conditions, buffers, etc.) |
| Use in embedded | MMIO (memory-mapped I/O) | Counters, flags, semaphores | RTOS, critical sections |
| Rust usage | `ptr::read_volatile`, PAC | `core::sync::atomic::*` | `critical-section`, `Mutex<T>` |
| Performance | Fast | Fast | Slower (due to blocking) |

## volatile
Compilers like to optimize code: if a variable doesn't change in the current context, they can **not re-read it**. But the device can change the register itself, and the variable can change in another context.

`volatile` tells the compiler: "don't optimize access to this variable, read/write it each time, because it can change at any time outside the current code." It is only used with MMIO. Rust doesn't have a built-in `volatile` keyword, but provides the functionality via `core::ptr` and `volatile-safe` types.

```rust
use core::ptr::{read_volatile, write_volatile};
// unsafe is required for any direct volatile access
let ptr = 0x4000_0000 as *mut u32;
// Write the value without buffering
unsafe {
write_volatile(ptr, 0x1234);
}
// Read the value with optimizations disabled
let value = unsafe {
read_volatile(ptr)
};
```

## atomic
Atomics provide **atomic** access to data (e.g. counters, flags). They are suitable for thread synchronization on multiprocessor systems, and they can be used without locks (lock-free). The types include AtomicBool, AtomicU8, AtomicUsize and so on.

```rust
use core::sync::atomic::{AtomicBool, Ordering};

static READY: AtomicBool = AtomicBool::new(false);

fn main() {
    READY.store(true, Ordering::Release);
    if READY.load(Ordering::Acquire) {
        // safe to read
    }
}
```

## mutex
A mutex provides mutual exclusion. It is suitable for **large objects** consisting of many variables or structures, and is more commonly used in multitasking systems (`RTOS`, `OS`).

In embedded:
- critical-section (interrupt lock)
- `Mutex<T>` from embassy, RTIC, or `spin::Mutex` without an OS

```rust
use critical_section::Mutex;
use core::cell::RefCell;

static SHARED: Mutex<RefCell<Option<u32>>> = Mutex::new(RefCell::new(None));

fn example() {
    critical_section::with(|cs| {
        *SHARED.borrow(cs).borrow_mut() = Some(42);
    });
}
```
