+++
title = "Understanding Memory Management in Rust: From Dynamically Sized Types to Fat Pointers"
date = "2025-06-09"

[taxonomies]
tags = ["rust", "memory", "variables"]
+++


Rust’s approach to memory management is both powerful and intricate.  
Why is it impossible to create purely Dynamically Sized Types?  
How does the Rust compiler decide where and how to allocate memory for variables?  
What exactly does a pointer inside a fat pointer reference, particularly for string literals?  
And what role does the libc library play in this ecosystem?

🟠 In this article, we’ll dive deep into the memory management landscape of Rust’s type system, uncovering these questions and more to provide a clearer understanding of how Rust handles memory under the hood.

<!-- more -->
---

## &emsp;&emsp;&emsp; Some Definitions

**ZST** (Zero Sized Types) - the entire size of the type is collapsed to zero at compile time. (always `impl Sized`)

**DST** (Dynamically Sized Types) - is a **non-sized** (`!Sized`) type that does not contain information **about its length** in the type itself, but **the length is stored at runtime** as metadata associated with the slice pointer. At compile time, Rust **does not know** how much memory needs to be allocated for this type (`str`, `[T]`, `Arc`.. ).  
Variables of these types can only be used behind references that include metadata about the length. (`&str`, `&[T]`, `Box<[T]>`...)  

**Machine Word** (word) - is the amount of data that the *CPU* can process per unit of time.  
The memory address range is determined by the size of the `machine word` in the current *CPU*, for a `64 bit` processor it is `64 bits `respectively (or `8 bytes`).  
The size of the reference (`usize`) is equal to a machine word. (`ptr`, `cap`, `len`).  

---

## &emsp;&emsp;&emsp; Basic concepts of memory management 

