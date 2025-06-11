+++
title = "🤖 Actix-web AI Agent"
date = "2025-01-26"

[taxonomies]
tags = ["rust", "actix_web", "open_ai", "project"]
+++

Actix-web AI Agent. Built with 🤎 in Rust  
[Effortless Backend Prototyping with Rust](https://www.linkedin.com/pulse/effortless-backend-prototyping-rust-anatolii-maltsev-hvvce/?trackingId=lGXFeD6ET%2ByFSocPHYS9qg%3D%3D)  
[![Documentation](https://img.shields.io/badge/Documentation-Click_here-blue)](https://maltsev-dev.github.io/rest_on/)

<!-- more -->
---

# &emsp;&emsp;&emsp; **RestOn**
[📚 rest_on](https://github.com/maltsev-dev/rest_on)

RestOn is an advanced tool that leverages the power of OpenAI's GPT to automate the generation of backend code for your projects and prototypes.
It aims to streamline your development process, enabling the automatic creation of full-stack web applications and more complex systems.
Whether you need a simple `CRUD app` or a sophisticated `SAAS platform`, Auto GPT Agent has you covered.

## &emsp;&emsp;&emsp; **Features**
- **🌟 Automatic Code Generation**: Use GPT API to generate backend code for services built with `actix-web` and other popular Rust libraries.
- **🔥 CRUD Operations**: Generate standard operations for data manipulation (Create, Read, Update, Delete).
- **🛠️ Template Flexibility**: Easily adapt web server templates to different requirements.
- **🌍 Ease of Use**: Simple interface to interact with the project.

## &emsp;&emsp;&emsp; **Tools**
<p align="center" style="margin:0; padding:0;">
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/rust-1.83.0%20-green" alt="Rust Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/actix_web-4.9.0%20-yellow" alt="Actix-web Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/tokio-1.28.0%20-blue" alt="Tokio Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/reqwest-0.12.10%20-red" alt="reqwest Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/serde-1.0.160%20-gray" alt="Serde Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/actix_cors-0.7.0%20-cyan" alt="Actix-cors Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/dotenv-0.15.0%20-purple" alt="dotenv Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/crossterm-0.28.1%20-green" alt="Crossterm Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/async--trait-0.1.83%20-blue" alt="async-trait Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/webbrowser-1.0.3%20-yellow" alt="Webbrowser Version"/>
  <img style="display:inline-block; vertical-align:middle;"
       src="https://img.shields.io/badge/ai_functions-0.1.1%20-green" alt="AI_functions Version"/>
</p>

- **Rust**: The primary programming language for building fast, secure, and concurrent services.
- **Actix-web**: A powerful and fast web framework for building web applications on Rust.
- **Tokio**: An asynchronous framework for Rust used for parallel task handling and async calls.
- **Reqwest**: An HTTP client for interacting with external APIs.
- **GPT API**: Used for generating code and executing tasks based on text-based queries.
  
## &emsp;&emsp;&emsp; **Installation**

### &emsp;&emsp;&emsp; 1. Clone the Repository

```bash
git clone https://github.com/chemyl/auto_gpt_agent.git
cd auto_gpt_agent
```

### &emsp;&emsp;&emsp; 2. Install Rust (if not already installed)

To install Rust, use the following command:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### &emsp;&emsp;&emsp; 3. Install Dependencies

Run the following command to install project dependencies:

```bash
cargo build
```

### &emsp;&emsp;&emsp; 4.Add OPEN_AI Keys

```text
    OPEN_AI_ORG
    OPEN_AI_KEY
.env
```

### &emsp;&emsp;&emsp; 5. Run the Project

Start the project with:

```bash
cargo run
```

## &emsp;&emsp;&emsp; **Usage**

### &emsp;&emsp;&emsp; 1. **Generate Backend Code**

Simply send a text query to the system, and it will generate backend code for you.

Example query:

```text
Create a webserver that shows today viral news in the US
```

### &emsp;&emsp;&emsp; 3. **Confirmation**

After generating the backend code, you can

## &emsp;&emsp;&emsp; **Example Usage**

### &emsp;&emsp;&emsp; 1. **Console Output**

{{ img(src = "/images/console_output.png") }}

### &emsp;&emsp;&emsp; 2. **Generated [main] Example**

```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let db: Database = Database::load_from_file().unwrap_or_else(|_| Database::new());
    let data: web::Data<AppState> = web::Data::new(AppState {
        db: Mutex::new(db)
    });

    HttpServer::new(move || {
        App::new()
            .wrap(
                Cors::permissive()
                    .allowed_origin_fn(|origin, _req_head| {
                        origin.as_bytes().starts_with(b"http://localhost") || origin == "null"
                    })
                    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
                    .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
                    .allowed_header(header::CONTENT_TYPE)
                    .supports_credentials()
                    .max_age(3600)
            )
            .app_data(data.clone())
            .route("/news", web::post().to(create_news))
            .route("/news", web::get().to(read_all_news))
            .route("/news", web::put().to(update_news))
            .route("/news/{id}", web::get().to(read_news))
            .route("/news/{id}", web::delete().to(delete_news))
    })
        .bind("127.0.0.1:8080")?
        .run()
        .await
}
```

## &emsp;&emsp;&emsp; **How It Works**

1. The project uses GPT API to process text queries and generate code.
2. Queries are sent to the system, which then generates backend code based on the input.
3. The code generation includes:
    - Creating new HTTP server.
    - Route creation for handling requests.
    - Json Database setup.
4. The generated code can be directly run on your server or further customized to fit your needs.

## &emsp;&emsp;&emsp; **Future Plans**

- **Support for More Complex Templates**: Allow generation of more specialized services based on detailed templates.
- **Command-Line Interface (CLI)**: A more advanced CLI for managing the project.
- **Support for Additional Databases**: Integration with more databases like MongoDB, MySQL, SQLite, and others.
- **CI/CD Integration**: Automate deployment pipelines.
- **Project requirements**: Perform in-depth client onboarding.
- **Extend testing**: Test all dynamic routes.
- **Frontend development**: Develop frontend Automation Agent based on Yew.
- **Local LLM**: Introduced local open source LLMs.

## &emsp;&emsp;&emsp; **Contributing**

Welcome contributions! If you have ideas to improve the project, please create an [issue](https://github.com/chemyl/auto_gpt_agent/issues) or submit a pull request.

### &emsp;&emsp;&emsp; How to Contribute

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to your branch (`git push origin feature-branch`).
5. Open a Pull Request.

## &emsp;&emsp;&emsp; **License**

This project is licensed under the MIT License - see the [LICENSE](https://github.com/chemyl/auto_gpt_agent/blob/master/LICENSE) file for details.
