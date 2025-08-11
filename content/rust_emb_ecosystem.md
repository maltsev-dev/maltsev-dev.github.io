+++
title = "Embedded 📦 crates ecosystem"
date = "2025-06-25"

[taxonomies]
tags = ["rust", "embedded" ]
+++

**Review of the ecosystem of crates used for programming microcontrollers in Rust**

In general, developing programs for **MCU** is aimed at obtaining some information from the surrounding world, performing necessary calculations with this data and interacting back.  Using Rust gives a huge freedom in choosing the level of abstraction at which the developer can interact with the **MCU**.    

🟠 In this article I'll take a closer look at these abstraction levels and some other useful crates.

<!-- more -->
---

## Levels of Abstraction

## &emsp;&emsp;&emsp; 1. Low Level
To program an **MCU**, at the **lowest level**, you need to control a special set of `registers` available inside the **MCU**.  
[Registers](https://maltsev-dev.github.io/emb-registers/) are special memory locations that you can interact with: write data to, read, modify, and store values.  
To write or read a value from a register, you need to manipulate individual **bits** at specific memory addresses reserved for those registers.  
Once the control bits are set in the right registers, at some point the write will be interpreted and passed to a **peripheral device** connected to one of the **MCU** pins to interact with the outside world.  

* This approach can be unsafe, as it requires the use of **unsafe blocks** and **pointer dereferencing** to access register addresses - this can lead to undefined behavior (UB) and memory errors.  
* Directly manipulating registers to control the **MCU** is powerful, but not the most intuitive or safe way to interact with the hardware.  

## &emsp;&emsp;&emsp; 2. SVD (System View Description) Level
In addition to the datasheet describing the register structure, **MCU** manufacturers sometimes provide standardized **SVD** (System View Description) files in `xml` format.  
These files contain information about the functions and location of registers in a format `convenient for machine processing.`  
* The [svd2rust](https://crates.io/crates/svd2rust) tool allows you to automatically generate safe Rust crates with type-safe access to **MCU** peripheral registers based on such **SVD** files.

## &emsp;&emsp;&emsp; 3. PAC (Peripheral Access Crate) Level

After patching the **SVD** files and generating code through `svd2rust`, we get a safe and structured **PAC** - interface for working with the **MCU** peripherals.  

**PAC** is a `type-safe access` to each register of the peripherals.  
A struct is created for each register. These structs are implemented using zero-cost abstractions (in release mode).  

Thanks to the ownership system in Rust, **PAC** eliminates race conditions when accessing the peripherals.  
For example, if a struct representing a certain register has already been passed to another part of the code, it cannot be reused without explicitly sharing or returning ownership - this prevents unsafe concurrent access.  

**PAC** limitations:
* No initialization check: not guaranteed that you have set up all necessary registers correctly.
* No automatic checking of dependencies between peripherals (e.g. when working with `Timers`, `DMA`, etc.)

## &emsp;&emsp;&emsp; 4. HAL (Hardware Abstraction Layer) Level
**HAL** is a high-level abstraction layer built on top of PAC that provides a convenient and safe interface for controlling the **MCU** peripherals.  
These interfaces use clear structures and high-level abstractions: `GPIO`, `RCC`, `I2C`, `SPI`, `Timers`, `Pins`, etc.  
This allows implementing safety checks at the type system level and checking the initialization of components before they are used.  
**HAL** significantly reduces the complexity of interacting with hardware and makes the code more readable, reusable within the MCUs family, and more maintainable.  

### Driver
Basically, it's any crate written for an **MCU** that allows it to interact with the outside world via sensors or peripherals.

🧩 Creating a driver for an external ultrasonic distance sensor **HY-SRF05**
The sensor has only 5 pins, 2 of them:
- `TRIG` — for sending a signal (**output**)
- `ECHO` — for receiving a reflected signal (**input**)

The measurement procedure is as follows:
1. Send a short pulse to `TRIG` (e.g. 10 microseconds)
2. Wait for `ECHO` to go high `is_high()` and start timing
3. When `ECHO` goes low again `is_low()`, end the measurement
4. Create a driver function, e.g. `fn measure_distance() -> f32`

When creating the driver function, structures defined in a specific **HAL** for a specific **MCU** were used.  
The problem is that these types and structures **may not exist** in the same form in another **HAL** - in order to use this driver on another **MCU**, it must be rewritten.  

## &emsp;&emsp;&emsp; 5. Embedded HAL
[embedded-hal](https://crates.io/crates/embedded-hal) is a project that provides a unified set of **traits** to abstract common **MCU** peripherals: `GPIO`, `Timers`, `SPI`, `UART`, `I2C`, etc.  

* A **HAL** implemented for a specific **MCU** (e.g. [stm32f4xx-hal](https://crates.io/crates/stm32f4xx-hal) or [rp2040-hal](https://crates.io/crates/rp2040-hal)), implements the traits from `embedded-hal`, usually relying on low-level **PAC** interfaces.

This ensures compatibility of drivers with any chip that supports `embedded-hal`
* `modularity` (driver logic is separated from hardware)
* code `reusability` and portability (the same driver can be used with any **HAL** that implements `embedded-hal`)
* universal approach that allows `testing` the driver on multiple **MCU** in simulation.

🛠 Driver with Embedded **HAL**
To create driver that will be compatible with any platform based on `embedded-hal`, you need to:
1. Import traits from `embedded_hal`:
```rust
use embedded_hal::{
    digital::v2::{InputPin, OutputPin},
    timer::CountDown,
};
```

2. Define a driver function with **generic traits** and implement the functionality with them:

```rust
fn measure_distance<Trig, Echo, Timer>(
    mut trig: Trig,
    echo: Echo,
    mut timer: Timer,
) -> Result<f32, Error>
where
    Trig: OutputPin,
    Echo: InputPin,
    Timer: CountDown<Time = Duration>,
    ...
```

## &emsp;&emsp;&emsp; 6. BSP (Board Support Package) Level
`BSP` crates provide abstractions and utilities specific to a particular board (not just an **MCU**).

While `PAC` and `HAL` correspond to **MCU families**, a `BSP` corresponds to a **specific board model** - with its layout, pinout, onboard components and peripherals.  
BSPs are most often compatible with `embedded-hal` and speed up prototyping
* [rp-pico](https://crates.io/crates/rp-pico) — BSP for Raspberry Pi Pico (based on `rp2040-hal`)
* [nucleo-f401re](https://crates.io/crates/nucleo-f401re) - BSP for STM32 Nucleo F401RE
* [microbit](https://crates.io/crates/microbit) - BSP for BBC micro:bit

- Pin names that match the markings on the board
- For example, instead of `PA9` you can write `usb_dm`, `led_blue`, `button_user`, etc.
- Simplified initialization of peripherals specific to a particular board
- Ready-made drivers or wrappers over peripheral devices built into the board:
    * SD cards
    * Displays
    * LEDs, buttons, accelerometers
    * USB, Wi-Fi, BLE, etc.
- Clock and power settings optimal for a given board

## 7. Cortex crates
In the Rust ecosystem for **ARM based MCU**, a set of key crates is allocated, designed to work with the **Cortex-M** design:
| crate | purpose |
|:--------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [cortex-m](https://crates.io/crates/cortex-m) | Used as a foundation in most **HAL** and **BSP** crates for **MCU** based on Cortex-M (`STM32`, `nRF`, `RP2040`, etc.). |
| [cortex-m-rt](https://crates.io/crates/cortex-m-rt) | Minimal runtime (execution environment) for Rust programs under no_std.<br/>Necessary for most bare-metal projects. |
| [cortex-m-semihosting](cortex-m-semihosting) | Utilities for interacting with the debugger via semihosting.<br/>Suitable for outputting debug information without `UART` and without additional hardware. |
| [cortex-a](https://crates.io/crates/cortex-a) | for **ARM Cortex-A** cores (eg Raspberry Pi in bare metal mode)

Often these crates are not imported directly because the target **HAL**, for example crate `rp2040-hal` itself already depends on `cortex-m`, `cortex-m-rt` and uses them under the hood.