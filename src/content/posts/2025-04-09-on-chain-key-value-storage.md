---
title: "On-Chain Key-Value Storage"
date: "2025-04-09"
description: "An Anchor program that stores and updates user-defined key-value entries on-chain, a small favorites manager."
tags: ["rust", "solana", "anchor", "project"]
---
A Solana smart contract project that shows how to send, store and update data on-chain using keys. Written in Rust with the Anchor framework.

[GitHub Repository](https://github.com/maltsev-dev/send_data)

The project interacts with a Solana program by writing and updating user-defined data directly on-chain. It is a simple "favorites" manager: users send strings or numbers to the chain, associate them with a unique key, and update those entries later.

It is a good starting point for:

- Understanding persistent on-chain state
- Managing user-specific data using derived accounts
- Creating decentralized CRUD-style apps

## Stack and tools

- Rust, for the Solana smart contract logic
- Anchor, the framework for Solana programs
- A local test validator
- Rust unit and integration tests

## Features

1. Send arbitrary data to the blockchain. Insert a value associated with a custom key.
2. Update stored data by key. Modify entries via a transaction that targets a specific key.
3. A simple chain storage pattern. Uses Solana accounts to persist user-defined values.
4. Full test coverage. Rust-based tests validate the program logic locally.

## Getting started

1. Start a local Solana validator:

   ```bash
   solana-test-validator
   ```

2. Build and deploy:

   ```bash
   anchor build && anchor deploy
   ```

3. Add your wallet:

   ```bash
   export ANCHOR_WALLET=~/.config/solana/id.json
   ```

4. Run the tests:

   ```bash
   cargo test
   ```

5. View the transactions at the local explorer: [http://localhost:8899](http://localhost:8899)

## Use cases

- Store favorite quotes, URLs or topics by key
- Use it as a base for decentralized note-taking or bookmarking
- Extend it with access control and per-user namespaces

## License

This project is licensed under the MIT License, free for personal or commercial use.
