---
title: "HTML Scraper"
date: "2023-06-26"
description: "A Spring Boot pipeline that fetches a page, parses it with Jsoup, maps the data to POJOs and writes an Excel file."
tags: ["java", "spring", "project"]
---
A Spring Boot application for scraping HTML data and converting it into an Excel spreadsheet.

[GitHub Repository](https://github.com/maltsev-dev/html_scraper_template)

The pipeline runs end to end: it fetches raw HTML from a given URL, extracts the relevant information, maps it to structured Java objects (POJOs), and writes the results into an `.xls` Excel file.

## Tech stack

- Spring Boot, the main application framework
- Jsoup, for HTML parsing
- Apache POI, for Excel file generation
- Spring Configuration, for setup through `application.properties`

## How it works

1. Fetch the HTML content. Makes a `GET` request to the target URL and retrieves the HTML response.
2. Parse the HTML with Jsoup. Uses Jsoup to create a `Document` object and navigate the DOM.
3. Map to POJO objects. Extracted data is converted into Java classes for easy manipulation.
4. Export to Excel (XLS). Generates a formatted `.xls` spreadsheet using Apache POI.
5. Configure through the properties file. Keywords and target URL can be defined in `application.properties`.

## How to run

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

## What it is good for

- Fully based on the Java ecosystem
- Requires no browser automation or WebDriver
- Easily customizable for different scraping needs
- Simple to set up and extend

## License

This project is licensed under the MIT License.
