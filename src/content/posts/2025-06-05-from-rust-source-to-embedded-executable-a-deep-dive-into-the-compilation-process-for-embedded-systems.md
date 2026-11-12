---
title: "From Rust source to embedded executable: the compilation process for embedded systems"
date: "2025-06-05"
tags: ["rust", "compilers", "embedded"]
---
This is the second part of my exploration into the stages and optimizations of [Rust compilation](/blog/2025-05-27-from-rust-source-code-to-optimized-executable-inside-the-rust-compiler-pipeline/), focusing now on embedded systems development.

Embedded environments impose unique constraints such as limited memory, lack of an operating system, and strict real-time requirements. Compiling Rust code for these systems therefore demands special considerations, from the removal of the standard library to precise target specifications and custom linker scripts.

## Initial code processing and abstract representation

The initial stages of Rust compilation, including lexical analysis, parsing, and building an abstract syntax tree (AST), remain largely unchanged for embedded systems.

Lexing tokenizes the source code. As with regular applications, the first step is lexical analysis, where the Rust source code (Unicode UTF-8 text) is converted into a stream of tokens.

Parsing builds an abstract syntax tree (AST). The stream of tokens is then passed to the parser, which builds a hierarchical, tree-like representation of the program.

Macro expansion and name resolution are early semantic passes that occur early in the process, often iteratively with parsing. Name resolution is the process of associating all symbolic references (variables, types, functions) with their declarations. It is a two-phase process: the collection phase builds a CrateDefMap for each crate by iteratively expanding macros and resolving imports, and the resolution phase then traverses the AST, establishing links from each name to its definition.

For embedded systems these phases work the same as for regular applications. Since embedded systems often have strict code size constraints, the use of macros, especially those that generate a lot of code, must be carefully considered to avoid code bloat in later phases.

## HIR and semantic analysis

This stage focuses on desugaring syntactic constructs and performing basic semantic analyses, including type checking, type inference, and trait resolution.

Transformation to HIR is the desugaring of syntactic constructs. For embedded systems this transformation is critical because it simplifies subsequent analyses. HIR uses more stable identifiers (DefId, LocalDefId, HirId) that help in incremental compilation, which is useful when code changes frequently in embedded development.

Enforcing types means type inference, type checking, and trait resolution. In the HIR stage, the rustc compiler performs basic semantic analyses to ensure Rust is type safe.

The main difference in embedded development in Rust is the use of the `#![no_std]` attribute.

