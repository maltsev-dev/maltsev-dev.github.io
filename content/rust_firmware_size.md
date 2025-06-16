+++
title = "Critical Compression of Embedded Firmware: Understanding cargo size and Linker Strategies in Rust"
date = "2025-05-29"

[taxonomies]
tags = ["rust", "embedded", "linker"]
+++

In embedded Rust development, minimizing the size of the compiled firmware is essential due to the limited memory resources of microcontrollers.  
This article explores how to analyze binary sizes using the `cargo size` tool, the structure of ELF binaries produced during compilation, and the importance of linker scripts in controlling memory layout.  

🟠 Focusing on the ARM Cortex-M0 target, we will discuss practical strategies to optimize and compress firmware for resource-constrained embedded systems.

<!-- more -->
---

## &emsp;&emsp;&emsp; I. Introduction to  `cargo size` and ELF binaries
### &emsp;&emsp;&emsp; A. The role of `cargo size`

* `cargo size` is a utility from the [cargo-binutils](https://crates.io/crates/cargo-binutils) designed to check the memory occupied by an [ELF](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) executable file.  
* It allows one to quickly estimate how much memory their compiled application will consume, and identify potential areas of bloat or inefficiency.

### &emsp;&emsp;&emsp; B. ELF Binaries

* The ELF file is the final result of the compilation and linking process, containing the compiled program ready to be flashed into the microcontroller's non-volatile memory (Flash).
* The ELF file is logically divided into different `sections`, each of which serves a specific purpose (e.g. executable instructions, initialized data, read-only data, debug information.
* The linker is responsible for arranging these sections according to a `predefined memory map`, which is usually specified in the linker script.

### &emsp;&emsp;&emsp; C. Target Architecture Context

* The project targets the `thumbv6m-none-eabi` target, which is the Rust compilation target for the **ARM** `Cortex-M0` and `Cortex-M0+` microcontrollers.
* These are low-power entry-level microprocessors with very limited Flash and RAM memory.

## &emsp;&emsp;&emsp; II. Detailed Analysis of `cargo size` Output

### &emsp;&emsp;&emsp; A. Output Overview

The `cargo size` output is a list of sections, their sizes in bytes, and their corresponding memory addresses. 

```
cargo size --bin blink_external_led -- -A          
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.14s
blink_external_led  :
section               size        addr
.vector_table          192  0x10000100
.boot_info              20  0x100001c0
.boot2                 256  0x10000000
.text                33044  0x100001d4
.bi_entries              0  0x100082e8
.rodata               4904  0x100082e8
.data                    0  0x20000000
.gnu.sgstubs             0  0x10009620
.bss                     4  0x20000000
.uninit                  0  0x20000004
.defmt                   3         0x0
.debug_abbrev        29892         0x0
.debug_info         737273         0x0
.debug_aranges       29600         0x0
.debug_ranges       123360         0x0
.debug_str          960891         0x0
.comment               153         0x0
.ARM.attributes         50         0x0
.debug_frame         86396         0x0
.debug_line         315121         0x0
.debug_loc            5256         0x0
.debug_pubnames        489         0x0
.debug_pubtypes         71         0x0
Total              2326975
```

The total size is `2326975 bytes`, which is approximately `2.33 MB.`  
As the output shows, the dev profile was used to create the file, which includes debug information, which is the reason for the large total size of the binary.  

```
cargo size --bin blink_external_led --release -- -A
    Finished `release` profile [optimized] target(s) in 0.15s
blink_external_led  :
section             size        addr
.vector_table        192  0x10000100
.boot_info            20  0x100001c0
.boot2               256  0x10000000
.text               6396  0x100001d4
.bi_entries            0  0x10001ad0
.rodata              888  0x10001ad0
.data                  0  0x20000000
.gnu.sgstubs           0  0x10001e60
.bss                   4  0x20000000
.uninit                0  0x20000004
.defmt                 3         0x0
.comment             153         0x0
.ARM.attributes       50         0x0
Total               7962

```
When creating a release version, the size is `7962 bytes` just `7.9КБ` or `0.007962 MB.`  
Which is approximately **293** times smaller than the debug version.  

### &emsp;&emsp;&emsp; B. Main memory sections (loaded into Flash/RAM)
Next we will look at an example of a release-optimized `cargo size` output.  
These sections represent the actual code and data that will be loaded into the microcontroller's memory for execution.

- **`.vector_table`:** `192` bytes at `0x10000100`.
    - It contains the initial value of the main stack pointer (**MSP**) as its first entry, followed by the address of the reset handler, and then an array of pointers to various exception (e.g. HardFault) and interrupt handlers. This is the central dispatch table for the CPU.
    - This is the very first information that the ARM Cortex-M processor reads on reset to determine `where to start execution` and how to handle system events.
    - It is always placed at the very beginning (`ORIGIN`) of the `FLASH` memory area so that the processor can immediately find it after reset.
        
- **`.text`:** `6396` bytes at `0x100001d4`.
    - This section contains the compiled machine instructions of your program (**executable code**).
    - Typically placed immediately after `.vector_table` in `FLASH` memory. The `cortex-m-rt` crate **manages this placement**.
        
- **`.rodata`:** `888` bytes at `0x10001ad0`.
    - This section contains **read-only data**, which includes `global constants`, `string literals`, and other data that is fixed at compile time and is not subject to change during runtime.
    - Placed in `FLASH` memory, often adjacent to or immediately after the `.text` section, as it is also part of the program's static image.
        
- **`.data`:** `0` bytes at `0x20000000`.
    - This section contains **initialized** global and static variables.
    - Places in `RAM`. During the microcontroller startup sequence (before `main` is called), the initial values ​​of these variables are copied from the appropriate section in `FLASH`
        
- **`.gnu.sgstubs`:** `0` bytes at `0x10001e60`.
    - This is a specialized section synthesized by the linker to support **ARMv8-M TrustZone** (`Cortex-M23`, `Cortex-M33`) and `Cortex-M Security Extensions (CMSE)`, typically in Flash memory.
    - The target device (`thumbv6m-none-eabi`, Cortex-M0/M0+) _does_ not_ support TrustZone.

- **`.bss`:** `4` bytes at `0x20000000`.
    - This section stores **uninitialized** global and static variables. These variables are guaranteed to be zero before `main` is called.
    - Placed in `RAM`.
        
- **`.uninit`:** `0` bytes at `0x20000004`.
    - Like `.bss`, this section contains **uninitialized data**. However, unlike `.bss`, data in `.uninit` is _not_ guaranteed to be zero at startup.  
    - This can be useful for variables that will be explicitly initialized later by the program, or to preserve values ​​across `soft resets` if the `RAM` is battery-backed.
    - Resides in `RAM`.

Calculating the sizes of the main loaded sections: 
* **`.vector_table`** (192 bytes) + 
* **`.text`** (6396 bytes) + 
* **`.rodata`** (888 bytes) = `0x510` bytes (7962 bytes).

The `.data`, `.bss`, `.uninit`, and `.gnu.sgstubs` sections are 4 bytes in total.  
This means that the actual executable code and read-only data for the `blink_external_led` application take up just about `8KB` of Flash memory, and no static variable data is used in `RAM`.

### &emsp;&emsp;&emsp; C. Debug information section (not loaded into Flash devices for execution)

```
.debug_abbrev        29892         0x0
.debug_info         737273         0x0
.debug_aranges       29600         0x0
.debug_ranges       123360         0x0
.debug_str          960891         0x0
.comment               153         0x0
.ARM.attributes         50         0x0
.debug_frame         86396         0x0
.debug_line         315121         0x0
.debug_loc            5256         0x0
.debug_pubnames        489         0x0
.debug_pubtypes         71         0x0
```

The `.debug_` sections (e.g. `.debug_info`, `.debug_line`) in an ELF file contain metadata formatted according to the [DWARF](https://en.wikipedia.org/wiki/DWARF) standard.
This information is needed by debuggers such as GDB to effectively interact with and analyze the compiled program.  

Their primary purpose is to provide a comprehensive map between the compiled machine code and the source code.  
During development, enabling these sections is invaluable for efficiently identifying and fixing bugs.  

Enabling debug symbols will increase the size of the generated ELF file, but typically does not affect the size of the downloaded program, as the debug information is **removed** before being loaded onto the device.  

- **`.debug_abbrev`:** `29892` bytes.
    - Defines **codes** used to compress entries in `.debug_info` and `.debug_types`, making debug output more compact.
    
- **`.debug_info`:** `737273` bytes.
    - The largest and central debug section. It contains the main debug information entries (**DIEs**) that describe the structure of the program, including details about compilation units (source files), functions (subprograms), global and local variables, and user-defined data types.
    
- **`.debug_aranges`:** `29600` bytes.
    - Contains tables of address ranges that allow the debugger to quickly determine which compilation unit an arbitrary memory address belongs to, speeding up symbol lookups. 
    
- **`.debug_ranges`:** `123360` bytes.
    - Contains lists of address ranges that define specific memory areas occupied by routines or compilation units.  
    
- **`.debug_str`:** `960891` bytes.
    - A string table containing all strings referenced by other debug sections (e.g. source file names, variable names, type names). This table is merged by the linker to remove duplicates.  
    
- **`.debug_frame`:** `86396` bytes.
    - Provides information needed to **unwind the stack**, allowing the debugger to reconstruct the call stack and generate accurate stack traces, which is especially important when analyzing crashes.
    
- **`.debug_line`:** `315121` bytes.
    - Contains line number tables that map program counter values ​​to specific locations in the source code (file, line, column). This allows the debugger to **show the current line of code**.
    
- **`.debug_loc`:** `5256` bytes.
    - Contains **location lists**, which are expressions that describe to the debugger the exact location (e.g. register, stack offset) of a variable at various points in program execution, taking into account compiler optimizations.
    
- **`.debug_pubnames`:** `489` bytes.
    - Lists **public names** (e.g. global functions, global variables) defined in the compilation unit, used by debuggers to quickly look up symbols.
    
- **`.debug_pubtypes`:** `71` bytes.
    - Similar to `.debug_pubnames`, but lists **public types**. 

In addition to the DWARF sections, `.comment` and `.ARM.attributes` are metadata sections that provide information about the build and architecture. 

- **`.comment`:** `153` bytes.
    - A small section, typically containing **compiler version** information, **build flags**, or other text comments from the toolchain.

- **`.ARM.attributes`:** `50` bytes.
    - Contains ARM-specific attributes related to the ABI (Application Binary Interface), architecture, and other platform-specific details.

## &emsp;&emsp;&emsp; III. Memory Sections in Embedded

### &emsp;&emsp;&emsp; A. FLASH and RAM

**ARM Cortex-M** microcontrollers feature [Harvard architecture](https://en.wikipedia.org/wiki/Harvard_architecture) or similar memory partitioning, having separate memory areas for storing programs and volatile data.

- **`FLASH` (or ROM):** This is _non-volatile_ memory, meaning it **retains its contents** even when power is removed. It serves as the primary storage for the program's executable code (`.text`), read-only data (`.rodata`), and interrupt vector table (`.vector_table`).  
The amount of available Flash memory is a fundamental limitation on the complexity and feature set of an embedded application.

- **`RAM` (Random Access Memory):** This is volatile memory that **requires constant power** to maintain data. It is used for runtime variables (both initialized and uninitialized), the program stack, and the heap (for dynamic memory allocation).  
The amount of available RAM determines the maximum `stack dept`h, the number of `global/static variables`, and the capacity for dynamic data structures.

The `addr` values ​​in the `cargo size` output are not randomly. These addresses are confirmed to be the standard base addresses for `FLASH` and `RAM` on many **ARM Cortex-M** devices.  
They correspond directly to the **physical memory map** of the target microcontroller.  
Any attempt by the linker to place code or data outside these defined physical memory ranges will result in a **linker error** or, more critically, undefined behavior and system crashes at runtime if the program is flashed to the device.
The `cortex-m-rt` crate provides default values, but customization for specific hardware variations or extended memory management units (MPUs) is often required.

### &emsp;&emsp;&emsp; B. Stack and Heap (Runtime Memory)

While `cargo size` provides a static view of sections of a binary, it is critical to understand the dynamic memory components that consume RAM at runtime.

- **`Stack`:** This memory area is used for local variables, function call frames, and return addresses.  
On ARM Cortex-M, the stack typically grows **downwards** from a high memory address to lower addresses.  
Its initial position is typically set at the very end of the `RAM` region by the linker script.  

- **`Heap`:** This memory area is used for dynamic memory allocation (e.g. using `Box`, `Vec`, or the `alloc` crate functions in the `std` or `alloc` environment).  
The heap typically grows **upwards** after the `.data` and `.bss` sections in `RAM`.


## &emsp;&emsp;&emsp; IV. Managing Memory Layout and Section Placement (Linker Scripts)

### &emsp;&emsp;&emsp; A. Linker Scripts Role

Linker scripts are text files that serve as configuration input to the `linker`.  
They provide precise instructions on how to map input sections from **object files** to output sections in the final **ELF executable**.  
Crucially, they also dictate where these output sections should be placed in specific memory areas (such as Flash and RAM) of the **target embedded device**.  
While the `cortex-m-rt` crate provides a default linker script, for production embedded applications developers often need to customize it.  

### &emsp;&emsp;&emsp; B. Basic directives in Linker Scripts

Linker scripts use several key directives to define and control memory layout, which can be described in the `memory.x` file:

```ld
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

#### &emsp;&emsp;&emsp; 1. Block `MEMORY`

- **`MEMORY`:** section defines the physical memory map of the microcontroller or chip: where the **bootloader** is, where the **flash** is, where the **RAM** is, and also two "additional" small **SRAM** regions.
    - Each region is given a name, starting address (`ORIGIN`) and size (`LENGTH`) or region.

- **`BOOT2`:** This is usually a small area of ​​memory where the **minimal bootloader** needed to start the processor is placed.
    - **ORIGIN** = 0x10000000 is the physical address where the `BOOT2` area begins.
    - **LENGTH** = 0x100 (256 bytes) is the size of this area.

- **`FLASH`:**
    - **ORIGIN** = 0x10000100 — the next 256 bytes after the `BOOT2` area (i.e. the bootloader is already located at 0x10000000–0x100000FF, and then comes the flash space).
    - **LENGTH** = 2048K - 0x100 — the total flash capacity (2 MB) minus 0x100 (256 bytes), i.e. actually 2 MB minus the areas under `BOOT2`. This is the main space where the firmware code and data will be placed.

- **`RAM`:** 
    - **ORIGIN** = 0x20000000 
    - **LENGTH** = 256K — RAM available for executing code (or for storing buffers, stacks, global variables, etc.).

- **`SRAM4`, `SRAM5`:** - These are additional "SRAM banks" (small (4 KB) autonomous memory segments are allocated).
    - **ORIGIN** = 0x20040000, LENGTH = 4k
    - **ORIGIN** = 0x20041000, LENGTH = 4k 
    

#### &emsp;&emsp;&emsp; 2. `EXTERN` directive
* Declares an external (outside this linker script) label/symbol `BOOT2_FIRMWARE`.  
* Usually this means that **somewhere in the source codes** the symbol `BOOT2_FIRMWARE` is defined, and the linker should understand that it exists and can be referenced when forming the symbol table, even if we do not specify here which object file it is located in.  

####    3. `ENTRY` directive
* This directive specifies the program **entry point symbol** (e.g. `Reset` for Cortex-M devices).  
* This is critical because linkers are lazy and aggressively discard any sections of code or data that are not reachable (recursively called or referenced) from this entry point.  

####    4. `SECTIONS` block
* The block defines how to distribute logical sections (e.g. `.text`, `.data`, `.boot2`, etc.) across physical regions (e.g. `BOOT2`, `FLASH`, `RAM`).

First `SECTIONS` block for `.boot2`
```ld
SECTIONS {
    .boot2 ORIGIN(BOOT2) :
    {
        KEEP(*(.boot2));
    } > BOOT2
} INSERT BEFORE .text;
```
- `.boot2 ORIGIN(BOOT2) : { ... } > BOOT2` - defines a new section named `.boot2`, where its start address is equal to the value of `ORIGIN(BOOT2)`, i.e. 0x10000000.
    - Inside curly braces: `KEEP(*(.boot2));`
    - `KEEP` - says that during GC this section should **not be removed**, even if it is not directly referenced from any code.
    - `*(.boot2)` - means "all entries (.o-files/modules) that have a `.boot2` section". Simply put, all code (or data) fragments marked with the `section(".boot2")` attribute in the sources will end up here.
    - `> BOOT2` – specifies: place this new section (`.boot2`) in the physical memory region `BOOT2` (0x10000000—0x100000FF).

- `INSERT BEFORE .text;`
    - Directive for controlling the order of section formation: it ensures that the `.boot2` section will be **before** the `.text` section in the final image. 
    - Any piece of code/data that has `.section(".boot2")` in the object attributes will be "hardcoded" into the first `0x100` bytes of flash starting from `0x10000000`, and it won't be thrown out during linking even with "optimization by removing unused code".
    
Second `SECTIONS` block for `.boot_info`
```ld
SECTIONS {
    .boot_info : ALIGN(4)
    {
        KEEP(*(.boot_info));
    } > FLASH

} INSERT AFTER .vector_table;
_stext = ADDR(.boot_info) + SIZEOF(.boot_info);
```
- **`.boot_info : ALIGN(4) { ... } > FLASH`** - creates a new **`.boot_info`** section, which will be placed in the `FLASH` region (i.e. starting from 0x10000100 and further).
    - `ALIGN(4)` ensures that the beginning of this section is **aligned on a 4-byte** boundary.

- **`INSERT AFTER .vector_table;`** - specifies: "Place the `.boot_info` section immediately **after** the `.vector_table` section".
    - Usually `.vector_table` is a standard section where the interrupt vector table go. It also resides in `FLASH`. And `.boot_info` is guaranteed to be right after this table. 

- **`_stext = ADDR(.boot_info) + SIZEOF(.boot_info);`** - The symbol (global label) `_stext` is created.
    - `ADDR(.boot_info)` — calculates the start address of the new `.boot_info` section.
    - `SIZEOF(.boot_info)` — its size in bytes.
    - As a result, `_stext` = start of `.boot_info` + its size, i.e. the address of the byte immediately **after** the end of `.boot_info`.
    - The `_stext` symbol is usually used in code to mark the start of the "main" `.text` sector (to know from what address the "normal" code starts), or to configure loading/copying of firmware from one area of ​​the flash to RAM.
    - after `.vector_table` there is a special area `.boot_info` some data about the bootloader/configuration. And then with the help of `_stext` the "boundary" is defined - from there the placement of the rest of the code (the main sector `.text`) begins.

Third `SECTIONS` block for `.bi_entries`
```ld
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
- **`.bi_entries : ALIGN(4) { ... } > FLASH`** - A new section **`.bi_entries`** in the `FLASH` region
    - The beginning of the section is aligned to 4 bytes using to ensure correct alignment of structures (e.g. data tables written in `.bi_entries`)

- **`__bi_entries_start = .;`**
    - At the moment of defining this label, the point «`.`» (the current address during linking) will point to the beginning of the `.bi_entries` section.

- **`. = ALIGN(4);`**
    - Shifts the address of "`.`" (the current pointer in the section) forward so that it aligns to the nearest **4-byte** boundary after the last element of `.bi_entries`.  
    - This ensures that if there is another section after this one (e.g. `.rodata` or `.data`), it will start "on a level boundary" and **not in the middle** of some 4-byte block.

- **`__bi_entries_end = .;`**
    - Once we have done the alignment, here the dot "`.`" indicates the end of all data from `.bi_entries`. We store this address in the symbol `__bi_entries_end`.
    - So in the binary image there is a start point and end point of "boot-info entries", and the second stage of the bootloader or application can go through the range `[__bi_entries_start, __bi_entries_end)` and parse these entries.

- **`INSERT AFTER .text;`**
    - The directive emphasizes: the `.bi_entries` section must appear immediately after the `.text` section (regular code) in memory (`FLASH`).
    - first `.vector_table`
    - then `.boot_info`
    - then `.text` (main code)
    - after `.text` — `.bi_entries`

#### &emsp;&emsp;&emsp; SECTION Mods and Macros

- **`KEEP(...)`**  
    Instructs the linker not to "clean up" (collect, delete) a section. This is important for areas where, at startup, reading occurs not via regular function calls, but, say, the loader reads a "raw" byte array from a specific address.
    
- **`ALIGN(n)`**  
    Ensures that the start (or end) of a section is aligned to `n` bytes. Embedding tables, heaps, or simply meeting microcontroller requirements (when, for example, some structures must lie on a 4-byte boundary) requires alignment.
    
- **`. = ALIGN(4);`**  
    Sets the "current address" to a 4-byte aligned position. **Usually written after data** has been placed, to align the "end" of the section and prevent the next logical area from being "smeared" across unaligned boundaries.
    
- **`ADDR(<section_name>)`** и **`SIZEOF(<section_name>)`**  
    -  These expressions allow symbolic addresses and section sizes to be calculated at link time.
    - `ADDR(.boot_info)` — is the base address from which `.boot_info` is loaded.    
    - `SIZEOF(.boot_info)` — how many bytes are in this section?  
        Thus, the expression `ADDR(.boot_info) + SIZEOF(.boot_info)` gives the address of the **first empty byte** immediately after the end of `.boot_info`.
    
- **`INSERT BEFORE .text` / `INSERT AFTER .vector_table` / `INSERT AFTER .text`**  
    - These directives control the order of "insertion" of **additional** sections (`.boot2`, `.boot_info`, `.bi_entries`) relative to **standard** sections (`.vector_table`, `.text`).
    - Without these inserts, the linker would arrange everything by default (usually: `.vector_table`, `.text`, `.rodata`, etc.)
    
## &emsp;&emsp;&emsp; V. Strategies for Optimizing Binary File Size in Rust Embedded Projects

### &emsp;&emsp;&emsp; A. Compiler and Linker Configuration (The Easiest and Most Effective)

These optimizations in the `Cargo.toml` file.

- **Build in release mode (`cargo build --release`):**

- **Remove symbols from a binary (`strip = true`):**
    - Since Rust 1.59, Cargo can be configured to strip symbols automatically by adding `strip = true` to the `[profile.release]` section of `Cargo.toml`.
        
- **Optimize for size (`opt-level = "z"` or `"s"`):**
    - Level `"s"` also optimizes for size, but sometimes `"z"` can give better results.
        
- **Enabling Link Time Optimization (LTO):**
    - Enabling LTO in `Cargo.toml` (`lto = true`) allows the compiler to perform program-wide optimizations, resulting in smaller binaries by eliminating dead code and performing more aggressive optimizations at crate boundaries.
    
- **Reduce parallel code generation units (`codegen-units=1`):**
    - Cargo by default specifies `16` parallel code generation units for release builds to improve compilation times. However, this prevents some optimizations.
    - Setting `codegen-units=1` in `Cargo.toml` allows for maximum optimizations to reduce size.

- **Abort on panic (`panic = "abort"`):**
    - The `rustc` instruction to abort immediately instead of stack unwinding removes some extra code.
        
- **Removing `core::fmt` and using `#![no_std]`:**
    - For very small executables (less than 20kb), it may be necessary to completely remove Rust's string formatting code (`core::fmt`).  
    - This involves using `#![no_main]`, manually managing `stdio`, and carefully analyzing the code to avoid using bloated `core::fmt` functions.
    - Removing `libstd` with `#![no_std]` its reduce the binary size to the size of an equivalent C program that depends only on `libc`.   

### &emsp;&emsp;&emsp; B. Dependency management and analysis tools

- **`cargo-bloat`:** This tool helps identify what is taking up the most space in an executable by providing a breakdown by dependencies and functions.
- **`cargo-unused-features`**: Finds and removes enabled but potentially unused feature flags from your project.
- **Disabling features:** Many Rust crates offer optional features that can be enabled or disabled. Exploring and **disabling unnecessary features** in dependencies can help reduce the size of compiled code.

    
### &emsp;&emsp;&emsp; C. Micro-optimizations and code structure

- **Reduce or eliminate of using generics:** in Rust can lead to monomorphism, this can increase code size.  

- **Limit length offsets to buffer:** Optimize functions that operate on buffers by **explicitly limiting input** lengths to the actual buffer length (e.g. `len.min(buf.len())`).  
This can allow the compiler to remove` panic checks related to out-of-bounds`, resulting in fewer instructions.
    
- **Idiomatic method chaining:** Using Rust's idiomatic method chaining (e.g. with the `Option` and `Result` combinators) can result in assembly code that is as optimized as the more verbose or `unsafe` alternatives, demonstrating that "fewer lines really are faster" in terms of compiled output. 
    
- **Using `u64` for `Duration` calculations:** When working with embedded time intervals, performing arithmetic operations using `u64` directly and converting to `Duration` only when necessary can significantly reduce the size and complexity of assembly code. 
    
- **Packaging `u16` into `[u8; 4]`:** Using larger integer types (such as `u32`) and their conversion methods to pack data can result in more compact and efficient assembly code for packing operations. 
    
- **Returning `1` or `-1` from a logical comparison:** Sometimes more readable `if/else` code can generate similar assembly code as more "tricky" arithmetic conversions, indicating that readability does not always sacrifice optimization in Rust.


## &emsp;&emsp;&emsp; Sticker

1. **Switch to a release build:** Always compile your project with `cargo build --release`.
2. **Configure the `release` profile in `Cargo.toml`:**
    - **Symbol stripping:** Add `strip=true` to automatically strip debug symbols.
    - **Size-first optimizations:** Set `opt-level="z"` (or `"s"`) to prioritize size optimizations.
    - **Link-time optimizations (LTO):** Enable `lto=true` for cross-module optimizations and dead code removal.
    - **Code generation units:** Set `codegen-units=1` for maximum optimizations, though this will increase compile times.
    - **Panic strategy:** Consider `panic="abort"` to remove stack unwinding code if that suits your application's requirements.
3. **Dependency Analysis:** Use `cargo-bloat` to identify dependencies that contribute the most to the binary size.
4. **Understand and Manage Linker Scripts:** Familiarize yourself with the linker script file (`memory.x` or `device.x`) used by your project. Optionally, customize it with `MEMORY`, `ENTRY`, `SECTIONS` directives, and Rust attributes like `#[link_section]` to fine-tune the placement of code and data in the microcontroller's memory.
5. **Analyze Dynamic Memory Usage:** In addition to the static binary size, use tools like `cargo-call-stack` to analyze stack usage at runtime to prevent stack overflows that could lead to system crashes. 6. **Micro-optimizations:** Although less significant than compiler tweaks, small changes to the code such as buffer handling optimizations, idiomatic method chaining, and efficient type conversions can further contribute to code size reduction.
