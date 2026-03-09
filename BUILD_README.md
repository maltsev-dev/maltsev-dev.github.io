# Custom Static Site Generator

This site uses a custom Python-based static site generator instead of Zola.

## Quick Start

### First Time Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Build Commands

```bash
# Build the site
python build.py

# Build and start development server
python build.py serve
```

The development server runs at http://127.0.0.1:1111

## Project Structure

```
maltsev-dev.github.io/
├── build.py                 # Main build script
├── requirements.txt         # Python dependencies
├── content/                 # Markdown content files
│   ├── *.md                # Blog posts
│   ├── pages/              # Static pages (about, archive)
│   └── projects/           # Project content
├── templates_custom/        # Jinja2 HTML templates
│   ├── base.html           # Base template
│   ├── index.html          # Homepage
│   ├── post.html           # Post page
│   ├── page.html           # Static page
│   ├── archive.html        # Archive page
│   ├── tag.html            # Tag listing
│   └── components/         # Reusable components
│       ├── header.html
│       └── footer.html
├── static/                  # Static assets
│   ├── css/                # Generated CSS
│   ├── js/                 # JavaScript files
│   ├── images/             # Images
│   └── fonts/              # Fonts
└── public/                  # Generated site (output)
```

## Features

- **Dark/Light Mode**: Automatic theme toggle with system preference detection
- **Responsive Design**: Mobile-first responsive layout
- **Code Highlighting**: Pygments-based syntax highlighting
- **Pagination**: Automatic pagination for home page
- **Tag System**: Posts organized by tags
- **Archive**: Chronological archive of all posts
- **Fast Builds**: Lightweight Python-based generator

## Configuration

Edit `build.py` to customize:

```python
SITE_CONFIG = {
    "title": "dev_stories",
    "base_url": "https://maltsev-dev.github.io",
    "author": "A.Maltsev",
    "logo_text": "busy hands == happy heart",
    "accent_color": "orange",
    "posts_per_page": 10,
}
```

## Markdown Frontmatter

```toml
+++
title = "Post Title"
date = "2025-01-01"

[taxonomies]
tags = ["tag1", "tag2"]
+++

Content here...
<!-- more -->
More content (shown on full page only)
```

## Deployment

The site is automatically deployed to GitHub Pages when you push to the `main` branch.

The GitHub Actions workflow:
1. Sets up Python 3.11
2. Installs dependencies
3. Runs `python build.py`
4. Deploys the `public/` directory to GitHub Pages

## Customization

### Styling
Edit `static/css/style.css` for custom styles. The CSS uses CSS variables for theming.

### Templates
Modify templates in `templates_custom/` to change the HTML structure.

### Adding Features
The build script is designed to be extensible. Add new template generators or content processors as needed.
