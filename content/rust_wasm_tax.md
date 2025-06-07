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
### &emsp;&emsp;&emsp; Wasm-based app. Tax Calculator

[📚 Tax WebAssembly](https://github.com/maltsev-dev/tax_app_webassembly)

<h3 style="text-align:center; margin-bottom:8px;">Technologies Used</h3>
<p align="center" style="margin:0; padding:0;">
  <img src="https://img.shields.io/badge/rust-1.82.0%20-green" alt="Rust Version"/>
  <img src="https://img.shields.io/badge/wasm_test-0.3%20-orange" alt="Wasm Version"/>
  <img src="https://github.com/chemyl/tax_app_webassembly/actions/workflows/rust.yml/badge.svg" alt="Build Status"/>
</p>

- create library crate -> `cargo new project --lib`
- add library annotation for compiler ->` [lib] crate-type = ["cdylib"]`
- create skeleton inside `index.html` and extend `script block` with logic of working with wasm inclusion
- install wasm-pack -> `cargo install wasm-pack`
- build project with wasm-pack -> `wasm-pack build --target web`
- include web server -> `npm install -g http-server`
- start server in project root folder -> `http-server .`

{{ img(src = "/media/wasm_tax_app.gif") }}