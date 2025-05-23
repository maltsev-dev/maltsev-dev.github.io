+++
title = "Rust Toolchain"
date = "2025-01-15"

[taxonomies]
tags = ["rust_mastering"]
+++

A Series of Rust concepts every developer should master 🥋  E01 - `Rust Toolchain`
<!-- more -->
---

- If you want to use [Rust](https://www.rust-lang.org/) for your projects, you need to start by installing `rustc` (the powerful Ahead-Of-Time (AOT) Rust compiler).
Also, for each Rust target, you need to install the corresponding `rust-std` (the standard Rust library). 
- To support the compilation process, you need to install a few more dependencies - (`rustfmt`, `clippy`, `rls`/`rust-analyzer`, etc.)


### rustup
If at this point you haven't given up on the idea of trying Rust, I have good news for you - the entire initial installation is managed by the `rustup` utility.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
This will install `rustup`, `rustc`, `cargo` and configure `$PATH`.
By default, the host platform targets are installed (e.g. `x86_64-pc-windows-msvc`)

- To get a list of installed toolchains and check the active one
```bash 
>  rustup toolchain list
stable-x86_64-pc-windows-msvc (active, default)
1.74.0-x86_64-pc-windows-msvc
```

- Or a command that will display additional information about installed tagrets.
```bash
> rustup show
Default host: x86_64-pc-windows-msvc
rustup home:  C:\Users\A\.rustup

installed toolchains
--------------------
stable-x86_64-pc-windows-msvc (active, default)
1.74.0-x86_64-pc-windows-msvc

active toolchain
----------------
name: stable-x86_64-pc-windows-msvc
active because: it's the default toolchain
installed targets:
thumbv6m-none-eabi
wasm32-unknown-unknown
x86_64-pc-windows-msvc
```

- To find where the toolchain
```bash
> rustup which rustc
C:\Users\A\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin\rustc.exe
```

### Channels
- Rust is developed in 3 parallel branches
  - **stable** — the most reliable, updated every `6 weeks`
  - **beta** — a “preview” of the next stable, updated every 6 weeks
  - **nightly** — daily builds, including the latest (but unstable) features
  - **custom** — custom versions of Rust

- To install any of the channels
``` bash 
    rustup toolchain install stable
    rustup toolchain install beta
    rustup toolchain install nightly
```

```
 File  .text Size  Crate      Function
 50.2%  45.3KB std::io::_print
 12.3%  11.2KB core::fmt::Formatter::write_str
 ...
```



- To update the corresponding toolchains
```bash
    rustup update stable
    rustup update beta
    rustup update nightly
```

- To install the exact version
```bash
    rustup install 1.74.0-x86_64-pc-windows-msvc 
```

### Override & Profiling

- To switch the toolchain in the whole system
```bash
    rustup default nightly
```
- To switch the toolchain for a specific project
```bash
    cd project-dir
    rustup override set beta
```

- **Custom profiles**  
  In `~/.cargo/config.toml` you can set profiles:

    ```toml
    [profile.dev]
    debug = true
    incremental = true
    
    [profile.release]
    opt-level = 3
    debug = false
    lto = "fat"
    panic = "abort"
    ```

### Components
- Each installed toolchain can be supplemented with the necessary components
```bash
    rustup component add clippy fmt rust-src rust-analyzer
    rustup component add llvm-tools-preview
    rustup component add miri
```

- To install a component in another toolchain, even if it is not active
```bash
    rustup +nightly component add rustfmt 
```

- Check all installed components on the active toolchain
```bash
    rustup component list 
```

- Remove component from active toolchain
```bash
   rustup component remove clippy
```

### Best Practice
- To ensure that the program runs identically on different machines for all participants who have cloned the repository, you can add a file to the project that will be processed by the `cargo build` command.
`rust-toolchain.toml`
```toml
[toolchain]
channel = "1.70.0"          # 1.70.0 v on stable channel
components = ["rust-src", "clippy", "rustfmt"]
targets = ["thumbv6m-none-eabi"]

[profile.release]
opt-level = "z"             # size optimization
lto = true                  # link-time optimization
```
This will automatically install the required toolchain, components and targets.


### afterwords 
Using `rustup` you can install Rust anywhere and configure it in the most appropriate way.
