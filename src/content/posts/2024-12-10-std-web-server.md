---
title: "🌐 std web_server"
date: "2024-12-10"
tags: ["rust", "sync", "project"]
---
**Minimal yet functional multi-threaded web server implemented entirely using the Rust standard library.**
No external dependencies — just pure `std`.

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/raw_web_server)
![Rust Version](https://img.shields.io/badge/rust-1.83.0%20-green)

This project demonstrates how to build a basic but concurrent HTTP server by leveraging only the **Rust Standard Library**.  
It serves as a deep dive into Rust’s core capabilities around file `I/O`, `networking`, `threading`, and `concurrency`.  

An excellent hands-on learning example for:

* Systems programmers
* Backend developers exploring Rust
* Students building web server fundamentals

---

## 🛠 Tech Stack – std Only

The server is powered by a **thread pool** and handles each TCP connection asynchronously using:

* 📂 `fs` – for serving static HTML files
* 🔗 `net::{TcpListener, TcpStream}` – for socket connections
* 🧵 `thread` – to spawn workers
* 📦 `sync::{mpsc, Arc, Mutex}` – for shared message passing
* 🕒 `time::Duration` – for simulated delays (e.g., thread sleeping)
* 📖 `io::{BufReader, prelude::*}` – to read and parse incoming streams

---

## ✨ Features

1. **Multi-threaded request handling**

   * Built-in thread pool to handle requests concurrently.

2. **Graceful connection handling**

   * Supports reading HTTP headers via `BufReader` and routing based on request paths.

3. **Static file serving**

   * Can serve `.html` files directly from the filesystem.

4. **Clean shutdown mechanism**

   * Implements graceful shutdown via message passing.

5. **Zero dependencies**

   * Uses only what `std` offers — perfect for understanding how things work under the hood.

---

## 📂 Project Structure

* `main.rs` – entry point, sets up listener and thread pool
* `lib.rs` – contains thread pool implementation
* `static/` – directory for HTML files (index.html, 404.html, etc.)

---

## 🧪 Example Usage

```bash
cargo run
```

Then open your browser and go to:
`http://localhost:7878`

To simulate a delayed response:

* Access route `/sleep` — one thread will sleep for 5 seconds.

---

## 🧠 Educational Value

This project mirrors the concepts from "The Rust Programming Language" book (Chapter 20), but it goes further with:

* Better thread pool abstraction
* Error handling improvements
* Project-ready formatting

Use it to:

* Learn how a basic HTTP server works
* Build custom functionality (routes, MIME types, logging, etc.)
* Extend toward async runtime by comparing with `tokio` later

---

## 📄 License

This project is licensed under the **MIT License** — feel free to build on it, fork it, or turn it into something bigger.