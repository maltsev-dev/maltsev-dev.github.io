---
title: "Anchor CPI: Cross-Program Invocation on Solana"
date: "2025-03-19"
description: "Two Anchor programs where one calls the other through a CPI, with a System Program transfer alongside it."
tags: ["rust", "solana", "anchor", "project"]
---
A working example of Anchor-based CPI, where one Solana program calls another.

[GitHub Repository](https://github.com/maltsev-dev/anchor_cpi)

The project has two Solana programs, `program-a` and `program-b`. Program A performs a CPI to Program B, and also interacts with the System Program for SOL transfers.

CPI is a building block for modular, reusable smart contracts on Solana. The example suits:

- Developers learning advanced Solana development
- Those building protocol layers or modular dApps
- Projects where multiple programs need to coordinate actions

## Stack and tools

- Rust, the primary language
- Anchor, the Solana framework
- CPI pattern
- Transaction explorer
- Anchor tests with a local validator

## Features

1. Call another program from your program. The CPI pattern with `invoke_signed()` in Anchor.
2. Pass accounts and instruction data. Structured instruction building for inner program calls.
3. Work with the System Program. Shows how to invoke built-in programs, for example SOL transfers.
4. Observe the execution flow. The log output shows the sequence of program interactions.

## Setup and usage

1. Initialize the projects:

```bash
anchor init program-a
cd ..
anchor init program-b
```

2. Configure the dependencies. In `Cargo.toml` of `program-a`, add:

```toml
program-b = { path = "../program-b", features = ["cpi"] }
```

In `Anchor.toml` of `program-a`, disable auto-resolution of dependencies:

```toml
[programs.localnet]
program_b = "..." # Your local key

[workspace.dependencies]
program-b = { path = "../program-b", features = ["cpi"], resolution = false }
```

3. Run the tests:

```bash
anchor build && anchor test
```

4. Start the local validator:

```bash
cd .anchor/
solana-test-validator
```

5. View the transactions:

1. Open [explorer.solana.com](https://explorer.solana.com)
2. Switch to the "Localhost" network
3. Find your transaction signature in the test output logs

## Sample logs

```bash
Program logged: "Instruction: Initialize"
Program logged: "Greetings from: Program A"
Program invoked: System Program
Program returned success
Program invoked: Unknown Program (...)
Program logged: "Instruction: Initialize"
Program logged: "Greetings from: Program B"
Program consumed: 676 of 190087 compute units
Program returned success
```

The logs show the instruction flow through both programs, the System-level interaction, and the success or failure of each step.

## License

This project is licensed under the MIT License. Free to use, modify, and extend.
