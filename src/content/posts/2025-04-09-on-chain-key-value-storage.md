---
title: "📦 On-Chain Key-Value Storage"
date: "2025-04-09"
tags: ["rust", "solana", "anchor", "project"]
---
**A Solana smart contract project that demonstrates how to send, store, and update data on-chain using keys.**
Built with **Rust** and the **Anchor** framework.

<!-- more -->
---

[📚 GitHub Repository](https://github.com/maltsev-dev/send_data)

This project explores how to interact with a **Solana program** by writing and updating user-defined data directly on-chain.
It simulates a simple **“favorites” manager** — where users can send strings or numbers to the chain, associate them with a unique key, and later update those entries.

A great starting point for:

* Understanding persistent on-chain state
* Managing user-specific data using derived accounts
* Creating decentralized CRUD-style apps

---

## 🧰 Stack & Tools

* 🦀 **Rust** (Solana smart contract logic)
* ⚓ **Anchor** (framework for Solana programs)
* 🧪 **Local test validator**
* 🧪 **Rust unit/integration tests**

---

## ✨ Features

1. **Send Arbitrary Data to the Blockchain**

   * Insert a value associated with a custom key.

2. **Update Stored Data by Key**

   * Modify entries via a transaction that targets a specific key.

3. **Simple Chain Storage Pattern**

   * Uses Solana accounts to persist user-defined values.

4. **Full Test Coverage**

   * Rust-based tests validate program logic locally.

---

## 🚀 Getting Started

### 1. 🧪 Start Local Solana Validator

Spin up a local blockchain testnet:

```bash
solana-test-validator
```

### 2. 🛠 Build and Deploy

Compile and deploy the Anchor program:

```bash
anchor build && anchor deploy
```

### 3. 👛 Add Wallet

Set your Solana CLI wallet path:

```bash
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 4. ✅ Run Tests

Ensure everything works as expected with:

```bash
cargo test
```

### 5. 🔍 View Transactions

Access the local explorer to track activity:
[http://localhost:8899](http://localhost:8899)

---

## 🧠 Use Cases & Ideas

* ⭐ Store favorite quotes, URLs, or topics by key
* 🧾 Use it as a base for decentralized note-taking or bookmarking
* 🔑 Extend it with access control and per-user namespaces

---

## 📄 License

This project is licensed under the **MIT License** — free for personal and commercial use.