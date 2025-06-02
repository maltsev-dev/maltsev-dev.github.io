+++
title = "Rust Toolchain"
date = "2025-01-15"

[taxonomies]
tags = ["rust_mastering"]
+++
Everything you need to know about`Rust Toolchain`  
* rustup
* Channels
* Override & Profiling
* Toolchain components
<!-- more -->
---

### 1. rustup
For those who want to start using Rust in their projects, please start here.
  - the basic [Rust](https://www.rust-lang.org/) setup is managed by the `rustup` utility.

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

- To find the path to the toolchain
```bash
> rustup which rustc
C:\..\stable-x86_64-pc-windows-msvc\bin\rustc.exe
```

### 2. Channels
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

### 3. Override & Profiling

- Set `default` toolchain for the system
```bash
    rustup default nightly
```
- To switch the toolchain for a specific project
```bash
    cd project-dir
    rustup override set nightly
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

### 4. Components
- Each installed toolchain can be upgraded with `components`
```bash
    rustup component add clippy fmt rust-src rust-analyzer
    rustup component add llvm-tools-preview
    rustup component add miri
```

- To install a component in _another_ toolchain
```bash
    rustup +nightly component add rustfmt 
```

- Check all installed components on the _active_ toolchain
```bash
    rustup component list 
```

- Remove component from active toolchain
```bash
   rustup component remove clippy
```

### 5. Best Practice
- To ensure that the program runs identically on different machines, it is recommended to use the `rust-toolchain.toml` file.
```toml
[toolchain]
channel = "1.70.0"          # 1.70.0 v on stable channel
components = ["rust-src", "clippy", "rustfmt"]
targets = ["thumbv6m-none-eabi"]

[profile.release]
opt-level = "z"             # size optimization
lto = true                  # link-time optimization
```
Next time `cargo build` will automatically install the required toolchain, components and targets on your machine.


### Afterwords 
Using `rustup` you can install Rust anywhere and configure it in the most appropriate way.
