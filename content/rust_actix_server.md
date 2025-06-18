+++
title = "🌐 Actix-Web Server"
date = "2024-10-19"

[taxonomies]
tags = ["rust", "actix_web", "project"]
+++

**A lightweight backend service built with modern Rust web technologies, ideal for full-stack or API-centric applications.**

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/raw_web_server)
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

This project showcases a **RESTful backend service** built with the [Actix-Web](https://crates.io/crates/actix-web) framework, ideal for handling fast, asynchronous HTTP operations.

It uses modern, production-ready Rust technologies like:

* `actix_web` for the web server
* `tokio` for async runtime
* `sqlx` for SQL database interaction (with SQLite in this case)
* `serde` for data serialization

---

## 🔧 Architecture Overview

**Note Service** is structured as a standalone binary crate designed to perform common backend tasks:

* Asynchronous request handling
* Persistent database support via SQLite
* JSON serialization/deserialization
* RESTful route definitions
* Clean separation of logic and data access

---

## 🚀 Features

* ✅ **Fully async** using `tokio` and `actix-web`
* 📄 **CRUD API** for a simple note model:

  * `GET /notes`
  * `GET /notes/{id}`
  * `POST /notes`
  * `PUT /notes/{id}`
  * `DELETE /notes/{id}`
* 🗃️ **Database abstraction** via `sqlx`
* 🧪 **Ready-to-run with migrations and seed setup**
* 🧼 **Structured error handling and API responses**

---

## ⚙️ Installation & Setup

### 1. Install Rust (if not already):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install `sqlx` CLI:

```bash
cargo install sqlx-cli --features sqlite
```

### 3. Prepare the database:

```bash
cargo sqlx prepare
cargo sqlx migrate run
```

### 4. Run the server:

```bash
cargo build
cargo run
```

### 5. Open your browser:

```
http://127.0.0.1:8080
```

---

## 🌐 API Endpoints

| Method | Endpoint      | Description             |
| ------ | ------------- | ----------------------- |
| GET    | `/notes`      | List all notes          |
| GET    | `/notes/{id}` | Get a specific note     |
| POST   | `/notes`      | Create a new note       |
| PUT    | `/notes/{id}` | Update an existing note |
| DELETE | `/notes/{id}` | Delete a note           |

---

## 💡 Use Cases

* As a lightweight backend for a frontend SPA (e.g., Yew, React)
* Great for learning real-world Actix patterns
* Boilerplate for full-stack Rust apps with WebAssembly frontend

---

## 📄 License

This project is licensed under the **MIT License** — free for personal or commercial use.