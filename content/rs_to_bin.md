+++
title = "From Rust Source to Executable"
date = "2025-05-27"

[taxonomies]
tags = ["rust", "compilers", "aot"]
+++

The `rustc` compiler manages a complex, multi-stage process that transforms human-readable Rust source code into highly optimized, machine-executable binaries.  
This multi-layered pipeline is fundamental to Rust's core promises: memory safety without GC, high performance, and robust concurrency.

<!-- more -->
---
### I. Initial code processing and abstract representation

- **A. Lexical Analysis (Lexing): Tokenization of Source Code**
    The very first step in the compilation pipeline is *lexical analysis*, or lexing.  
    The compiler takes the program as raw `Unicode UTF-8` text and converts it into a more convenient data format: `TokenStream`.

    This crutial step is mainly implemented in the [`rustc_lexer`](https://doc.rust-lang.org/stable/nightly-rustc/rustc_lexer/index.html) crate. The lexer's job is to identify and categorize the various "words" or "symbols" (lexemes) in the code, including keywords (e.g. `int`, `if`), identifiers (e.g. `x`, `y`), numeric literals (e.g. `5`, `10`), operators (e.g. `=`, `+`), and punctuation marks (e.g. `;`, `(`, `{`).  
    
    Procedural macros that operate on `TokenStream` need access to the underlying token structure, including their ranges, to generate correct and properly attributed code. By preserving this level of detail from the very beginning, `rustc` lays a solid foundation for advanced tooling and enables the sophisticated compile-time code generation that is the hallmark of the Rust language.
    
- **B. Syntax analysis (parsing): Building an Abstract Syntax Tree (AST)**
    The stream of tokens produced by the lexer is then passed to the parser, which transforms this *linear sequence* into a *hierarchical*, tree-like structure known as the Abstract Syntax Tree (AST).  
    Each node in the AST directly represents a syntactic construct in a Rust program (e.g., an expression, a statement, a function definition). Each AST node is associated with a `Span`, which links it to its original location in the source text, and a `NodeId`.
    
    The `rustc` parser, implemented in the [`rustc_parse`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_parse/index.html) crate, uses a recursive descent (top-down) approach to parsing.
    
    The AST is designed to represent "almost exactly what the user wrote". The [`rustc_ast`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_ast/index.html) crate defines various types of AST nodes, including fundamental elements such as `Crate` (the root compilation block), `Expr` (expressions), `Pat` (templates), `Item` (top-level elements such as functions, structs), `Stmt` (operators), `FnDecl` (function declarations), `Generics` (generic parameters), `Local` (local `let` bindings), `MacCall` (macro calls), and `Path` (names/paths in code).
    
    The AST serves as the primary input for macro expansion. Macros, especially the declarative `macro_rules!`, work by matching patterns against the syntactic structure of the input code. If the AST were already heavily desugared or transformed, macros would lack the rich syntactic context needed to perform their transformations efficiently.

- **C. Early Semantic Transitions: Macro Expansion and Name Resolution**
    Macro expansion and name resolution are critical early semantic transition that are closely coupled with the lexical and syntactic analysis steps. They are performed concurrently or iteratively as the compiler builds the AST.
    
    **Macro expansion:** Macros are a key metaprogramming feature in Rust, allowing code to generate other code at compile time, and dynamically modify the structure of the source code. It is important to note that macros are expanded _before_ the compiler has fully interpreted the semantic meaning of the code.
    
    The macro expansion happens _at_ parse time. When the regular Rust parser encounters macro calls, it defers their contents. Later, but still before a full name resolution pass, these macros are expanded. For declarative `macro_rules!`, this involves matching patterns against token trees and **replacing them with generated code**. Procedural macros, on the other hand, take a `TokenStream` as input, process it programmatically, **and produce a new** `TokenStream` as output. The resulting `TokenStream` is then re-parsed and integrated back into the AST. This expansion process can be iterative, since the newly generated code may contain further macro calls that need to be expanded.  
    
    **Name Resolution:** Name resolution is the process of linking all symbolic references in the code (e.g. variables, types, functions, modules, macros, lifetimes) to their final declarations.
    
    Name resolution in Rust is a two-phase process:  
    
    1. **Gathering phase (early resolution):** This phase is performed during macro expansion. For each crate, a special structure called `CrateDefMap` is built. This structure stores all the elements available in the module. This is achieved using a "fixed-point iteration algorithm" where macros are iteratively expanded and imports are resolved until no further changes occur. This partial resolution is necessary to determine which macros need to be expanded at all. The fixed-point iteration algorithm used during the gathering phase for `CrateDefMap` **is not incremental** in nature. This means that any change that may affect name resolution (such as adding a new element) requires rebuilding the `CrateDefMap`.
        
    2. **Resolution phase (full resolution):** After the entire AST (with all expanded macros) has been built, a full name resolution pass (`rustc_resolve::late`) traverses the syntax tree. It establishes links from each name in the source code to its corresponding definition.
        
    **AST Checking and Early Linting:** *At the same time* as macro expansion and name resolution, the compiler performs AST checking and early linting. AST checking is a separate pass that performs simple structural checks on the tree, ensuring that each element is in the correct state according to the basic rules of the language (for example, checking that a function has at most `u16::MAX` parameters). These checks are syntactic and do not involve complex type analysis or full name resolution. Early linting catches simple, common problems before deeper semantic analysis begins. 
    
    To expand a macro, the compiler first needs to determine _which_ macro is being called (which requires macro name resolution), and then process its arguments, which themselves may contain unresolved names or even other macro calls. This creates a circular dependency: name resolution requires the expanded code, but macro expansion depends on some level of name resolution. The "fixed-point iteration algorithm" is a solution to this dependency: the compiler repeatedly performs partial name resolution and macro expansion until no new macros are found and all top-level imports are resolved. This ensures that all "source code" (including all generated code) is fully formed and all top-level names are resolved before the compiler moves on to deeper semantic analysis.
    
    The "source code" that subsequent stages of the compiler operate on is not the literal text written by the user, but a **fully expanded and resolved version**. This allows for the rich abstractions and domain-specific language (DSL) features seen in Rust (e.g. `println!`, `vec!`, `#[derive]` macros).

---

### II. High-level Intermediate Representation (HIR) and semantic analysis

The next step is for the compiler to transform the concrete AST into a more abstract High-Level Intermediate Representation (HIR).  
This step focuses on desugaring syntactic constructs and performing basic semantic analysis, including **type checking**, **type inference**, and **trait resolution**.

- **A. Transformation to HIR: Desugaring of syntactic constructions**
    
    The next major transformation in the pipeline involves converting AST to HIR.  
    This process is formally called **"lowering"**.  
    
    HIR is designed as a more "compiler-friendly representation of the AST" and is "the core IR used in most of `rustc`". Various high-level syntactic conveniences or "syntactic sugar" constructs are extended and formalized into more fundamental, explicit forms.
    The structure of HIR is defined in the [`rustc_hir`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_hir/index.html) crate.

    Examples of desugaring include::  

    - `for` and `while let` loops are converted to more basic `loop` constructs combined with `match` statements.
    - `if let` expressions are converted to equivalent `match` statements.
    - Asynchronous functions (`async fn`) are also desugared into their basic state machine representations.

    HIR also makes explicit certain implicit elements, such as omitted lifetimes, which are critical for subsequent type checking.
    
    To handle the instability of `NodeIds`, HIR introduces more stable identifiers:
    
    - `DefId`: This identifier uniquely identifies a particular definition (e.g. a function, struct, or enum) **across all crates**.  
    It consists of a `CrateNum` (identifying the crate) and a `DefIndex` (identifying the definition within that crate), providing stability across minor code changes.
    - `LocalDefId`: A specialized `DefId` that is guaranteed to refer to a definition within the currently compiled crate.
    - `HirId`: This identifier uniquely identifies any node in the HIR of the _current_ crate. It consists of an `owner` (usually the `DefId` of the enclosing element) and a `local_id` that is unique only within that `owner`. This hierarchical structure ensures that changes outside the scope of an `owner` do not affect `HirId`s within that `owner`, making `HirId`s significantly more stable than `NodeId`s for incremental compilation. 
    
    Transforming code into progressively simpler and more explicit intermediate representations allows each subsequent compilation step to focus on a more limited set of concerns, resulting in a more modular, maintainable, and ultimately more reliable compiler.
    
- **B. Providing a Type System: Type Inference, Type Checking, and Trait Resolution**
    
    When a program is converted to HIR, the `rustc` compiler performs basic semantic analysis to provide a robust Rust type system. This includes type inference, type checking, and trait resolution.
    
    **Type Inference:** Rust's type system allows the compiler to automatically infer the type of a value based on the context in which it is used. Rust uses the [Hindley-Milner type inference algorithm](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system), which operates on the principle of *unification*. The compiler **collects type constraints** from the code and attempts to unify them to determine concrete types.
    
    **Type Checking:** After type inference, the compiler performs type checking. This rigorous process verifies the type safety, correctness, and consistency of the entire program. It involves converting the types identified in HIR (`hir::Ty`) to the compiler's internal, canonical representation of types (`Ty<'tcx>`). This step ensures that all operations **are performed on compatible types**, preventing a large subset of runtime errors such as calling methods on incorrect types or performing arithmetic operations on incompatible data.
    
    **Trait Resolution:** Trait resolution is an integral part of Rust's type system, particularly for its unique approach to polymorphism and generic programming. This process involves mapping a concrete `impl` (implementation) to each `trait` reference. Trait resolution ensures that all required trait methods are available on a given type, and that method calls are dispatched correctly, whether through **static** or **dynamic** means. This is how Rust resolves generic constraints and determines concrete method implementations at compile time.  
    
    This design decision is a cornerstone of Rust's "zero-cost abstractions" philosophy. The "cost" of type safety and powerful generics is mostly paid at compile time, not runtime. This means that Rust programs can achieve performance levels comparable to C/C++, while providing much stronger guarantees against common programming errors.  
    The combination of early desugaring, comprehensive type checking, and robust trait resolution on HIR forms a solid foundation for later, even more sophisticated analyses, such as borrow checking.

---

### III. Middle-level Intermediate Representation (MIR) and Basic Security Checks

This step introduces MIR, a highly simplified control flow graph-based representation that is the basis for Rust's unique memory safety guarantees, in particular borrow checking, as well as various compiler optimizations.

- **A. Converting to MIR: Generating a Control Flow Graph**
    
    **HIR** is converted to MIR. This downgrade often involves an intermediate step via **Typed HIR** (THIR), which is an even more desugared and fully typed version of HIR, making subsequent conversion to MIR easier.
    
    **MIR** — is a radically simplified and explicit form of Rust code, specifically designed to perform **flow-sensitive safety checks** (in particular, borrow checking), as well as various compiler optimizations and constant computation. Its key characteristics are fundamental to its purpose:  
    
    - **Basic Control Flow Graph (CFG):** MIR represents a program as a Control Flow Graph [CFG](https://en.wikipedia.org/wiki/Control-flow_graph), a directed graph consisting of "basic blocks" connected by control flow edges. Each basic block contains a sequence of simple statements that are executed without jumping, ending with a single "terminal" instruction that dictates the flow of control (e.g., conditional jumps, function calls). Loops in the source code are explicitly represented as loops within this CFG. 
    - **No nested expressions:** A distinctive feature of MIR is the complete alignment of expressions; complex, nested expressions from the source code are broken down into a sequence of simple, sequential statements.
    - **Fully explicit types:** Unlike earlier IRs that could have implicit type information, all types in MIR are fully explicit and unambiguous. 
    - **Indexed local variables and locations:** Variables are no longer named by their original names, but by numeric indices (e.g. `_1`, `_2`) representing memory locations conceptually allocated on the stack. This includes function arguments, local variables, and temporary values. The special local variable `_0` is reserved for the return value of a function.
    
    The radical simplification from HIR to MIR is a fundamental and necessary step. While HIR is high-level and syntactically similar, MIR is a low-level, explicit, and highly structured Control Flow Graph (CFG). The CFG accurately models all possible execution paths, allowing the compiler to track the state of memory locations (e.g. initialized, borrowed, moved) with extreme precision on a per-branch and per-loop basis.

    MIR is often called Rust's "secret sauce" due to its role in enabling borrow checking. Its explicitness and the CFG structure allow the use of "non-lexical lifetimes" (NLLs), which are regions derived from the control flow graph rather than strict lexical scopes, resulting in more flexible and ergonomic borrowing rules for the programmer.
    
- **B. Borrow Checker: Ensuring Memory Safety**
    
    The borrow checker, implemented in the [`rustc_borrowck`](https://doc.rust-lang.org/stable/nightly-rustc/rustc_borrowck/index.html) crate, is perhaps the most distinctive feature of Rust, responsible for ensuring memory safety without using a garbage collector. It works directly with the MIR. Its main responsibilities include:
    
    - Ensure that all variables are initialized before use.
    - Prevent values ​​from being moved around again.
    - Prevent a value from being moved while it is borrowed.
    - Prevent access to a location while it is mutable borrowed, and vice versa (the "one mutable reference OR many immutable references" rule for overlapping scopes).
    
    The `mir_borrowck` request serves as the main entry point for the borrow checking process. The main phases include: 
    
    1. **Create Local Copy of MIR:** A local copy of MIR is created for analysis.
    2. **Replace Regions:** All existing regions in MIR are replaced with new output variables.
    3. **Data Flow Analysis:** Various data flow analyses are performed to determine when and what data is moved.
    4. **Second Type Check:** Type checking over MIR determines the constraints between different regions.
    5. **Infer Regions:** The values ​​of each region are computed, identifying the points in the control flow graph where each lifetime should remain valid based on the collected constraints.
    6. **Compute Scope Borrows:** The "scope borrows" at each point in MIR are computed.
    7. **Pass MIR to Report Errors:** A final pass over MIR examines the actions and reports errors if memory safety rules are violated.
        
    Borrow checking, which works with a precise, flow-sensitive MIR, represents a paradigm shift in memory safety. Instead of relying on runtime garbage collection (with its associated performance overhead and non-determinism) or manual memory management (prone to human errors like use after free or double free), Rust shifts the burden of memory correctness to compile-time static analysis.
    
    Borrow checking is a major reason for Rust's reputation for reliability and performance. By catching a wide range of memory-related bugs (e.g. data races, dangling pointers, use-after-frees) at compile time, it significantly reduces the need for extensive debugging and testing for memory errors at runtime.  
    This **"if it compiles, it works"** philosophy for memory safety allows developers to focus on application logic, resulting in more reliable and maintainable software. The performance benefit comes from the lack of runtime overhead associated with garbage collection or reference counting, making Rust suitable for performance-critical applications where predictability is key.
    
- **C. MIR Optimizations**
    
    After the critical borrow checking phase, a number of optimization passes are performed on MIR to further improve it before the final code generation phase.
    
    The key advantage of performing optimizations at the MIR stage is that the MIR is still _generalized_; it has not yet been **monomorphized**. This means that optimizations applied to the generalized MIR (such as constant propagation) are effective for _all_ future concrete instances of the generalized functions.
    
    The [`rustc_mir_transform`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_mir_transform/index.html) crate contains many of these optimization passes.  
    Examples of common MIR optimization passes include: 
    
    - `CleanupPostBorrowck`: Removes information from the MIR that was only needed for previous analyses (such as borrow checking) but is no longer needed for code generation.
    - `ConstProp` (Constant Propagation): Replaces variable usages with known constant values.
    - `SimplifyCfg`: Simplifies the control flow graph. 
        
    These passes are often grouped and executed within specific queries, such as the `optimized_mir` query, which generates the final optimized MIR for a given definition. The compiler performs optimizations once for the generic code, rather than multiple times for each monomorphized version. This design significantly reduces compilation times for projects with extensive generic code and improves overall efficiency. This makes the overall compilation process more efficient and ensures that LLVM gets a cleaner, more refined IR, reducing its own optimization burden.
    
---

### IV. Backend: Code generation and machine-specific optimizations

This final major stage of the `rustc` compiler involves translating the highly optimized MIR into **executable machine code**, using [LLVM](https://en.wikipedia.org/wiki/LLVM) for architecture-specific transformations and extensive optimizations.

- **A. Monomorphization and generation of LLVM IR**
    
    - **Transformation:** The optimized MIR is transformed into LLVM Intermediate Representation (**LLVM IR)**. This is the critical step where "monomorphization" occurs. 
        
    - **Monomorphization:** Rust generics are handled via monomorphization, where generic code (e.g. function `fn foo<T>(x: T)`) is instantiated with concrete types for each unique use (e.g. `foo::<i32>`, `foo::<String>`). Monomorphization happens lazily, meaning instances are only generated when they are actually needed and used. The [`rustc_monomorphize::collector`](https://doc.rust-lang.org/beta/nightly-rustc/rustc_monomorphize/collector/index.html) module is responsible for discovering all the "monoelements" (functions, methods, closures, static variables, remover glue) that will contribute to code generation for the current crate.
        
    - **LLVM IR:** LLVM IR is a well-defined, platform-independent, and typed assembly language. It is designed to be easily generated by various language frontends (such as `rustc`, which is essentially an LLVM frontend), and is rich enough that LLVM can perform extensive optimizations on it. LLVM IR can be output in human-readable text format (`.ll` files) or in a more compact bytecode format (`.bc` files).
    
- **B. LLVM Optimizations**
    
    - **Extensive optimization passes:** Once Rust code is converted to LLVM IR, LLVM takes over as the primary optimization engine. It performs a rich set of complex, language-independent, and architecture-independent optimization passes: 
        
        - **Dead code removal:** Removing unreachable code or code that does not affect the program output.
        - **Constant propagation:** Replacing variables with their constant values ​​where possible.
        - **Inlining** Replacing function calls with the body of the called function to reduce the overhead of the call and allow for further optimizations.
        - **Loop optimizations:** Such as loop unrolling, moving invariant code out of loops, and reducing the power of operations. 
        
    - **LLVM Debugging:** `rustc` provides several command-line flags for inspecting and debugging LLVM IR and its optimization passes.
        `-C llvm-args` (to pass arbitrary arguments to LLVM),
        `-Z print-llvm-passes` (to print a list of the passes being executed),
        `-Z time-llvm-passes` (to measure the time spent on each pass), and
        `-Z verify-llvm-ir` (to verify the correctness of the IR).
        
    Complex, platform-specific code generation and optimization is offloaded to the specialized, high-performance, and widely used LLVM toolchain.
    
- **C. Generation of machine code and object files**
    
    - **LLVM's Role:** After LLVM has performed its extensive optimizations on LLVM IR, its target-independent code generator transforms this optimized IR into target-specific **machine code**. This process involves several critical subphases: 
        
        - **Instruction Fetching:** This phase translates the abstract LLVM IR instructions into concrete machine instructions **for the target CPU**. This often involves transforming the IR into a directed acyclic graph [DAG] (https://ericsink.com/vcbe/html/directed_acyclic_graphs.html) of the target instructions.
        - **Register Allocation:** This is a highly efficient optimization where physical CPU registers are assigned to virtual registers used in the intermediate machine code. 
        - **Instruction Scheduling:** Reorders instructions to optimize pipeline utilization and minimize latency on the target CPU. This is critical to maximizing parallelism within the processor.
            
    - **Output:** The output of this stage is **platform-specific assembler code**, which is then assembled into **object files** (`.o` or `.obj` files). Object files contain machine code, data, relocation information, and symbol tables. 

    These subphases of LLVM code generation are where abstract, optimized IR is translated into concrete, executable instructions tailored to a specific CPU architecture. Register allocation is crutial to performance, since CPU registers are the fastest locations in memory. Instruction scheduling reorders operations to keep the CPU execution units busy, exploiting parallelism within the processor. The resulting object files are self-contained units of compiled code and data, but they are not yet executable. They contain unresolved references to external symbols (such as functions from other compilation units or libraries), which are the job of the linker to resolve.

    This phase is where Rust's "performance" promise is fully realized in hardware. The complexity of LLVM's backend directly translates to highly optimized machine code.

---

### V. Linking: Building the final executable file

The final stage of the compilation process involves combining all the compiled **object files** and **required libraries** into a single executable binary file or shared library. This is done by the linker.

- **A. Static vs Dynamic Linking**
    
    - **Major difference:** The main difference is _when_ external deps (e.g. functions from libraries) are resolved. The choice between static and dynamic linking is a critical deployment decision with significant implications.
        
    - **Static linking:** Resolution happens at compile time. All required library code is **built directly into the final executable**. This results in larger, self-contained binaries that do not depend on external library files at runtime. This can make deployment easier ("no guesswork"), but makes patching/hotfixing more difficult.

    - **Dynamic linking:** Resolution happens at runtime. The executable **contains references to external libraries** that are loaded into memory when the program starts. This results in smaller binaries and allows multiple programs to share a single copy of the library in memory, saving resources. It also makes it easier to update/patch libraries without recompiling the main application. However, it introduces runtime dependencies and potential [DLL hell](https://en.wikipedia.org/wiki/DLL_hell) issues if the required library versions are missing or incompatible on the target system.
            
    - **Rust support:** `rustc` supports various `crate-type` options for linking, including
        - `bin` (the default executable that links Rust and native dependencies),
        - `dylib` (Rust's dynamic library),
        - `staticlib` (a static system library), and
        - `cdylib` (a dynamic system library for other languages).
    
    `rlib` files are intermediate "Rust static libraries" that contain metadata for future `rustc` linking.  
    
    This flexibility in linking options demonstrates Rust's suitability for a wide range of applications, from embedded systems (which often prefer static linking for minimal dependencies) to large-scale services (where dynamic linking can be used for shared components or faster updates).

- **B. Final executable file**
    
    - The culmination of this entire pipeline is an executable binary (or shared library).

    This file contains the **machine code**, **data**, and the necessary **metadata** for the operating system to load and execute the program.  
    For executables, it includes the entry point (e.g., the `main` function) where the operating system begins execution. The format of the executable binary is platform-specific (e.g., ELF on Linux, PE/COFF on Windows, Mach-O on macOS).

    Multi-level IRs (AST, HIR, MIR, LLVM IR) allow the compiler to perform specific, targeted analyses and optimizations at the most appropriate level of abstraction, gradually refining the code for machine execution.
    
---

- **Table: Comparison of key intermediate representations (AST, HIR, MIR, LLVM IR)**
    
    The following table provides a comparative overview of the main intermediate representations (IRs) in the Rust compilation pipeline. It is intended to clarify the distinguishing characteristics, primary purposes, and transformations associated with each IR, providing a quick reference for understanding the gradual refinement of code representation.
    
| IR Name     | Input Source            | Key Points                                                                                                                       | Main Goal/Analysis                                                                    | Example                                                  | crate/rustc module     |
|:------------|:------------------------|:---------------------------------------------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------|:---------------------------------------------------------|:-----------------------|
| **AST**     | Rust source code (text) | Accurately reflects user syntax; contains `NodeId` and `Span` for linking to source code.                                    | Syntax checking; Macro expansion; Initial name resolution.                  | -                                                        | `rustc_ast`            |
| **HIR**     | AST                     | Desugared AST; more compiler-friendly; includes implicit elements (e.g., omitted lifetimes); uses `DefId`/`HirId` for stability. | Type inference; Type checking; Trait resolution.                                      | The `for` loop is transformed into `loop + match`.       | `rustc_hir`            |
| **MIR**     | HIR (through THIR)      | Radically simplified; based on Control Flow Graph (CFG); no nested expressions; explicit types; generic.                         | Checking for borrows; Checking data flow; MIR optimizations; Calculating constants. | High-level operations are broken down into basic blocks. | `rustc_middle/src/mir` |
| **LLVM IR** | MIR                     | Typed assembly language; platform independent; rich in LLVM optimizations.                                                       | Monomorphization; LLVM optimizations; Machine code generation.                                                                                      | Generics are transformed into specific instances.        | `rustc_codegen_ssa`    |

