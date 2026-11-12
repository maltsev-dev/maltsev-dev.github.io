---
title: "From Rust source code to optimized executable: inside the Rust compiler pipeline"
date: "2025-05-27"
tags: ["rust", "compilers", "aot"]
---
Rust turns source code into a machine-executable binary through a pipeline of intermediate representations. Each representation is more abstract than the last, until the backend hands LLVM something it can turn into instructions for a specific CPU. The stages are worth knowing about, because each one is where a particular guarantee gets enforced or a particular size saving gets made.

## Lexing and parsing

The compiler takes the program as raw `Unicode UTF-8` text and converts it into a `TokenStream`. This first step is lexical analysis, and it is implemented mainly in the [`rustc_lexer`](https://doc.rust-lang.org/stable/nightly-rustc/rustc_lexer/index.html) crate. The lexer identifies and categorizes the "words" and "symbols" (lexemes) in the code: keywords (e.g. `int`, `if`), identifiers (e.g. `x`, `y`), numeric literals (e.g. `5`, `10`), operators (e.g. `=`, `+`) and punctuation marks (e.g. `;`, `(`, `{`).

Procedural macros that operate on a `TokenStream` need access to the underlying token structure, including their ranges, to generate correct and properly attributed code. Preserving that level of detail from the start is what lets compile-time code generation work at all.

The parser then transforms the linear sequence of tokens into a hierarchical, tree-like structure known as the Abstract Syntax Tree (AST). Each node in the AST represents a syntactic construct in a Rust program (e.g. an expression, a statement, a function definition). Each AST node is associated with a `Span`, which links it to its original location in the source text, and a `NodeId`.

The `rustc` parser, implemented in the [`rustc_parse`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_parse/index.html) crate, uses a recursive descent (top-down) approach.

The [`rustc_ast`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_ast/index.html) crate defines the AST node types: `Crate` (the root compilation block), `Expr` (expressions), `Pat` (templates), `Item` (top-level elements such as functions and structs), `Stmt` (operators), `FnDecl` (function declarations), `Generics` (generic parameters), `Local` (local `let` bindings), `MacCall` (macro calls), and `Path` (names and paths in code).

The AST is designed to represent "almost exactly what the user wrote", and that is what makes it the primary input for macro expansion. Declarative `macro_rules!` matches patterns against the syntactic structure of the input code, so a heavily desugared or transformed AST would leave macros without the syntactic context they need.

## Macro expansion and name resolution

Macro expansion and name resolution are early semantic transitions that are closely coupled with the lexical and syntactic analysis steps. They are performed concurrently or iteratively as the compiler builds the AST.

Macro expansion happens at parse time. When the regular Rust parser encounters a macro call, it defers its contents. Later, but still before a full name resolution pass, these macros are expanded. For declarative `macro_rules!`, this involves matching patterns against token trees and replacing them with generated code. Procedural macros take a `TokenStream` as input, process it programmatically, and produce a new `TokenStream` as output. The resulting `TokenStream` is re-parsed and integrated back into the AST. The expansion process can be iterative, since the newly generated code may contain further macro calls that need to be expanded.

Name resolution links all symbolic references in the code (e.g. variables, types, functions, modules, macros, lifetimes) to their final declarations. In Rust it is a two-phase process.

1. Gathering phase (early resolution). This phase is performed during macro expansion. For each crate, a special structure called `CrateDefMap` is built, storing all the elements available in the module. This is achieved with a "fixed-point iteration algorithm" where macros are iteratively expanded and imports are resolved until no further changes occur. This partial resolution is necessary to determine which macros need to be expanded at all. The fixed-point iteration used during the gathering phase for `CrateDefMap` is not incremental in nature, which means that any change that may affect name resolution (such as adding a new element) requires rebuilding the `CrateDefMap`.
2. Resolution phase (full resolution). After the entire AST (with all expanded macros) has been built, a full name resolution pass (`rustc_resolve::late`) traverses the syntax tree. It establishes links from each name in the source code to its corresponding definition.

AST checking and early linting happen at the same time as macro expansion and name resolution. AST checking is a separate pass that performs simple structural checks on the tree, ensuring that each element is in the correct state according to the basic rules of the language (for example, checking that a function has at most `u16::MAX` parameters). These checks are syntactic and do not involve complex type analysis or full name resolution. Early linting catches simple, common problems before deeper semantic analysis begins.

To expand a macro, the compiler first needs to determine which macro is being called (which requires macro name resolution), and then process its arguments, which themselves may contain unresolved names or even other macro calls. This creates a circular dependency: name resolution requires the expanded code, but macro expansion depends on some level of name resolution. The "fixed-point iteration algorithm" is a solution to this dependency: the compiler repeatedly performs partial name resolution and macro expansion until no new macros are found and all top-level imports are resolved. This ensures that all "source code" (including all generated code) is fully formed and all top-level names are resolved before the compiler moves on to deeper semantic analysis.

The "source code" that subsequent stages of the compiler operate on is therefore not the literal text written by the user, but a fully expanded and resolved version. This allows for the rich abstractions and domain-specific language (DSL) features seen in Rust (e.g. `println!`, `vec!`, `#[derive]` macros).

## HIR and semantic analysis

The next step transforms the concrete AST into a more abstract High-Level Intermediate Representation (HIR). This step focuses on desugaring syntactic constructs and performing basic semantic analysis, including type checking, type inference, and trait resolution.

The transformation is formally called "lowering". HIR is a "compiler-friendly representation of the AST" and is "the core IR used in most of `rustc`". Various high-level syntactic conveniences or "syntactic sugar" constructs are extended and formalized into more fundamental, explicit forms. The structure of HIR is defined in the [`rustc_hir`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_hir/index.html) crate.

Examples of desugaring:

- `for` and `while let` loops are converted to more basic `loop` constructs combined with `match` statements.
- `if let` expressions are converted to equivalent `match` statements.
- Asynchronous functions (`async fn`) are desugared into their basic state machine representations.

HIR also makes explicit certain implicit elements, such as omitted lifetimes, which are critical for subsequent type checking.

To handle the instability of `NodeIds`, HIR introduces more stable identifiers:

- `DefId` uniquely identifies a particular definition (e.g. a function, struct, or enum) across all crates. It consists of a `CrateNum` (identifying the crate) and a `DefIndex` (identifying the definition within that crate), providing stability across minor code changes.
- `LocalDefId` is a specialized `DefId` that is guaranteed to refer to a definition within the currently compiled crate.
- `HirId` uniquely identifies any node in the HIR of the current crate. It consists of an `owner` (usually the `DefId` of the enclosing element) and a `local_id` that is unique only within that `owner`. This hierarchical structure ensures that changes outside the scope of an `owner` do not affect `HirId`s within that `owner`, making `HirId`s significantly more stable than `NodeId`s for incremental compilation.

## Type inference, type checking, trait resolution

When a program is converted to HIR, the `rustc` compiler performs basic semantic analysis to provide the Rust type system.

Type inference. Rust infers the type of a value based on the context in which it is used, using the [Hindley-Milner type inference algorithm](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system), which operates on the principle of unification. The compiler collects type constraints from the code and attempts to unify them to determine concrete types.

Type checking. After type inference, the compiler verifies the type safety, correctness, and consistency of the entire program. It involves converting the types identified in HIR (`hir::Ty`) to the compiler's internal, canonical representation of types (`Ty<'tcx>`). This ensures that all operations are performed on compatible types, preventing a large subset of runtime errors such as calling methods on incorrect types or performing arithmetic operations on incompatible data.

Trait resolution. This maps a concrete `impl` (implementation) to each `trait` reference, ensuring that all required trait methods are available on a given type, and that method calls are dispatched correctly, whether through static or dynamic means. This is how Rust resolves generic constraints and determines concrete method implementations at compile time.

This is what Rust's "zero-cost abstractions" philosophy means in practice. The "cost" of type safety and powerful generics is mostly paid at compile time, not runtime, which is how Rust programs reach performance levels comparable to C/C++ while providing much stronger guarantees against common programming errors. The combination of early desugaring, type checking, and trait resolution on HIR is what the later analyses, such as borrow checking, are built on.

## MIR and borrow checking

This step introduces MIR, a highly simplified control flow graph-based representation that is the basis for Rust's memory safety guarantees, in particular borrow checking, as well as various compiler optimizations.

HIR is converted to MIR. This downgrade often involves an intermediate step via Typed HIR (THIR), which is an even more desugared and fully typed version of HIR, making subsequent conversion to MIR easier.

MIR is a radically simplified and explicit form of Rust code, specifically designed to perform flow-sensitive safety checks (in particular, borrow checking), as well as various compiler optimizations and constant computation. Its key characteristics are:

- Basic control flow graph (CFG). MIR represents a program as a [control flow graph](https://en.wikipedia.org/wiki/Control-flow_graph), a directed graph consisting of "basic blocks" connected by control flow edges. Each basic block contains a sequence of simple statements that are executed without jumping, ending with a single "terminal" instruction that dictates the flow of control (e.g. conditional jumps, function calls). Loops in the source code are explicitly represented as loops within this CFG.
- No nested expressions. Complex, nested expressions from the source code are broken down into a sequence of simple, sequential statements.
- Fully explicit types. Unlike earlier IRs that could have implicit type information, all types in MIR are fully explicit and unambiguous.
- Indexed local variables and locations. Variables are no longer named by their original names, but by numeric indices (e.g. `_1`, `_2`) representing memory locations conceptually allocated on the stack. This includes function arguments, local variables, and temporary values. The special local variable `_0` is reserved for the return value of a function.

The radical simplification from HIR to MIR is a necessary step. The CFG models all possible execution paths, which allows the compiler to track the state of memory locations (e.g. initialized, borrowed, moved) with extreme precision on a per-branch and per-loop basis.

MIR's explicitness and the CFG structure are also what allow the use of "non-lexical lifetimes" (NLLs). These are regions derived from the control flow graph rather than strict lexical scopes, which results in more flexible and ergonomic borrowing rules for the programmer.

The borrow checker, implemented in the [`rustc_borrowck`](https://doc.rust-lang.org/stable/nightly-rustc/rustc_borrowck/index.html) crate, is the most distinctive feature of Rust, responsible for ensuring memory safety without using a garbage collector. It works directly with the MIR. Its main responsibilities include:

- Ensure that all variables are initialized before use.
- Prevent values from being moved around again.
- Prevent a value from being moved while it is borrowed.
- Prevent access to a location while it is mutably borrowed, and vice versa (the "one mutable reference OR many immutable references" rule for overlapping scopes).

The `mir_borrowck` request serves as the main entry point for the borrow checking process. The main phases include:

1. Create local copy of MIR. A local copy of MIR is created for analysis.
2. Replace regions. All existing regions in MIR are replaced with new output variables.
3. Data flow analysis. Various data flow analyses are performed to determine when and what data is moved.
4. Second type check. Type checking over MIR determines the constraints between different regions.
5. Infer regions. The values of each region are computed, identifying the points in the control flow graph where each lifetime should remain valid based on the collected constraints.
6. Compute scope borrows. The "scope borrows" at each point in MIR are computed.
7. Pass MIR to report errors. A final pass over MIR examines the actions and reports errors if memory safety rules are violated.

Borrow checking, which works with a precise, flow-sensitive MIR, shifts the burden of memory correctness to compile-time static analysis instead of runtime garbage collection (with its associated performance overhead and non-determinism) or manual memory management (prone to human errors like use after free or double free). Catching a wide range of memory-related bugs (e.g. data races, dangling pointers, use-after-frees) at compile time significantly reduces the need for extensive debugging and testing of memory errors at runtime, and the absence of runtime overhead associated with garbage collection or reference counting makes Rust suitable for performance-critical applications where predictability is key.

## MIR optimizations

After the critical borrow checking phase, a number of optimization passes are performed on MIR to further improve it before the final code generation phase.

The key advantage of performing optimizations at the MIR stage is that the MIR is still generalized; it has not yet been monomorphized. Optimizations applied to the generalized MIR (such as constant propagation) are therefore effective for all future concrete instances of the generalized functions.

The [`rustc_mir_transform`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_mir_transform/index.html) crate contains many of these optimization passes. Examples of common ones:

- `CleanupPostBorrowck` removes information from the MIR that was only needed for previous analyses (such as borrow checking) but is no longer needed for code generation.
- `ConstProp` (constant propagation) replaces variable usages with known constant values.
- `SimplifyCfg` simplifies the control flow graph.

These passes are often grouped and executed within specific queries, such as the `optimized_mir` query, which generates the final optimized MIR for a given definition. The compiler performs optimizations once for the generic code, rather than multiple times for each monomorphized version. This design significantly reduces compilation times for projects with extensive generic code and hands LLVM a cleaner, more refined IR, reducing its own optimization burden.

## Code generation

This final major stage of the `rustc` compiler involves translating the highly optimized MIR into executable machine code, using [LLVM](https://en.wikipedia.org/wiki/LLVM) for architecture-specific transformations and extensive optimizations.

The optimized MIR is transformed into LLVM Intermediate Representation (LLVM IR), and this is the critical step where "monomorphization" occurs. Rust generics are handled via monomorphization, where generic code (e.g. function `fn foo<T>(x: T)`) is instantiated with concrete types for each unique use (e.g. `foo::<i32>`, `foo::<String>`). Monomorphization happens lazily, meaning instances are only generated when they are actually needed and used. The [`rustc_monomorphize::collector`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_monomorphize/collector/index.html) module is responsible for discovering all the "monoelements" (functions, methods, closures, static variables, remover glue) that will contribute to code generation for the current crate.

LLVM IR is a well-defined, platform-independent, and typed assembly language. It is designed to be easily generated by various language frontends (such as `rustc`, which is essentially an LLVM frontend), and is rich enough that LLVM can perform extensive optimizations on it. LLVM IR can be output in human-readable text format (`.ll` files) or in a more compact bytecode format (`.bc` files).

Once Rust code is converted to LLVM IR, LLVM takes over as the primary optimization engine. It performs a rich set of complex, language-independent, and architecture-independent optimization passes:

- Dead code removal: removing unreachable code or code that does not affect the program output.
- Constant propagation: replacing variables with their constant values where possible.
- Inlining: replacing function calls with the body of the called function to reduce the overhead of the call and allow for further optimizations.
- Loop optimizations: such as loop unrolling, moving invariant code out of loops, and reducing the power of operations.

`rustc` provides several command-line flags for inspecting and debugging LLVM IR and its optimization passes: `-C llvm-args` (to pass arbitrary arguments to LLVM), `-Z print-llvm-passes` (to print a list of the passes being executed), `-Z time-llvm-passes` (to measure the time spent on each pass), and `-Z verify-llvm-ir` (to verify the correctness of the IR).

After LLVM has performed its optimizations on LLVM IR, its target-independent code generator transforms the optimized IR into target-specific machine code. This process involves several subphases:

- Instruction fetching: translating the abstract LLVM IR instructions into concrete machine instructions for the target CPU. This often involves transforming the IR into a [directed acyclic graph (DAG)](https://ericsink.com/vcbe/html/directed_acyclic_graphs.html) of the target instructions.
- Register allocation: assigning physical CPU registers to the virtual registers used in the intermediate machine code.
- Instruction scheduling: reordering instructions to optimize pipeline utilization and minimize latency on the target CPU, which is critical to maximizing parallelism within the processor.

The output of this stage is platform-specific assembler code, which is then assembled into object files (`.o` or `.obj` files). Object files contain machine code, data, relocation information, and symbol tables. They are self-contained units of compiled code and data, but they are not yet executable. They contain unresolved references to external symbols (such as functions from other compilation units or libraries), which are the job of the linker to resolve.

Register allocation matters for performance, since CPU registers are the fastest locations in memory. Instruction scheduling reorders operations to keep the CPU execution units busy, exploiting parallelism within the processor.

## Linking

The final stage of the compilation process involves combining all the compiled object files and required libraries into a single executable binary file or shared library. This is done by the linker.

The main difference between static and dynamic linking is when external deps (e.g. functions from libraries) are resolved, and the choice is a deployment decision with real consequences.

- Static linking resolves at compile time. All required library code is built directly into the final executable. The result is a larger, self-contained binary that does not depend on external library files at runtime. This makes deployment easier ("no guesswork"), but makes patching and hotfixing more difficult.
- Dynamic linking resolves at runtime. The executable contains references to external libraries that are loaded into memory when the program starts. The result is smaller binaries, and multiple programs can share a single copy of the library in memory, saving resources. It also makes it easier to update or patch libraries without recompiling the main application. The cost is runtime dependencies and potential [DLL hell](https://en.wikipedia.org/wiki/DLL_hell) issues if the required library versions are missing or incompatible on the target system.

`rustc` supports various `crate-type` options for linking:

- `bin`, the default executable that links Rust and native dependencies.
- `dylib`, Rust's dynamic library.
- `staticlib`, a static system library.
- `cdylib`, a dynamic system library for other languages.

`rlib` files are intermediate "Rust static libraries" that contain metadata for future `rustc` linking.

The culmination of the entire pipeline is an executable binary (or shared library). This file contains the machine code, data, and the necessary metadata for the operating system to load and execute the program. For executables, it includes the entry point (e.g. the `main` function) where the operating system begins execution. The format of the executable binary is platform-specific (e.g. ELF on Linux, PE/COFF on Windows, Mach-O on macOS).

## The intermediate representations side by side

| IR | Input source | Key points | Main goal and analysis | Example | rustc module |
|---|---|---|---|---|---|
| AST | Rust source code (text) | Accurately reflects user syntax; contains `NodeId` and `Span` for linking to source code | Syntax checking; macro expansion; initial name resolution | - | `rustc_ast` |
| HIR | AST | Desugared AST; more compiler-friendly; includes implicit elements (e.g. omitted lifetimes); uses `DefId`/`HirId` for stability | Type inference; type checking; trait resolution | The `for` loop is transformed into `loop + match` | `rustc_hir` |
| MIR | HIR (through THIR) | Radically simplified; based on control flow graph (CFG); no nested expressions; explicit types; generic | Checking for borrows; checking data flow; MIR optimizations; calculating constants | High-level operations are broken down into basic blocks | `rustc_middle/src/mir` |
| LLVM IR | MIR | Typed assembly language; platform independent; rich in LLVM optimizations | Monomorphization; LLVM optimizations; machine code generation | Generics are transformed into specific instances | `rustc_codegen_ssa` |
