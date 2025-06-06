+++
title = "actix_web server"
date = "2024-10-19"

[taxonomies]
tags = ["rust", "actix_web", "project"]
+++

Experiments with [Actix-web](https://crates.io/crates/actix-web)  
This is a basic representation of a backend web-server, designed for use in web applications thanks to its support for WebAssembly.

<!-- more -->
---

# &emsp;&emsp;&emsp; backend server

[📚 raw_web_server](https://github.com/maltsev-dev/raw_web_server)

**Note service** is a binary crate written in Rust.

<h3 style="text-align:center; margin-bottom:8px;">Tools</h3>
<p align="center" style="margin:0; padding:0;">
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/rust-1.83.0%20-green" alt="Rust Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/actix_web-4.0%20-orange" alt="actix_web Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/tokio-1.0%20-orange" alt="tokio version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/sqlx-0.8.2%20-blue" alt="sqlx version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/serde-1.0%20-blue" alt="serde version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://github.com/chemyl/note_service/actions/workflows/rust.yml/badge.svg" alt="Build status"/>
</p>

## &emsp;&emsp;&emsp; 🚀 Features
- 🧮 Async CRUD operations.
- 🌐 Actix-Web core.
- ♻️ sqlx support.

## &emsp;&emsp;&emsp; 📦 Installation
1. Make sure you have [Rust](https://www.rust-lang.org/tools/install)
2. Install `sqlx` tools:
```bash
cargo install sqlx-cli --features sqlite
cargo sqlx prepare 
```
3. Run `sqlx` migration
```bash
cargo sqlx migrate run
```
4. Build and run the project
```bash
cargo build
cargo run
```
5. Open bind http://127.0.0.1:8080

6. Use paths
* GET `/notes` 
* GET `/notes/{id}` 
* POST `/notes`
* PUT`/notes/{id}` 
* DELETE `/notes/{id}`