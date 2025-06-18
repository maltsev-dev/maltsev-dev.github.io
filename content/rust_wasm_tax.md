+++
title = "🖥️ Wasm-based Application: Tax Calculator"
date = "2024-10-05"

[taxonomies]
tags = ["rust", "webassembly", "project"]
+++

An experiment using [wasm-bindgen](https://crates.io/crates/wasm-bindgen) to create a WebAssembly program.  
![wasm-bindgen Version](https://img.shields.io/badge/wasm_bingen-0.2.95%20-orange)

<!-- more -->
---

[📚 GitHub Repository]](https://github.com/maltsev-dev/tax_app_webassembly)

<h3 style="text-align:center; margin-bottom:8px;">Tools</h3>
<p align="center" style="margin:0; padding:0;">
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/rust-1.83.0%20-green" alt="Rust Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/wasm_test-0.3%20-orange" alt="Wasm Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://github.com/chemyl/tax_app_webassembly/actions/workflows/rust.yml/badge.svg" alt="Build Status"/>
</p>

### How to build and run:

* Create a library crate:

  ```bash
  cargo new project --lib
  ```
* Add crate type annotation for the compiler:

  ```toml
  [lib]
  crate-type = ["cdylib"]
  ```
* Create a basic `index.html` skeleton and extend the script block to handle loading and interacting with the wasm module.
* Install wasm-pack:

  ```bash
  cargo install wasm-pack
  ```
* Build the project with wasm-pack:

  ```bash
  wasm-pack build --target web
  ```
* Install a simple web server globally (if not installed):

  ```bash
  npm install -g http-server
  ```
* Start the web server from the project root folder:

  ```bash
  http-server .
  ```

{{ img(src = "/media/wasm_tax_app.gif") }}

---

#### **License**

This project is licensed under the [MIT License](https://github.com/maltsev-dev/tax_app_webassembly?tab=MIT-1-ov-file).