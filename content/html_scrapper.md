+++
title = "📄 HTML Scraper"
date = "2023-06-26"

[taxonomies]
tags = ["java", "spring", "project"]
+++

**A Spring Boot application for scraping and converting HTML data into an Excel spreadsheet.**

<!-- more -->

---

[📚 GitHub Repository](https://github.com/maltsev-dev/html_scraper_template)

This project demonstrates a complete pipeline of working with web data using Java and Spring Boot. It fetches raw HTML from a given URL, extracts relevant information, maps it to structured Java objects (POJOs), and writes the results into an `.xls` Excel file.

---

## ⚙️ Tech Stack

* **Spring Boot** – main application framework
* **Jsoup** – HTML parsing
* **Apache POI** – Excel file generation
* **Spring Configuration** – flexible setup via `application.properties`

---

## 🚀 Features

1. **Fetch HTML content**
   Makes a `GET` request to the target URL and retrieves the HTML response.

2. **Parse HTML with Jsoup**
   Uses Jsoup to create a `Document` object and navigate the DOM.

3. **Map to POJO objects**
   Extracted data is converted into Java classes for easy manipulation.

4. **Export to Excel (XLS)**
   Generates a formatted `.xls` spreadsheet using Apache POI.

5. **Configurable via properties file**
   Keywords and target URL can be defined in `application.properties`.

---

## 🛠️ How to Run

1. Clone the repository:

```bash
git clone https://github.com/maltsev-dev/html_scraper_template
cd html_scraper_template
```

2. Configure the app in `src/main/resources/application.properties`:

```properties
target.url=https://example.com
scraper.keywords=Item,Price,Details
```

3. Run the application:

```bash
./mvnw spring-boot:run
```

4. The output Excel file (`output.xls`) will be generated in the project root.

---

## ✅ Benefits

* Fully based on the Java ecosystem
* Requires no browser automation or WebDriver
* Easily customizable for different scraping needs
* Simple to set up and extend

---

## 📄 License

This project is licensed under the **MIT License**.