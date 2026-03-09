# Project Context: maltsev-dev.github.io

## Project Overview

This is a **personal technical blog and portfolio** built with a **custom Python-based static site generator**. The site is hosted on GitHub Pages and documents the author's engineering journey across embedded systems, Rust development, AI/ML, and full-stack projects.

**Live Site:** https://maltsev-dev.github.io

### Key Characteristics
- **Static Site Generator:** Custom Python script (`build.py`)
- **Dependencies:** markdown, pygments, jinja2 (see `requirements.txt`)
- **Theme:** Custom modern design with dark/light mode support
- **Deployment:** GitHub Actions → GitHub Pages
- **Styling:** Custom CSS with orange accent color scheme
- **Content Focus:** Embedded Rust, firmware development, ML on MCU, system architecture

---

## Directory Structure

```
maltsev-dev.github.io/
├── build.py                 # Main SSG build script
├── requirements.txt         # Python dependencies
├── content/                 # All markdown content
│   ├── *.md                # Blog posts (45 posts)
│   ├── pages/              # Static pages (about, archive)
│   └── projects/           # Project-specific content
├── templates_custom/        # Jinja2 HTML templates
│   ├── base.html           # Base template with theme toggle
│   ├── index.html          # Homepage with pagination
│   ├── post.html           # Individual post layout
│   ├── page.html           # Static page layout
│   ├── archive.html        # Archive listing
│   ├── tag.html            # Tag listing page
│   └── components/         # Reusable components
│       ├── header.html     # Site header
│       └── footer.html     # Site footer
├── static/                  # Static assets
│   ├── css/style.css       # Main stylesheet (modern, responsive)
│   ├── js/theme.js         # Dark/light mode toggle
│   ├── images/             # Blog post images
│   ├── fonts/              # Custom fonts
│   └── favicon.png         # Site favicon
├── .github/workflows/       # CI/CD pipeline
├── public/                  # Generated output (git-ignored)
└── venv/                    # Python virtual environment (git-ignored)
```

---

## Building and Running

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

### Local Development

```bash
# Activate venv first
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Build the site
python build.py

# Build and start development server (opens browser)
python build.py serve
```

The development server runs at `http://127.0.0.1:1111`.

### Deployment

Deployment is automated via GitHub Actions:
- Push to `main` branch triggers the workflow in `.github/workflows/main.yaml`
- Uses Python 3.11 to build the site
- Deploys `public/` directory to GitHub Pages
- No manual deployment steps required

---

## Content Organization

### Content Types

| Type | Location | Purpose |
|------|----------|---------|
| **Blog Posts** | `content/*.md` | Technical articles (embedded Rust, debugging, firmware) |
| **Static Pages** | `content/pages/` | About, Archive pages |
| **Projects** | `content/projects/` | Project-specific content |

### Front Matter Format

All content files use TOML frontmatter:

```toml
+++
title = "Article Title"
date = "YYYY-MM-DD"

[taxonomies]
tags = ["tag1", "tag2"]
+++

Content here...
<!-- more -->
Optional summary separator
```

### Key Tags Used
- `rust`, `embedded`, `project`, `nurse`, `basic`, `mcu`, `esp32`, `rp2040`, `nrf52833`

### Content Themes
1. **Embedded Rust Series** - Firmware development, debugging, memory management
2. **Dev Nurse Project** - ESP32-S3 device with TinyML, full-stack IoT system
3. **Solana/Rust** - Blockchain development with Anchor framework
4. **Basic Electronics** - Foundational electronics concepts

---

## Configuration

### `build.py` Settings

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

### Features

- **Dark/Light Mode**: Automatic toggle with system preference detection
- **Responsive Design**: Mobile-first CSS with breakpoints
- **Code Highlighting**: Pygments with one-dark theme
- **Pagination**: 10 posts per page on homepage
- **Tag System**: Posts organized by tags (38 tags)
- **Archive**: Chronological listing by year
- **Post Navigation**: Earlier/Later post links

---

## Development Conventions

### Writing Style
- Technical, in-depth articles with practical examples
- Heavy use of code blocks, tables, and diagrams
- Emoji markers (🟠) for key points
- External references linked for further reading
- Use `<!-- more -->` to create summary teasers

### Code Examples
- Rust code with embedded-specific crates (`embedded-hal`, `defmt`, `probe-rs`)
- Configuration files (TOML, JSON)
- Hardware interface documentation (JTAG, SWD, RTT)

### Media Assets
- Images stored in `static/images/`
- Images referenced as `/images/filename.png` in markdown (auto-converted to static path)
- CV PDF available at `static/CV_Anatoly_Maltsev.pdf`

### Git Workflow
- All changes committed to `main` branch trigger auto-deployment
- `public/` and `venv/` are git-ignored
- Keep commit messages descriptive and focused

---

## Template System

Templates use **Jinja2** with custom filters:

| Filter | Description |
|--------|-------------|
| `format_date` | Formats date as "January 01, 2025" |
| `format_date_short` | Returns date as-is "2025-01-01" |
| `now` | Returns current datetime |

### Template Variables

Available in all templates:
- `site` - Site configuration dict
- `page` - Current page/post object
- `content` - Rendered HTML content
- `current_path` - Current URL path for active states

---

## CSS Architecture

The stylesheet (`static/css/style.css`) uses:
- **CSS Variables** for theming (light/dark mode)
- **Flexbox/Grid** for layouts
- **Mobile-first** responsive breakpoints
- **Smooth transitions** and animations
- **Print styles** for better printing

### Color Scheme
- Primary accent: Orange (`#f59140`)
- Dark background: `#1a1a2e`
- Light background: `#ffffff`

---

## Useful Commands

```bash
# Install/update dependencies
pip install -r requirements.txt

# Build site
python build.py

# Development server with live reload
python build.py serve

# Check Python version
python --version
```

---

## External Resources

- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
- [Python markdown](https://python-markdown.github.io/)
- [Pygments](https://pygments.org/)
- [GitHub Pages Deployment](https://docs.github.com/en/pages)
