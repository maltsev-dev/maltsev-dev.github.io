---
title: "std web_server"
date: "2024-12-10"
description: "A multi-threaded HTTP server written with the Rust standard library only: thread pool, TCP listener and static file serving."
tags: ["rust", "sync", "project"]
---
A minimal but functional multi-threaded web server implemented entirely with the Rust standard library. No external dependencies, just pure `std`.

[GitHub Repository](https://github.com/maltsev-dev/raw_web_server)

Built with `rust 1.83.0`.

The server shows how to build a basic concurrent HTTP server using only the Rust Standard Library. It covers file `I/O`, `networking`, `threading` and `concurrency`.

It suits systems programmers, backend developers exploring Rust, and students building web server fundamentals.

## Tech stack, std only

The server is powered by a thread pool and handles each TCP connection using:

- `fs`, for serving static HTML files
- `net::{TcpListener, TcpStream}`, for socket connections
- `thread`, to spawn workers
- `sync::{mpsc, Arc, Mutex}`, for shared message passing
- `time::Duration`, for simulated delays (e.g. thread sleeping)
- `io::{BufReader, prelude::*}`, to read and parse incoming streams

## Features

1. Multi-threaded request handling. A built-in thread pool handles requests concurrently.
2. Graceful connection handling. Reads HTTP headers via `BufReader` and routes based on request paths.
3. Static file serving. Serves `.html` files directly from the filesystem.
4. Clean shutdown mechanism. Graceful shutdown via message passing.
5. Zero dependencies. Uses only what `std` offers, which is a good way to see how the pieces work under the hood.

## Project structure

- `main.rs`, entry point, sets up the listener and the thread pool
- `lib.rs`, contains the thread pool implementation
- `static/`, directory for HTML files (index.html, 404.html, etc.)

## Example usage

```bash
cargo run
```

Then open your browser and go to:
`http://localhost:7878`

To simulate a delayed response, access the route `/sleep`. One thread will sleep for 5 seconds.

## Educational value

This project mirrors the concepts from "The Rust Programming Language" book (Chapter 20), but it goes further with:

- Better thread pool abstraction
- Error handling improvements
- Project-ready formatting

Use it to:

- Learn how a basic HTTP server works
- Build custom functionality (routes, MIME types, logging, etc.)
- Extend toward an async runtime by comparing with `tokio` later

## License

This project is licensed under the MIT License. Feel free to build on it, fork it, or turn it into something bigger.
