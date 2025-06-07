+++
title = "Anchor CPI"
date = "2025-03-19"

[taxonomies]
tags = ["rust", "solana", "anchor", "project"]
+++

Cross Program Invocations (CPIs) allow one program to invoke instructions on another program.  
<!-- more -->
---
[📚 Anchor CPI Example](https://github.com/maltsev-dev/anchor_cpi)

The process of implementing a CPI is the same as that of creating a instruction where you must specify:
    1. The program ID of the program being called
    2. The accounts required by the instruction
    3. Any instruction data required as arguments

This pattern ensures the CPI has all the information needed to invoke the target program's instruction.

The System Program's transfer instruction requires two accounts:

    `from`: The account sending SOL.
    `to`: The account receiving SOL.

### &emsp;&emsp;&emsp; Anchor CPI
_invoke_signed()_

#### &emsp;&emsp;&emsp; Setup
```bash
1. anchor init program-a  cd program-b
2. anchor new program-b
3. Cargo.toml (program-a) add dependencies to program-b -> program-b = {path = "../program-b", features= ["cpi"]}
4. Anchor.toml - set resolution to false
```
#### &emsp;&emsp;&emsp; Run tests
```bash
anchor build && anchor test
```

#### &emsp;&emsp;&emsp; Start Local Validator
```rust
cd .anchor/
solana-test-validator
```

#### &emsp;&emsp;&emsp; Explorer
1. open explorer.solana  
2. switch to localhost  
3. find test output transaction signature

#### &emsp;&emsp;&emsp; Expected Output
```bash
> Program logged: "Instruction: Initialize"
> Program logged: "Greetings from: Program A"
> Program invoked: System Program
> Program returned success
> Program invoked: Unknown Program (6grzSV1SpnQjt9Jf7cMtqQDUqaC7SZDXvKE5GCGrVHxZ)
> Program logged: "Instruction: Initialize"
> Program logged: "Greetings from: Progrma B"
> Program consumed: 676 of 190087 compute units
> Program returned success
> Program consumed: 10862 of 200000 compute units
> Program returned success
```

#### &emsp;&emsp;&emsp; **License**
This project is licensed under the MIT License 