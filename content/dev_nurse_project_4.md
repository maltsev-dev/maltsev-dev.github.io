+++
title = "From device to system: communication, backend, and dashboard for an embedded AI product"
date = "2026-01-07"

[taxonomies]
tags = ["embedded", "iot", "mqtt", "rust", "actix-web", "frontend", "product"]
+++

🟠 In this final article, I connect the embedded AI device to the real world.
I describe how inference results leave the MCU, travel through MQTT and HTTP, land in a Rust backend, and become visible through a web dashboard.

This is the layer where a TinyML prototype turns into an actual **end-to-end product**.

<!-- more -->

---

##     From inference to communication: Wi-Fi, MQTT, and reliability

Once inference works reliably on-device, the next challenge is not accuracy — it’s **communication**.

The MCU operates in an unstable environment:

* Wi-Fi may drop;
* power can fluctuate;
* the backend may be temporarily unavailable.

Because of that, the device communication layer is built around a few principles:

* **stateless inference**, stateful delivery;
* retry-safe messaging;
* decoupling inference from transport.

### Why MQTT

MQTT is a natural fit for embedded AI devices:

* low overhead;
* persistent sessions;
* QoS guarantees;
* simple reconnect semantics.

The device publishes inference results as compact messages:

* device ID;
* timestamp;
* prediction score;
* optional debug metadata.

If Wi-Fi drops, the MCU buffers messages and reconnects automatically.
Inference never blocks on network I/O — this separation is critical for real-time behavior.

---

##     Backend architecture: Rust, Actix Web, and data ingestion

On the server side, the backend acts as the **central nervous system** of the product.

Its responsibilities:

* ingest data from devices via MQTT;
* expose an HTTP API for clients;
* store structured data in PostgreSQL;
* handle authentication and authorization;
* serve the frontend SPA.

Rust + Actix Web was a deliberate choice:

* predictable performance;
* strong typing across the entire stack;
* explicit async behavior.

### MQTT ingestion as a background task

The MQTT listener runs as a dedicated async task inside the backend process:

* subscribes to device topics;
* validates incoming payloads;
* writes inference data into the database.

Because MQTT and HTTP are decoupled, ingestion continues even if no users are connected.

This pattern avoids the classic IoT anti-pattern of “HTTP from devices”.

---

##     API layer and authorization model

The HTTP API exposes structured access to collected data.

Key design decisions:

* JWT-based authentication;
* protected routes via middleware;
* strict separation between public and private endpoints.

In Actix Web this maps cleanly to scoped routes:

* `/api/auth/*` — login, profile, token refresh;
* `/api/predictions/*` — protected inference data access.

Middleware enforces authorization centrally, not per-handler —
this keeps business logic clean and auditable.

---

##     Backend as a deployment unit

The backend is built and deployed as a **minimal container**.

The Docker setup follows a multi-stage pattern:

* Rust build stage with cached dependencies;
* slim Debian runtime with only OpenSSL and certificates.

This yields:

* fast builds;
* small images;
* reproducible deployments.

Docker Compose ties everything together:

* PostgreSQL for persistence;
* Mosquitto as the MQTT broker;
* backend API;
* frontend static server.

At this point, the system can be deployed locally or on a single VPS without modification.

---

##     Frontend dashboard: making data visible

Raw inference data is useless without interpretation.

The dashboard provides:

* a login-protected UI;
* real-time and historical predictions;
* device-level visibility;
* documentation and onboarding pages.

The frontend is a React SPA served as static assets via Nginx.

Routing is handled client-side:

* core pages (login, dashboard, purchase);
* static legal pages;
* documentation sections;
* graceful SPA fallback for unknown routes.

Because the backend serves the frontend assets directly, the system behaves as a **single cohesive application** from the user’s perspective.

---

##     System boundaries and responsibilities

At this stage, the architecture has clear boundaries:

* **MCU**

  * real-time inference;
  * sensor interaction;
  * unreliable network handling.

* **MQTT**

  * transport layer;
  * buffering and delivery guarantees.

* **Backend**

  * data ingestion;
  * persistence;
  * authorization;
  * API surface.

* **Frontend**

  * visualization;
  * analysis;
  * user interaction.

Each layer can evolve independently without breaking the others —
this is what turns a demo into a maintainable product.

---

##     Closing thoughts

This project deliberately spans:

* TinyML and quantization;
* low-level firmware concerns;
* async backend design;
* frontend product thinking.

The key insight is simple but often missed:

> An embedded AI model is only valuable when it is part of a system.

By treating communication, backend, and UI as **first-class engineering problems**, the device stops being “just a model on a chip” and becomes a real, deployable AI product.

This concludes the end-to-end pipeline —
from camera frames and INT8 tensors to dashboards and users.

<video controls width="720">  
<source src="/media/dev_nurse_project_web.webm" type="video/webm" />  
</video>  