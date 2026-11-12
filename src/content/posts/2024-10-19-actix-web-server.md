---
title: "Actix-Web Server"
date: "2024-10-19"
description: "An async RESTful notes service built with Actix-Web, Tokio, SQLx and SQLite: the architecture, the routes and the setup."
tags: ["rust", "actix_web", "project"]
---
A lightweight backend service built with modern Rust web technologies, usable as the backend for a full-stack app or an API-centric one.

[GitHub Repository](https://github.com/maltsev-dev/raw_web_server)

## Tools

- `rust 1.83.0`
- `actix_web 4.0`
- `tokio 1.0`
- `sqlx 0.8.2`
- `serde 1.0`
- [CI](https://github.com/chemyl/note_service/actions/workflows/rust.yml)

The service is a RESTful backend built with the [Actix-Web](https://crates.io/crates/actix-web) framework, handling fast, asynchronous HTTP operations.

The crates it leans on:

- `actix_web` for the web server
- `tokio` for the async runtime
- `sqlx` for SQL database interaction (with SQLite in this case)
- `serde` for data serialization

## Architecture overview

Note Service is structured as a standalone binary crate designed to perform common backend tasks:

- Asynchronous request handling
- Persistent database support via SQLite
- JSON serialization and deserialization
- RESTful route definitions
- Clean separation of logic and data access

## Features

- Fully async, using `tokio` and `actix-web`
- CRUD API for a simple note model:
  - `GET /notes`
  - `GET /notes/{id}`
  - `POST /notes`
  - `PUT /notes/{id}`
  - `DELETE /notes/{id}`
- Database abstraction via `sqlx`
- Ready to run with migrations and seed setup
- Structured error handling and API responses

## Installation and setup

1. Install Rust (if not already):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. Install the `sqlx` CLI:

   ```bash
   cargo install sqlx-cli --features sqlite
   ```

3. Prepare the database:

   ```bash
   cargo sqlx prepare
   cargo sqlx migrate run
   ```

4. Run the server:

   ```bash
   cargo build
   cargo run
   ```

5. Open your browser:

   ```
   http://127.0.0.1:8080
   ```

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notes` | List all notes |
| GET | `/notes/{id}` | Get a specific note |
| POST | `/notes` | Create a new note |
| PUT | `/notes/{id}` | Update an existing note |
| DELETE | `/notes/{id}` | Delete a note |

## Use cases

- A lightweight backend for a frontend SPA (e.g. Yew, React)
- A way to learn real-world Actix patterns
- Boilerplate for full-stack Rust apps with a WebAssembly frontend

## License

This project is licensed under the MIT License, free for personal or commercial use.
