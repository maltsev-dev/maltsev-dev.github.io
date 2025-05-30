+++
title = "WASM here"
date = "2024-10-05"

[taxonomies]
tags = ["rust", "webassembly", "project"]
+++

The result of an experiment with a [wasm-bindgen](https://crates.io/crates/wasm-bindgen) to create a WebAssembly Program.  
![wasm-bindgen Version](https://img.shields.io/badge/wasm_bingen-0.2.95%20-orange)
<!-- more -->
---

[📚 Tax WebAssembly](https://github.com/maltsev-dev/tax_app_webassembly)

![Rust Version](https://img.shields.io/badge/rust-1.82.0%20-green)
![serde Version](https://img.shields.io/badge/wasm_test-0.3%20-orange)
![Build Status](https://github.com/chemyl/tax_app_webassembly/actions/workflows/rust.yml/badge.svg)

- create library crate -> `cargo new project --lib`
- add library annotation for compiler ->` [lib] crate-type = ["cdylib"]`
- create skeleton inside `index.html` and extend `script block` with logic of working with wasm inclusion
- install wasm-pack -> `cargo install wasm-pack`
- build project with wasm-pack -> `wasm-pack build --target web`
- include web server -> `npm install -g http-server`
- start server in project root folder -> `http-server .`

{{ img(src = "/media/wasm_tax_app.gif") }}