+++
title = "Rust's toolbox for Embedded"
date = "2025-06-13"

[taxonomies]
tags = ["rust", "embedded", "tools"]
+++

🟠 Tools, debugging and analysis
<!-- more -->
---

### &emsp;&emsp;&emsp; Tools for development

- **`[rustup]`:** Manages the Rust toolchains (stable, beta, nightly) and target platform support (e.g. `thumbv7m-none-eabi`, `riscv64gc-unknown-none-elf`).  
Read more about how to properly set up the rust environment in the [article](https://maltsev-dev.github.io/rust-toolchain/) and [here](https://rustup.rs/)

- **`cargo`:** The Rust package manager and build system. Used to build, run, test, and manage dependencies. [Read More](https://doc.rust-lang.org/cargo/)

- **`svd2rust`:** Generates safe, type-safe Rust code (Peripheral Access Crates - PACs) from SVD (System View Description) files, simplifying interaction with memory-mapped registers.  
[crates.io](https://crates.io/crates/svd2rust)

- **`embedded-hal`:** A set of hardware abstraction interfaces for common peripherals (GPIO, UART, I2C) to promote portability across different microcontrollers. 
[crates.io](https://crates.io/crates/embedded-hal)

- **`probe-rs`:** A modern, Rust-oriented debugging tool that supports a variety of probes and targets, and integrates with VS Code. Aims to simplify debugging setup.
[crates.io](https://crates.io/crates/probe-rs) [Read More](https://probe.rs/)

- **`OpenOCD`:** An open source tool for debugging, testing, and programming embedded systems, providing an interface between the host and hardware, often used with GDB.
    
These tools automate boilerplate code, simplify interaction with hardware, and provide robust debugging capabilities.  
This mature ecosystem is critical for enterprise adoption and for tackling more complex embedded workloads.  
Strong tooling support, often cited as a key benefit of Rust, makes embedded development in Rust more productive and less error-prone, even when dealing with low-level aspects of memory.

### &emsp;&emsp;&emsp; Tools for debugging memory issues

- **GDB:** General-purpose debugger for examining program state, setting breakpoints/checkpoints, and inspecting memory and registers. Can attach to embedded targets via `OpenOCD` or `probe-rs`. Supports Rust-specific debugging (pretty printing, IDE integration).

- **Inspecting memory with GDB:** Developers can read and write to memory-mapped registers, set breakpoints, and inspect variables. Linker scripts define memory regions (FLASH, RAM) that can be inspected.

- **`defmt`:** High-performance logging framework for embedded systems, allowing structured logs to be streamed from the device. Can be integrated with GDB for simultaneous debugging and logging.
    
While safe Rust code provides strong guarantees, embedded development often requires the use of `unsafe` blocks to interact with hardware or improve performance.  
Research shows that `unsafe` code requires manual verification.  
Therefore, a robust embedded Rust workflow must combine Rust's compile-time safety with static analysis tools (Clippy, Miri) and runtime analysis techniques (high-water marks, profiling) to ensure correctness and optimize memory usage.

### &emsp;&emsp;&emsp; Tools for memory Analysis and Profiling

- **Static Analysis Tools:**
    - **Clippy:** A Rust linter that catches common bugs, including memory-related ones.
    - **Miri:** A MIR (Mid-level Intermediate Representation) Rust interpreter that detects undefined behavior, useful for checking `unsafe` code.

- **`cargo-call-stack` (nightly):** Can be used with `-Z emit-stack-sizes` to analyze static stack usage.
- **Formal Verification Tools:** Tools like TrustInSoft Analyzer can mathematically prove the absence of memory vulnerabilities and runtime bugs, which is especially useful for hybrid Rust/C/C++ codebases.

- **Runtime memory analysis:**
    - **High-water mark monitoring:** Filling unused stack/RAM with a pattern and checking the highest point of overwriting of the pattern indicates maximum usage.
    - **Profiling tools (on host/simulation):** `valgrind` and `heaptrack` (for host code or simulations) provide information about allocation patterns and leaks.

