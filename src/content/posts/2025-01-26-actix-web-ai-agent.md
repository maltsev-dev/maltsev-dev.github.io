---
title: "🤖 Actix-web AI Agent"
date: "2025-01-26"
tags: ["rust", "actix_web", "open_ai", "project"]
---
Actix-web AI Agent. Built with 🤎 in Rust  
[Effortless Backend Prototyping with Rust](https://www.linkedin.com/pulse/effortless-backend-prototyping-rust-anatolii-maltsev-hvvce/?trackingId=lGXFeD6ET%2ByFSocPHYS9qg%3D%3D)  
[Documentation](https://github.com/maltsev-dev/rest_on)

---

## **RestOn**
[📚 rest_on](https://github.com/maltsev-dev/rest_on)

RestOn is an advanced tool that leverages the power of OpenAI's GPT to automate the generation of backend code for your projects and prototypes.
It aims to streamline your development process, enabling the automatic creation of full-stack web applications and more complex systems.
Whether you need a simple `CRUD app` or a sophisticated `SAAS platform`, Auto GPT Agent has you covered.

## **Features**
- **🌟 Automatic Code Generation**: Use GPT API to generate backend code for services built with `actix-web` and other popular Rust libraries.
- **🔥 CRUD Operations**: Generate standard operations for data manipulation (Create, Read, Update, Delete).
- **🛠️ Template Flexibility**: Easily adapt web server templates to different requirements.
- **🌍 Ease of Use**: Simple interface to interact with the project.

## **Tools**
<p align="center" style="margin:0; padding:0;">
  <code>rust 1.83.0</code>
  <code>actix_web 4.9.0</code>
  <code>tokio 1.28.0</code>
  <code>reqwest 0.12.10</code>
  <code>serde 1.0.160</code>
  <code>actix_cors 0.7.0</code>
  <code>dotenv 0.15.0</code>
  <code>crossterm 0.28.1</code>
  <code>async-trait 0.1.83</code>
  <code>webbrowser 1.0.3</code>
  <code>ai_functions 0.1.1</code>
</p>

- **Rust**: The primary programming language for building fast, secure, and concurrent services.
- **Actix-web**: A powerful and fast web framework for building web applications on Rust.
- **Tokio**: An asynchronous framework for Rust used for parallel task handling and async calls.
- **Reqwest**: An HTTP client for interacting with external APIs.
- **GPT API**: Used for generating code and executing tasks based on text-based queries.
  
## **Installation**

### 1. Clone the repository

```bash
git clone https://github.com/chemyl/auto_gpt_agent.git
cd auto_gpt_agent
```

### 2. Install Rust (if not already installed)

To install Rust, use the following command:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Install dependencies

Run the following command to install project dependencies:

```bash
cargo build
```

### 4.Add OPEN_AI keys

```text
    OPEN_AI_ORG
    OPEN_AI_KEY
.env
```

### 5. Run the project

Start the project with:

```bash
cargo run
```

## **Usage**

### 1. **Generate backend code**

Simply send a text query to the system, and it will generate backend code for you.

Example query:

```text
Create a webserver that shows today viral news in the US
```

### 3. **Confirmation**

After generating the backend code, you can

## **Example usage**

### 1. **Console output**

![Terminal screenshot of the AI agent taking a request for a US viral-news website, planning the solution and external API endpoints, prompting for review of the generated AI-written code, then building and testing the web server](/images/console_output.png)

### 2. **Generated [main] example**

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

## **How it works**

1. The project uses GPT API to process text queries and generate code.
2. Queries are sent to the system, which then generates backend code based on the input.
3. The code generation includes:
    - Creating new HTTP server.
    - Route creation for handling requests.
    - Json Database setup.
4. The generated code can be directly run on your server or further customized to fit your needs.

## **Future plans**

- **Support for More Complex Templates**: Allow generation of more specialized services based on detailed templates.
- **Command-Line Interface (CLI)**: A more advanced CLI for managing the project.
- **Support for Additional Databases**: Integration with more databases like MongoDB, MySQL, SQLite, and others.
- **CI/CD Integration**: Automate deployment pipelines.
- **Project requirements**: Perform in-depth client onboarding.
- **Extend testing**: Test all dynamic routes.
- **Frontend development**: Develop frontend Automation Agent based on Yew.
- **Local LLM**: Introduced local open source LLMs.

## **Contributing**

Welcome contributions! If you have ideas to improve the project, please create an [issue](https://github.com/chemyl/auto_gpt_agent/issues) or submit a pull request.

### How to contribute

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to your branch (`git push origin feature-branch`).
5. Open a Pull Request.

## **License**

This project is licensed under the MIT License - see the [LICENSE](https://github.com/chemyl/auto_gpt_agent/blob/master/LICENSE) file for details.
