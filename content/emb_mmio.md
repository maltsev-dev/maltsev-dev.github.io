+++
title = "MMIO (Memory-Mapped I/O)"
date = "2025-07-02"

[taxonomies]
tags = ["embedded", "basic", "mmio"]
+++ 
 

<!-- more -->
**MMIO (Memory-Mapped I/O)** is a way for the central processing unit (CPU) to interact with peripheral hardware devices (e.g. `UART`, `timers`, `GPIO`, `SPI`, etc.) by "sticking" the registers of these devices to specific addresses in the CPU memory.  
These addresses in the CPU do not store regular data, but allow reading and writing to the device control registers.  
This means that the peripheral device can be accessed in the same way as regular memory - via regular memory read/write instructions (`LDR`, `STR`, `MOV`, etc.). at specific addresses.  

### How does it work inside CPU?
1. The CPU has a single **address bus**, which is used to access both RAM and MMIO devices.
2. When the CPU accesses an address that belongs to the MMIO area:
    - In this case, the control logic understands that this is not ordinary memory, but a device register.
    - Signals go to the **periphery**, not to **RAM/ROM**.

### 🧷 Key features
* It is necessary to work through `volatile`, so that the compiler does not optimize access to the device.
* Addresses and devices are specified by the platform manufacturer (e.g. `ARM Cortex-M`, `x86`)

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
    font-weight: bold;
  }
</style>
<table>
  <thead>
    <tr>
      <th>Characteristic</th>
      <th><code>volatile</code></th>
      <th><code>atomic</code></th>
      <th><code>mutex</code></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Scenario</td>
      <td>Read/write MMIO registers </br> Check flag or register status </td>
      <td>Interthread counter, ready flag </br> Safe logical condition (compare, increment) </td>
      <td>Work with buffer, list, structure</td>
    </tr>
    <tr>
      <td>Ensures visibility of changes</td>
      <td>✅ Yes (to the compiler)</td>
      <td>✅ Yes (across threads/cores)</td>
      <td>✅ Yes</td>
    </tr>
    <tr>
      <td>Ensures atomicity</td>
      <td>❌ No</td>
      <td>✅ Yes (e.g., <code>fetch_add</code>)</td>
      <td>✅ Yes (via locking)</td>
    </tr>
    <tr>
      <td>Protects from data races</td>
      <td>❌ No</td>
      <td>✅ Yes (on primitive types)</td>
      <td>✅ Yes (on any resource)</td>
    </tr>
    <tr>
      <td>Blocks other threads</td>
      <td>❌ No</td>
      <td>❌ No</td>
      <td>✅ Yes</td>
    </tr>
    <tr>
      <td>Supports complex operations</td>
      <td>❌ No</td>
      <td>⚠️ Limited (e.g., arithmetic, flags)</td>
      <td>✅ Yes (conditions, buffers, etc.)</td>
    </tr>
    <tr>
      <td>Use in Embedded</td>
      <td>✅ MMIO (memory-mapped I/O)</td>
      <td>✅ Counters, flags, semaphores</td>
      <td>✅ RTOS, critical sections</td>
    </tr>
    <tr>
      <td>Rust usage</td>
      <td><code>ptr::read_volatile</code>, PAC</td>
      <td><code>core::sync::atomic::*</code></td>
      <td><code>critical-section</code>, <code>Mutex&lt;T&gt;</code></td>
    </tr>
    <tr>
      <td>Performance</td>
      <td>🔋 Fast</td>
      <td>⚡ Fast</td>
      <td>🐢 Slower (due to blocking)</td>
    </tr>
  </tbody>
</table>



### 🔸 volatile
Compilers like to optimize code: if a variable doesn't change in the current context, they can **not re-read it**.  
* The device can change the register itself  
* The variable can change in another context  

`volatile` tells the compiler: "don't optimize access to this variable - read/write it each time, because it can change at any time outside the current code."  
* It is only used with MMIO.
* Rust doesn't have a built-in `volatile` keyword, but provides functionality via `core::ptr` and `volatile-safe` types:

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

### 🔸 atomic
* Provides **atomic** access to data (e.g. counters, flags).
* Suitable for thread synchronization on multiprocessor systems.
* Can be used without locks (lock-free).
* AtomicBool, AtomicU8, AtomicUsize, etc.

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


### 🔸 mutex
* Provides mutual exclusion.
* Suitable for **large objects** consisting of many variables or structures.
* More commonly used in multitasking systems (`RTOS`, `OS`).
* In embedded:
    * critical-section (interrupt lock),
    * Mutex<T> from embassy, ​​RTIC, or spin::Mutex without an OS.

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
