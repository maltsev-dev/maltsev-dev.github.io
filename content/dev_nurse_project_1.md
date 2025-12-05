+++
title = "Why overspecialization is over, and how I decided to create my own AI device on MCU"
date = "2025-12-02"

[taxonomies]
tags = ["project", "rust", "nurse", "product"]
+++

In this series of articles, I'd like to show you how to create your own **ESP32-S3**-based device with **ML** built right into the firmware. 
🟠 I'll try to describe not only what I'm doing, but also how I got there—all the decisions, compromises, and challenges that arose along the way.  

<!-- more -->
---

## &emsp;&emsp;&emsp; Why did I even take this on??
The reasons are actually quite simple—and honest.

1. It's an objectively difficult challenge.
I don't have extensive, multi-year experience working with microcontrollers, and my knowledge of ML is only basic.  
But that's precisely why the idea seemed interesting: it's a task with many unknowns, and it requires combining different skills into a single system.

2. I want to improve my Rust skills  
I've been using Rust for a long time, and it's become my primary tool for many projects.  
Therefore, the choice for firmware was obvious: Rust → safety, control, predictability, and a sign of engineering quality.  
Moreover, I want to show that Rust firmware isn't exotic, but a fully functional approach.  

3. Build a full cycle: **MCU → AI → Actix Web → Dashboard** 
Narrow specialization is being replaced by generalist engineers who understand the product as a whole.  
That's why I'm interested in following the entire IoT product journey:
* assembling the hardware,
* integrating TinyML inference,
* setting up Wi-Fi and MQTT,
* processing data on the server,
* displaying statistics and graphs on the dashboard. I want to cover the entire stack—from the registry to the UI.

4. Document your journey  
want to document this journey: the approaches, the conclusions, the decisions made.  
This will be useful for me in the future, and perhaps for other developers reading this series, my employers, or my partners.  


## &emsp;&emsp;&emsp; What exactly do I want to build?
My future **device** will contain:
1. AI inference for image classification and human feature detection
2. Camera and image processing stream
3. Wi-Fi connection via QR code with the ability to reset network settings
4. Obtaining UTC time
5. Communication with the server via MQTT

The **server side** will be responsible for:
1. Authorization processing
2. Collecting and processing data from devices
3. API

On the **front end**, I see the following as optimal:
1. User/device personal account
2. Real-time event log
3. Graphs and statistics for human detection data
4. Device cards

The **main stages** of this project are:
* Training and optimizing the machine learning model
* Creating firmware on the MCU and integrating the model into it
* Configuring a transport layer for MCU communication with the outside world
* Creating a server for receiving data, processing it, and managing authorizations
* Data visualization and working with UI/UX
* Creating a prototype enclosure for 3D printing


## &emsp;&emsp;&emsp; Project architecture (high-level plan)
{{ img(src = "/images/nurse_high_level_arch.png") }}


## &emsp;&emsp;&emsp; How the article series will be structured
I'll try to divide the entire journey into logical modules.  
In the following articles, I'll cover:

* Hardware, component selection, and Rust firmware organization
* TinyML and MCU models
* Running inference: the real pipeline
* Network: Wi-Fi, MQTT, HTTP
* Backend on Actix
* Dashboard
* 3D modeling
* Current results and plans