- No standard library. `#![no_std]` specifies that the program will not use the [Rust standard library](https://doc.rust-lang.org/std/), which depends on the OS. Instead, the [core](https://doc.rust-lang.org/core/) library is used, which is a subset of std and is OS-independent. OS-dependent functions (e.g. `println!`, `File::open`, `Vec::new` without an explicit allocator) are therefore not available, and alternatives such as `core::fmt` for formatting or specialized crates for working with hardware must be used. See [embedded-hal](https://crates.io/crates/embedded-hal).
- Dependencies. If the core crate uses `no_std`, then all its transitive dependencies must also be `no_std` or explicitly support no_std environments.
- Benefits. Using `no_std` is critical for embedded systems because it allows for minimal binaries to be created without OS overhead, allowing direct control over the hardware and meeting stringent real-time requirements. See [embedded-rust tools](https://github.com/rust-embedded/awesome-embedded-rust?tab=readme-ov-file#tools).

## MIR and basic security checks

MIR conversion generates the control flow graph. MIR is a radically simplified and explicit form of Rust code, specifically designed to perform flow-sensitive safety checks (in particular, borrow checking), as well as various compiler optimizations and constant computation.

The borrow checker enforces memory safety. Borrow checking, implemented in the `rustc_borrowck` crate, is a distinctive feature of Rust that provides memory safety without a garbage collector. It works directly with MIR. For embedded systems, borrow checking is a huge benefit. It allows Rust to provide memory safety (e.g. data races, dangling pointers, use-after-free) at compile time, eliminating the need for a garbage collector or manual memory management, which is critical for resource-constrained systems with strong deterministic requirements.

MIR optimizations run after MIR borrow checking, as a series of optimization passes. For embedded systems, these optimizations are critical to minimizing code size and improving performance. Smaller code size means the program fits into the limited Flash/ROM memory of the microcontroller, and higher performance allows real-time tasks.

## Code generation and machine-specific optimizations

This final major stage of the rustc compiler involves translating the highly optimized MIR into executable machine code, using LLVM for architecture-specific transformations and extensive optimizations.

### Monomorphization and LLVM IR generation

For embedded systems, the target triple is fundamental. A target triple (e.g. `thumbv7em-none-eabihf` for ARM Cortex-M) tells the compiler the `architecture`, `vendor`, `OS type / runtime type` for which the binary will be generated. For bare-metal systems, the OS type is often specified as `none` or `unknown`.

This allows rustc to generate code specific to the target microcontroller, including the correct calling conventions and instruction set.

Monomorphization, while beneficial for performance, can lead to `code bloat`, which is a serious problem for memory-constrained embedded systems. You should be careful about using `generics` and consider using size optimization flags.

### LLVM optimizations

These optimizations are designed to improve the performance and efficiency of the generated code, including dead code removal, constant propagation, function inlining, and loop optimizations.

For embedded systems, where binary file size is a critical constraint, special optimization levels are used:

- `opt-level = "s"` (optimize for size)
- `opt-level = "z"` (optimize for smallest size)

These levels significantly reduce LLVM's inlining threshold, which can help reduce code size by potentially inlining fewer functions. Developers can use `profile-overrides` in Cargo.toml to optimize dependencies for size while keeping the core crate more debuggable.

`rustc_codegen_gcc` is an alternative backend that may be useful for platforms not supported by LLVM, or to take advantage of GCC optimizations.

### Generating machine code and object files

The output of this stage is platform-specific assembly code, which is then assembled into object files (`.o` or `.obj`). The object files contain machine code, data, relocation information, and symbol tables.

## Linking

The final step of the compilation process involves combining all the compiled object files and required libraries into a single executable binary or shared library. This is done by the linker.

### Static vs. dynamic linking

Embedded systems almost always use static linking, where resolution occurs during compilation and all required library code is built directly into the final executable. Most embedded systems do not have an operating system capable of managing dynamic libraries and require the binary to be completely self-contained. Static linking ensures that all required dependencies are included in a single executable, simplifying deployment to the target hardware.

### The role of the linker

The primary role of the linker is to merge artifacts: it combines the generated object files, static libraries, and dynamic libraries into the final executable. It resolves any remaining symbol references and performs relocations.

[rust-lld](https://blog.rust-lang.org/2024/05/17/enabling-rust-lld-on-linux/) is the Rust-shipped copy of lld (the LLVM linker), used by default for bare-metal and WebAssembly targets.

For bare-metal embedded systems, a custom linker script (usually a `.ld` file) must be provided.

```linker script
MEMORY {
    BOOT2 : ORIGIN = 0x10000000, LENGTH = 0x100
    FLASH : ORIGIN = 0x10000100, LENGTH = 2048K - 0x100
    RAM : ORIGIN = 0x20000000, LENGTH = 256K
    SRAM4 : ORIGIN = 0x20040000, LENGTH = 4k
    SRAM5 : ORIGIN = 0x20041000, LENGTH = 4k
}

EXTERN(BOOT2_FIRMWARE)

SECTIONS {
    .boot2 ORIGIN(BOOT2) :
    {
        KEEP(*(.boot2));
    } > BOOT2
} INSERT BEFORE .text;

SECTIONS {
    .boot_info : ALIGN(4)
    {
        KEEP(*(.boot_info));
    } > FLASH

} INSERT AFTER .vector_table;
_stext = ADDR(.boot_info) + SIZEOF(.boot_info);

SECTIONS {
    .bi_entries : ALIGN(4)
    {
        __bi_entries_start = .;
        KEEP(*(.bi_entries));
        . = ALIGN(4);
        __bi_entries_end = .;
    } > FLASH
} INSERT AFTER .text;
```

This script defines the memory map of the target microcontroller (e.g. Flash, RAM, stack, heap locations) and tells the linker where to place the various code and data sections (e.g. `.text`, `.data`, `.bss`). Without such a script, the linker will not be able to correctly place the program in the device's memory.

### Custom entry point

Embedded Rust programs do not use the standard main function as an entry point, since it depends on the OS runtime. Instead, the `#![no_main]` attribute is used to disable the standard entry point. The developer then defines a custom entry point, often using the `#[entry]` macro from an architecture-specific crate (e.g. [cortex-m-rt](https://crates.io/crates/cortex-m-rt)). This startup code is responsible for initializing the stack, data sections, and jumping to the main logic of the program.

### Final executable file

By default, rustc generates an ELF file, which contains a lot of useful debugging information. However, most microcontrollers require a very minimal binary (`.bin`) or hexadecimal (`.hex`) file consisting only of the program instructions. Tools such as [cargo-binutils](https://crates.io/crates/cargo-binutils) (which provides objcopy) are used to convert the ELF file to these formats.

## The checklist

Compiling a Rust program for embedded systems follows the same fundamental multi-step process as for regular applications, but with critical adaptations:

1. removal of the standard library (no_std)
2. target-specific triplets,
3. careful optimization of code size,
4. custom linker scripts
5. custom entry points.
