+++
title = "Don't fight the Borrow Checker"
date = "2025-05-29"

[taxonomies]
tags = ["rust_mastering"]
+++

A Series of Rust concepts every developer should master 🥋  
📚 E03 - `Rust Borrowing Model`
<!-- more -->
---

### Borrow Immutable (&s)
1. There is no limit on the number of borrowers. 
2. Immutable borrowers prevents any mutable borrows.
### Borrow Mutable (&mut s)
1. One and only one mutable borrower at a time. 
2. Mutable borrow is not allowed while there are immutable borrowers.

### Borrowing

{{ img(src = "/images/rust_mastering/true_borrow.png") }}

To save ownership of variable `s1`, but also assign its value to another variable `s2`, you need to use **borrowing**, which is based on the use of **references**.

### References rules
* Reference are **always valid**.  
* You must create it explicitly using `&s1`.  
* Dereference also explicitly using `*` - to gain access to the object to which the link points.  
* A reference is simply a physical pointer to an object.  
* You can reference to reference.  
* you can mutate a reference to a regular reference.  

Borrowing allows multiple parts of a program to access data without moving ownership.

The Borrow Checker enforces borrowing rules, ensuring that references are used correctly and safely without causing data races and memory errors.

Using references not only ensures memory safety, but also improves performance by reducing the redundancy of copying data, especially with complex structures.

``` rust
	let s1 = "hello".to_string();
	let s2 = &s1;
// s2 - gets a reference to the value of variable s1
// s2 gets not the value of the variable itself, but a reference to it.
// since it is not the String object itself that is assigned, but a reference to it, then the type of s2 will be &String
// s1 is still the owner and the deletion of the Hello value will depend on it
```

When the scope of a reference variable ends, nothing happens to the original data it points to.

References must point to valid data. That is, a reference cannot live longer than the data it points to.  
When a provider variable is destroyed, its value is deleted accordingly and all references to this value become invalid.  
Returning a reference from a function is not correct, because when the scope of the function ends, everything that can be referenced from within the function will become invalid.

Functions can accept **references as parameters**

``` rust
fn display(a: &String) -> {}
```

Working with the original value and the reference to it are not equivalent, for example when comparing the reference to the value and the value itself.  
To get the original data that the reference points to, **it must be dereferenced**

``` rust
let result = p* > 10;
```

A reference representation is a memory address of a cell. (reference size is the same as **usize/isize**).  
References ensure that the object is alive and that it is under this reference.