After [compiling](https://maltsev-dev.github.io/rs-to-bin/) the executable file.  
This file stores `data`, `metadata`, and `machine instructions` for the *CPU* in specific platform-dependent formats. (**ELF** on Linux, **PE** on Windows,**Mach-O** on macOS).  
No matter what formats, the way they are executed is *almost* the same.  

When a program (**process**) is started on the target platform, the kernel allocates the necessary amount of memory based on the **segment metadata** (`.text,` `.data`, `.bss`, etc) from the ELF headers.  
This memory is a solid range of addresses to use, called the `virtual address space` of the program.  
The kernel will map segments to the allocated memory at startup, the number of segments required depends on the **compiler**.  
Since memory is allocated `lazily`, the kernel and hardware will do the mapping to physical addresses in RAM `only on the first access`.  
From the point of view of the **process**, it sees a solid range of memory from `0` to the maximum value.  

{{ img(src = "/images/rust_memory/rust_memory_1.png") }}

* Some **segment metadata** of executable file:   
```
section               size        addr
.vector_table          192  0x10000100
.text                33044  0x100001d4
.rodata               4904  0x100082e8
.data                    0  0x20000000
.bss                     4  0x20000000
...
```

#### text
This section contains the compiled `machine instructions` of your program (**executable code**).  
Loaded into memory with `Read + Execute` rights. The running program cannot change it.  
These instructions depend on the architecture of the processor for which the code was compiled and cannot be automatically ported to another platform.  
#### data
This section contains` initialized global and static` variables.  
#### bss
BSS **Block started by symbol** segment.  
This section stores `uninitialized global and static` variables. These variables are **guaranteed to be zero** before main is called.  

### Stack
Located at the top of the user space and **grows downwards**.  
The highest address that can be used is `hex(2**47-1)` = '`0x7ffffffff000`'  
Example: `0x7ffffffff000` (approximately `128 TB` from zero).  

The *stack* is **unique to each individual thread** of the process.  
On 64-bit Linux Systems, Rust programs use an `8Mb` *stack* for the **main** thread.  

The [Rust std](https://doc.rust-lang.org/std/thread/struct.Builder.html#method.stack_size) supports specifying the *stack* size for any thread that the program creates. The default value is `2Mb`.

Although the size of the *stack* for the main thread is `8Mb`, this memory is not allocated immediately, it is allocated by the kernel only on the first access.  
The *stack* grows **downwards** - to a lower memory area.  
It can only grow until total *stack* size for that particular thread (if it is the main thread - up to `8Mb`)  
If a program thread uses more *stack* space than it is allocated, the kernel will terminate the execution of that program with an error - **stack overflow**  


### Heap
All threads share one common *heap*.  
The *heap* memory address starts close to zero (after code and data) and **grows upwards**.  
The *heap* can grow to gigantic sizes (theoretically up to `128 TB`).  

{{ img(src = "/images/rust_memory/rust_memory_stack_vs_heap.png") }}


### Address range

Between the **highest heap** memory address and the **lowest stack** memory address there is a huge free space.

* 64-bit address space
Theoretical range: `2⁶⁴ bytes = 16 EB` (**exabytes**).  
Practical limitation: Modern processors (x86-64) only support 48-bit virtualization (256 TB), and OS often reserve some space:
* **Linux**: 47 bits for the user (`128 TB`) + 47 bits for the kernel (`128 TB`).
* **Windows**: 44–48 bits depending on the version.

These are `virtual addresses`, so the kernel can use such large address ranges, even if the computer has only `16 GB` of RAM.  
A virtual program is mapped to a physical one only when the program uses it.

Some Reasons for this design: 
* [ASLR](https://en.wikipedia.org/wiki/Address_space_layout_randomization) (Address Space Layout Randomization)
Random placement of code, libraries, *heap* and *stack* within their zones. The huge gap makes attacks (e.g. **buffer overflows**) more difficult.  
* Overflow protection - the distance makes it almost impossible to accidentally "jump" from the *heap* to the *stack* or vice versa.  
* Flexibility for large allocations

---

## &emsp;&emsp;&emsp; Rust on Stack

The main purpose of the *stack* memory is to store the data of the **currently executing function** (all parameter of the function, its local variables and the return address).  
Only variables with a `fixed size` and whose `size is known at compile` time can be placed on the *stack*.  

* `stack frame` - the total amount of memory allocated on the *stack* for the execution of **one function**.  
* `stack pointer` - track the **current top level** of the *stack*.  

Allocation and deallocation on the *stack* requires only increasing or decreasing the hight of the `stack pointer` and is fast, since **no system calls are required**.  

{{ img(src = "/images/rust_memory/rust_memory_stack.png") }}

1. First, a `stack frame` is created for the main function, all local variables with known sizes are placed in it.  
2. The main() calls another function, for which its own `stack frame` is created with enough memory to store its data.  

The **return address** (`0x23f`) is the next instruction in the `stack frame` of the main() (the assignment operator `let b =` ...), to which execution should return after the `add_one()` function is finished.  
At this point, the `stack pointer` will be up, but the `stack frame` allocated memory for the `add_one()` function will not be fully deallocated, these addresses will be overwritten when another function is called.  

---

## &emsp;&emsp;&emsp; Rust on Heap
In Rust, **Heap Allocator** is described through the `GlobalAlloc` trait - it defines the functions that the **Heap Allocator** must provide.  
Rust uses `malloc` from the standard `C` library, `libc`, to work with memory. Under the hood, Rust assumes that the running platform has `libc` compiled in and plans to use it.  
Allocating and working with memory on the *heap* is **slow** primarily because of **system calls** to `libc` and the allocator searching for a suitable place for the data.  
To reduce the number of system calls, `memory allocator` requests memory in blocks.  

{{ img(src = "/images/rust_memory/rust_memory_heap.png") }}

1. The main `stack frame` is created for the main() function
2. A nested `stack frame` is created for the heap() function
3. `Box` - allocates space on the *heap* for the number 23 (`i32 = 4 bytes`), and a pointer (`0x5f21`) to this space is written to the `b` variable on the *stack*, since the pointer has a fixed size.
4. Therefore, the size of `b` in the *stack* is `usize = 8 bytes`.
5. Through the return address from heap(), the pointer to `Box` is written to the `result` variable in the main() function.
6. Now, even if the *stack* frame of the heap() function is deallocated, the `result` variable contains the address of the data in the *heap*.

---

## &emsp;&emsp;&emsp; Rust Data Types

### &emsp;&emsp; Integer 
Stored entirely on *stack*.

{{ img(src = "/images/rust_memory/rust_memory_integers.png") }}

Signed and unsigned numbers indicate how many `bit` they can store.  
| i8 / u8 | i16 / u16 | i32 / u32 | i64 / u64 | i128 / u128 | f32 / f64 | isize / usize      |
|:--------|:----------|:----------|:----------|:---------|:-------------|:-------------------|
| 1 byte  | 2 bytes   | 4 bytes   | 8 bytes   | 16 bytes    | 4 / 8 bytes   | 4 / 8 bytes    |

### &emsp;&emsp; Char
Stored entirely on *stack*.  
Stores `Unicode` characters.  
Always `4 bytes`.  
Stored entirely on *stack*.  

### &emsp;&emsp; Tuple

A type consists of a **fixed set** of values ​​of **diffrent types**.  
If all composite types are stored on a *stack*, then the entire tuple is stored on a *stack*.  
The size of all composite types is in order, but with alignment taken into account.  
`Alignment` is performed by the compiler so that *CPUs* can read data more efficiently.  
{{ img(src = "/images/rust_memory/rust_memory_tuple.png") }}

* sum of sizes of types = `9`
* sum of size including alignment = 12
* denominator of alignment = `4`
* 9\4 = 2.25 to the upper integer = `3`
* aligned size = 4 * 3 = `12`

``` rust
size_of::<(char, u8, i32)>();   // 12
align_of::<(char, u8, i32)>();  // 4
```

### &emsp;&emsp; Reference
* `&T` **shared** references are stored in the *stack* and contain the **address of the original variable** it points to.  
* `&&T` **shared** reference to reference and also takes 1 machine word.  
* `&mut T` **unique** references have the same layout in memory.  

{{ img(src = "/images/rust_memory/rust_memory_references.png") }}

### &emsp;&emsp; Array

``` rust
let a: [i32; 3] = [55, 66, 77];
```
An array has a **fixed size** (unchangeable after creation), and this size **is part of the type**.  
Values ​​of an array type are strictly of the **same type** and are placed one after another on the *stack*.  

### &emsp;&emsp; Vector

``` rust
let v: Vec<i32> = vec![55, 66, 77];
```
Alternative to **resizeable** array  
Vector will store 3 pointers `(ptr, len, cap)` in *stack*.
* `ptr` - point to the beginning of the memory **area in the *heap*** where the values ​​stored in this vector are written.
* `cap` - shows how much data **is allocated** on the *heap* for this vector.
* when `cap` and `len` become the same, if more elements need to be added - reallocation occurs (allocating new memory in a larger *heap*, copying elements from the current location to the new array and updating the pointer).


### &emsp;&emsp; Slice

`[T]` - similar to a fixed size array, except that we don't have to specify the size and data type.
``` rust
let s1: [i32] = a[0..2];
let s2: [i32] = v[0..2];
```

Usually a slice reference is used - which can be placed on the *stack*.  
`&[T]` - **fat pointer** 2 pointers - `ptr` + `len`

{{ img(src = "/images/rust_memory/rust_memory_slices.png") }}

``` rust
let a: [i32; 3] = [55, 66, 77];
let v: Vec<i32> = vec![55, 66, 77];

let s1: &[i32] = &a[0..2];
let s2: &[i32] = &v[0..2];
```

Here `s1` and `s2` are a slices that contains `ptr` и `len`.
This information is stored in a **fat pointer**, which consists of:
- A pointer to the data (`*const T`)
- A length (`usize`)
Thus, although the `[T]` type itself does not contain length information, this information is available through the `&` pointers to the slice.


### &emsp;&emsp; String, str, &str

String is a `Vec<u8>` where each value is a separate **Unicode** character in `UTF-8` encoding.
Like a vector, String stores 3 pointers to *stack* (`ptr`, `cap`, `len`)

{{ img(src = "/images/rust_memory/rust_memory_strings.png") }}


``` rust
let s: String = String::from("hello");
```

--- 

If you store a **string literal** directly into a variable, the data type of that variable will be a reference to a slice of the string with a `static lifetime`.  
These strings are stored in `.rodata` (read-only data) directly in the binary code.  
In this case, `s2` on the *stack* will be represented by a **fat pointer** (`ptr` + `len`).  
`ptr` will point to a specific range in static memory.  

``` rust
let s2: &'static str = "hello";
let ptr: *const u8 = s2.as_ptr();
```

--- 

The `str` type in Rust is a **dynamically determined type** (DST), meaning that its size is unknown at compile time.  
Therefore, you cannot create a variable of type `str` without using a pointer or reference, since the compiler does not know how much memory to allocate for such a variable.  

Instead, you use a reference to `str`, i.e. `&str`, which is a **fat pointer**(`ptr` + `len`).  
Thus, `&str` has a known size at compile time and can be safely allocated on the *stack*.  

It is possible to get a part of the string using ranges, but this will return a slice of the string.  
Since the size of the string is not known at `compile-time`, it cannot be pushed onto the function *stack*, and Rust does not allow you to assign it to a variable.  
Therefore, you must use a reference here as well.  

``` rust
let s1: &str = &s[1..3];;
```
This slice does not copy the data, but only **references it**, and includes information about the length of the slice.  


### &emsp;&emsp; Struct
{{ img(src = "/images/rust_memory/rust_memory_struct.png") }}

There are 3 types of structs in Rust  
* Struct with named fields  
* Tuple - Struct without named fields  
* Unit-like Struct - **ZST**
**Struct** have a memory representation similar to **tuple**  
A struct with named fields puts `pointers` and `copy types` next to each other on the *stack*.  
If the vector inside the nums field has elements, they will be allocated on the *heap*.  

### &emsp;&emsp; Enum

{{ img(src = "/images/rust_memory/rust_memory_enum.png") }}

Rust has several different syntaxes for enums.  
* C-style Enum
In memory, they are stored as integers starting with `tag 0`.  
The compiler will choose the smallest integer type that can fit the largest of the tags.   
``` rust
enum HTTPStatuses{
	OK,
	NoFound,
}
```

* An enum with **similar** variant values type.  
The maximum integer value **404** would require `2 bytes` to store, so each variant of the enumeration would weigh `2 bytes` due to alignment.  
``` rust
enum HTTPStatuses{
	OK = 200,
	NoFound = 404,
}
```

* An enum with **different** variant values type. 
A variant integer tag (0, 1, 2...) must also be stored in memory  
All variants must be the same size, so alignment will be by the **largest** variant.  
``` rust
enum Data{
	Empty,
	Number(i32),
	Array(Vec<i32>),
}
```

### &emsp;&emsp; Enum with Box
`Box` is a pointer to some memory allocated on the *heap*.  
The most obvious way to optimize the memory of the entire enum is to limit the size of its maximum variant, instead of storing the vector directly in Array, you can store a `pointer to vector`.  
``` rust
enum Data{
	Empty,
	Number(i32),
	Array(Box<Vec<i32>>),
}
```
In this case, the amount of memory required for this option is halved.  
{{ img(src = "/images/rust_memory/rust_memory_enum_with_box.png") }}

In the *stack* of the function call, memory will be allocated for `ptr`, to store the memory address to which the vector points.  
The Heap will store (`ptr`, `cap`, `len`), necessary for representing the vector. At the same time, if the vector contains values, they will also be stored in the *heap*.  

### &emsp;&emsp; Option
`None` variant does **not store any values**, only the integer tag `0`  
`Some` variant **stores the actual data** along with the integer tag `1`  

* If the value stored in `Some` is a Box or other similar smart pointer.  
Assuming that Smart Pointers **can't be zero** - `Some(Box::new(42))` can be represented as a single `ptr`, without the need to store an integer tag.  
The value zero can be used to represent the `None` variant, and if the value is not zero, it is the `Some` variant.  
* Since `Box<T>` can't be null (**a null pointer is forbidden** - it would point to nowhere) the compiler reserves the value `0` as the code for `Option::None` in `Option<Box<T>>`, and treats all non-null pointers as `Option::Some(boxed_value)`  

Rust uses the **null pointer optimization** for pointer types that can never represent the value 0 (null).  
This allows `Option<Box<T>>` to take up exactly the same amount of memory as `Box<T>`, because the value `None` is encoded in a null pointer, while `Some(ptr)` is encoded in a non-null pointer to data.  

### &emsp;&emsp; Copy vs Move
For `primitive types`, assigning one variable a value to another variable makes a`bit-by-bit` copies those values.  
This is possible because the values ​​of those variables can be represented using only bytes on the *stack*.  

{{ img(src = "/images/rust_memory/rust_memory_vec_string.png") }}

For values ​​that require *heap* allocation. For example, a vector of heap-allocated strings.  

* each string is represented by 3 usize (`ptr`, `cap`, `len`)
* in the memory allocated for the vector on the *heap*, these **string headers** will be placed one after another.
* the actual bytes used to store the string values ​​will be allocated somewhere else in the *heap*, and pointers to this memory will be stored in the **string headers**.
* in the `stack-frame`, will be allocated 3 usize for the variable `v` to store the vector header. This variable is responsible for clearing the memory on the *heap*, this happens in the `drop()` function at the end of the scope.

In the case where it is necessary to assign the value of the vector `v` to another variable, the ownership is transferred to the new variable and it is now responsible for clearing the allocated memory on the *heap*. It is written 3 machine words, which represented `v`  
If it is necessary to create a variable that will own a **full copy of the vector data** with a new allocation of data on the *heap*, it is necessary to explicitly call the `clone()` method.  
In this case, each variable owns its own memory area with the same data.  

### &emsp;&emsp; Reference Counter (Rc)

When you want a **single value** to have **multiple owners**.  
In most cases, you can use regular references to share values, but the problem is that when an owner goes out of scope, you can't use those references anymore.  
Instead, you want **each value** to have a `common owner` and only be removed from memory when all owners go out of scope.  

``` rust
use std::rc::Rc;

let v: Rc<Vec<String> = Rc::new(vec![
	"Odin".to_string,
	"Thor".to_string,
	"Loki".to_string,
]);

let v2 = v.clone();
```

{{ img(src = "/images/rust_memory/rust_memory_rc.png") }}

* when a vector is wrapped in `Rc`, the 3 machine words that make up the vector header are allocated on the *heap* along with extra memory to hold the `reference counter` to that value.
* on the *stack* function, the variable `v` will consist of one machine word, which will hold the memory allocation address for `Rc`.
* after that, a new variable `v2` can be created using the `clone()` built-in method. This will **increment** the reference counter by `1`.
* now `v` and `v2` are owners of the same data.
* when each owner goes out of scope, the reference counter is decremented, and when it reaches `0`, all data on the *heap* is deallocated.
* the value that `Rc` points to **cannot be changed**.

### &emsp;&emsp; Send and Sync
`Send` - means that a value of this type **can be moved** from one thread to another.  
`Sync` - means that multiple **threads can share** a value of this type using a shared reference.  
`Rc` - is not send\sync because if multiple threads have `Rc` - an attempt to increment a shared counter may result in a `data race`.  

{{ img(src = "/images/rust_memory/rust_memory_rc_multithread.png") }}

### &emsp;&emsp; Arc
If you need `shared data between threads` - you need to use `Atomic Reference Counter (Arc)`.  
It works the same way as `Rc`, but changing the counter is an **atomic operation**, which can be safely performed from multiple threads.  
However, you have to pay a little performance for atomicity.  
By default, `Arc` is immutable, even if multiple threads have a pointer to the same data - they are **not allowed to change it**.  

### &emsp;&emsp; Mutex
If you need `mutable access` to shared data between multiple threads - you can wrap `Mutex` inside `Arc`.
{{ img(src = "/images/rust_memory/rust_memory_arc_multithread.png") }}
Now, if two threads try to access the same data, they will first need to get a `lock on that data.`  
And only one thread will be able to access the data to modify it.  


### &emsp;&emsp; Trait Object
A pointer to a trait type is called a `Trait Object`  
There are several ways to convert a concrete type to a `Trait Object`, both of which convert a vector of u8 to an object that implements `trait Write`.  

* Assigning a variable to a variable `w`
``` rust
use std::io::Write;

    let mut buffer: Vec<u8> = vec![];
    let w: &mut dyn Write = &mut buffer;
```
* Conversion occurs when passing a concrete type to a function that takes a `Trait Object`
``` rust
    fn main() {
        let mut buffer: Vec<u8> = vec![];
        writer(&mut buffer);
    }

    fn writer(w: &mut dyn Write){
        ...
    }
```

In memory, `Trait Object` is a **fat pointer** of two pointers (`data pointer` + `vtable pointer`)  

{{ img(src = "/images/rust_memory/rust_memory_fat_pointer.png") }}

* `data pointer` - a pointer to the actual values, in this case, a pointer to a vector.  
* `vtable pointer` - a pointer to a table representing the value type. The table is generated once at compile time and is shared by **all objects of that type**.  
* table points to machine code of functions that must be present for the type to be `Writer`.  
* Rust automatically calls the table when calling a method on `Trait Object`.  

Rust can convert normal references to `Trait Object`  
The same can be done with smart pointers `Box`, `Rc`, `Arc` ...  
In these cases - they also become **fat pointer**  
* type `Box<dyn Write>` means that the value has a Writer on the *heap*.  