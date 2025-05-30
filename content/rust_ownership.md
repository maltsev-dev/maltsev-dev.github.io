+++
title = "Rust Ownership Model"
date = "2025-05-29"

[taxonomies]
tags = ["rust_mastering"]
+++

A Series of Rust concepts every developer should master 🥋  
📚 E02 - `Rust Ownership Model`
<!-- more -->
---

{{ img(src = "/images/rust_mastering/sb_caveman_owner.png") }}

## Memory management landscape
Each value that the program works with must be written somewhere and stored at this address until it is needed.  
When creating a **variable** (a, name, index), we initialize it with some **value** (12,4, "mike", 18) of a certain **type** (f32, &str, HashSet<>).
`let a = 12.4f32`  
According to the variable type, Rust allocates it to the corresponding memory fragment (Stack, Heap, data).  

To ensure that the size of the memory occupied by the running program does not get out of control, and your target platform does not turn off the program at the most inopportune moment, it is necessary to strive for the most deterministic use of memory and its correct allocation and deallocation.

### Garbage Collector
In languages ​​with GC, which include Java, C#, GO, and most scripting languages, the garbage collector attempts to free memory that was allocated by the program but is no longer used, this happens without the active participation of the developer and without building additional abstractions over the code that could track the counter of pointers to variables and signal the CG to remove it.  
But, as we know, there is no such thing as a free lunch - using CG leads to unpredictable pauses in work, the [Stop-the-world](https://stackoverflow.com/questions/16695874/why-does-the-jvm-full-gc-need-to-stop-the-world) problem, as well as frequent CPU overload.
{{ img(src = "/images/rust_mastering/gc_spikes.png") }}

### Manual Management
Maybe we should stop using GC, and what alternatives do we have?  
Of course, the good old manual way of allocating and deleting variable values ​​from memory.  
This old method appeared at the dawn of computer technology. Manual memory control is a great power, and great power is always a great responsibility.  
As the project grows, the code base becomes more complex and making new changes requires more and more thorough regression testing.  
IT corporations such as Microsoft Google Mazilla show in their reports that more than 70% of all application errors and security issues are primarily related to memory management issues.  
The **American Cybersecurity Agency** calls for changes in the development cycles of their applications, a review of cybersecurity measures, and the creation of an open “memory safety roadmap”.[The Urgent Need for Memory Safety in Software Products](https://www.cisa.gov/news-events/news/urgent-need-memory-safety-software-products)

Rust, as a logical step in the evolution of system programming languages, has incorporated the best practices and approaches that eliminate a whole cluster of typical memory errors at the compilation stage.
    * Null pointer dereferences
    * Buffer overflows
    * Race Condition
    * Dandling references
    * Use After Free
    * Double Free
    * Memory Leak etc.

I nstead of relying on runtime garbage collection (with its associated performance overhead and non-determinism) or manual memory management (prone to human errors), Rust shifts the burden of memory correctness to compile-time static analysis.

## Ownership
The concept is used to manage data in the **Heap**, provides memory safety guarantees, and, in a sense, defines the philosophy of the language.  
The rustc AOT compiler checks certain ownership and borrowing rules at certain [stages of compilation](https://maltsev-dev.github.io/rs-to-bin/) to provide guarantees of program execution safety.

### Ownership - Rules
1. Resources have one and only one owner. 
2. When the owner goes out of scope, the resource is freed. 
3. Ownership is movable (transferable).

* Passing a variable to a function by value is a destructive move, now the function argument is the owner of the value and the fate of the value is determined within the scope of the function.

* If you need to create and allocate a new string in the heap, you need to explicitly clone `let s2 = s1.clone();`

### Scope
Each value has its own scope, within which the value can be used.  
Cycles, conditions, function constructs, and anonymous code blocks form a separate scope.  
Objects can be used in **nested scopes**, but not vice versa.  
Global scope (outside the main function) - only **constants** can be defined in it.  
At the end of the Scope, if ownership is not transferred - the variable value is deleted.

## Drop the value
When a variable that holds data on the heap goes out of scope, the value will be cleared.  
At the end of the scope, when the stack frame of the function is unwound, the destructor [drop()](https://doc.rust-lang.org/std/mem/fn.drop.html) is called for each value unless the ownership of the data has been moved to another variable.

Also, you may to call drop explicitly `drop(s1);` - the variable s1 will become uninitialized, the memory associated with its value will be cleared.

## Ownership transfer
### For Copy types
* Move == Copy
* Objects that do not own resources after move **remain accessible** after move
* All Primitive
* If a composite type consists of Copy types - it itself becomes Copy

### For non-Copy types
* When move is performed, the internal structure (ptr, len, cap) of the Stack is transferred to the new owner. The data pointed to by ptr on the Heap is not moved.
* The old owner is no longer accessible.

The string "hello" is in the heap.

{{ img(src = "/images/rust_mastering/rust_ownership.png") }}

Variable `s1` owns the value.  
When `s1` transfers ownership to `s2`, `s2` copies the information from `s1`, creating a new stack entry with the string pointer, length, and capacity information.  
This operation is known as a "shallow copy", meaning that only the references are copied, not the data.  
According to Rust's second ownership principle: a value can only have one owner at a time, at which point `s1` is invalidated and s2 now owns the string. 