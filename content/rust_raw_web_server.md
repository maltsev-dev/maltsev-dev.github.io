+++
title = "std web_server"
date = "2024-12-10"

[taxonomies]
tags = ["rust", "sync", "project"]
+++

Get the most out of the Rust standard library to create a full-fledged web server.  
Utilize `fs`, `net`, `sync`, `thread`, `time`
<!-- more -->
---

[📚 raw_web_server](https://github.com/maltsev-dev/raw_web_server)  
![Rust Version](https://img.shields.io/badge/rust-1.83.0%20-green)

* Basic web server that uses a thread pool to respond asynchronously.
* Based purely on The Rust Standard Library:
    * fs,
    * io::{prelude::*, BufReader},
    * net::{TcpListener, TcpStream},
    * sync::{mpsc, Arc, Mutex},
    * thread,
    * time::Duration,


#### &emsp;&emsp;&emsp; **License**
This project is licensed under the MIT License 