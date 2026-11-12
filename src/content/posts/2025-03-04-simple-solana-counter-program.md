---
title: "Simple Solana Counter Program"
date: "2025-03-04"
description: "A minimal native Rust Solana program that increments and decrements an on-chain counter owned by the user's keypair."
tags: ["rust", "solana", "project"]
---
A lightweight, native Solana smart contract for incrementing and decrementing a counter, written in Rust.

[GitHub Repository](https://github.com/maltsev-dev/counter_on_native_solana)

The program is a minimal Solana on-chain program written in native Rust. The core functionality is a counter:

- Increment the counter by sending a transaction
- Decrement the counter in the same way
- State is stored on-chain and owned by the user's keypair
- Built using low-level Solana primitives, with no Anchor framework on-chain, which makes it a good way to learn the core mechanics

It suits developers who want to:

- Understand how to work with Solana's native runtime
- Learn the basics of account handling, transaction flow and state management
- Use it as a boilerplate to build more complex programs

## How to get started

1. Start a local Solana validator:

   ```bash
   solana-test-validator
   ```

2. Build and deploy the program:

   ```bash
   anchor build && anchor deploy
   ```

Anchor is used for deployment and local testing convenience, although the on-chain code is native Rust.

3. Set up your wallet:

   ```bash
   export ANCHOR_WALLET=~/.config/solana/id.json
   ```

4. Interact with the program. Once deployed, you can send transactions to:

   - Increment the stored counter
   - Decrement the counter
   - Fetch and log the current value

   These actions can be scripted in TypeScript/JavaScript using the Anchor client or done manually with the `solana` CLI.

## License

This project is open-source and available under the terms of the MIT License. Feel free to fork, modify, and use it for both personal and commercial purposes.
