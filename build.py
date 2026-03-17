#!/usr/bin/env python3
import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from urllib.parse import quote

import markdown
from markdown.extensions import fenced_code, tables, toc
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter
from jinja2 import Environment, FileSystemLoader, pass_environment


# --- Configuration ---
BASE_DIR = Path(__file__).parent
CONTENT_DIR = BASE_DIR / "content"
OUTPUT_DIR = BASE_DIR / "public"
STATIC_DIR = BASE_DIR / "static"
SASS_DIR = BASE_DIR / "sass"
TEMPLATES_DIR = BASE_DIR / "templates_custom"

SITE_CONFIG = {
    "title": "dev_stories",
    "base_url": "https://maltsev-dev.github.io",
    "author": "A.Maltsev",
    "logo_text": "Research. Build. Evolve.",
    "accent_color": "orange",
    "posts_per_page": 10,
}


# --- Custom Markdown Extension for Pygments ---
class PygmentsFencedCodeExtension(fenced_code.FencedCodeExtension):
    """Extension to use Pygments for code highlighting"""
    
    def run(self, lines: List[str]) -> List[str]:
        return super().run(lines)


def create_markdown_instance() -> markdown.Markdown:
    """Create markdown instance with extensions"""
    return markdown.Markdown(
        extensions=[
            'fenced_code',
            'tables',
            'toc',
            'codehilite',
        ],
        extension_configs={
            'codehilite': {
                'css_class': 'code-highlight',
                'pygments_style': 'one-dark',
                'use_pygments': True,
                'linenums': False,
                'guess_lang': False,
            }
        }
    )


# --- Content Processing ---
class Post:
    """Represents a blog post"""
    def __init__(self, path: Path):
        self.path = path
        
        # Read and parse frontmatter manually
        content = path.read_text(encoding='utf-8')
        
        # Parse frontmatter (between +++ markers)
        if content.startswith('+++'):
            parts = content.split('+++', 2)
            if len(parts) >= 3:
                fm_text = parts[1].strip()
                self.content = parts[2].strip()
                
                # Parse TOML frontmatter manually
                self.metadata = self._parse_toml(fm_text)
            else:
                self.metadata = {}
                self.content = content
        else:
            self.metadata = {}
            self.content = content

        self.title: str = self.metadata.get("title", "Untitled")
        self.date: str = self.metadata.get("date", "")
        
        # Tags can be in [taxonomies] table or directly in metadata
        self.tags: List[str] = []
        if "taxonomies" in self.metadata and isinstance(self.metadata["taxonomies"], dict):
            self.tags = self.metadata["taxonomies"].get("tags", [])
        else:
            self.tags = self.metadata.get("tags", [])
        
        self.slug: str = path.stem
        self.summary: Optional[str] = None
        
        # Extract summary (content before <!-- more -->)
        if "<!-- more -->" in self.content:
            self.summary = self.content.split("<!-- more -->")[0].strip()

        # Generate URL path
        if "path" in self.metadata:
            self.url_path = self.metadata["path"]
        else:
            self.url_path = self.slug
    
    def _parse_toml(self, toml_text: str) -> Dict[str, Any]:
        """Simple TOML parser for frontmatter"""
        result = {}
        current_table = None
        
        for line in toml_text.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            # Handle table headers like [taxonomies]
            if line.startswith('[') and line.endswith(']'):
                current_table = line[1:-1]
                result[current_table] = {}
                continue
            
            # Handle key = value pairs
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                
                # Parse value
                if value.startswith('"') and value.endswith('"'):
                    parsed_value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    parsed_value = value[1:-1]
                elif value == 'true':
                    parsed_value = True
                elif value == 'false':
                    parsed_value = False
                elif value.startswith('[') and value.endswith(']'):
                    # Parse array
                    array_content = value[1:-1].strip()
                    if array_content:
                        parsed_value = [
                            item.strip().strip('"').strip("'")
                            for item in array_content.split(',')
                        ]
                    else:
                        parsed_value = []
                else:
                    try:
                        parsed_value = int(value)
                    except ValueError:
                        try:
                            parsed_value = float(value)
                        except ValueError:
                            parsed_value = value
                
                if current_table:
                    result[current_table][key] = parsed_value
                else:
                    result[key] = parsed_value
        
        return result
            
    def render_content(self) -> str:
        """Render markdown content to HTML"""
        md = create_markdown_instance()
        html = md.convert(self.content)
        
        # Fix image paths to use static directory
        html = re.sub(
            r'src="/images/',
            f'src="{SITE_CONFIG["base_url"]}/static/images/',
            html
        )
        html = re.sub(
            r'src="/media/',
            f'src="{SITE_CONFIG["base_url"]}/static/media/',
            html
        )
        
        return html
    
    def __repr__(self):
        return f"Post(title={self.title}, date={self.date})"


def load_all_posts() -> List[Post]:
    """Load all posts from content directory"""
    posts = []
    
    # Load posts from root content directory
    for md_file in CONTENT_DIR.glob("*.md"):
        if md_file.name == "_index.md":
            continue
        posts.append(Post(md_file))
    
    # Sort by date (newest first)
    posts.sort(key=lambda p: p.date, reverse=True)
    return posts


def load_pages() -> Dict[str, Post]:
    """Load static pages from content/pages"""
    pages_dir = CONTENT_DIR / "pages"
    pages = {}
    
    if pages_dir.exists():
        for md_file in pages_dir.glob("*.md"):
            post = Post(md_file)
            pages[post.url_path] = post
    
    return pages


def get_all_tags(posts: List[Post]) -> Dict[str, List[Post]]:
    """Group posts by tags"""
    tags: Dict[str, List[Post]] = {}
    
    for post in posts:
        for tag in post.tags:
            if tag not in tags:
                tags[tag] = []
            tags[tag].append(post)
    
    # Sort posts within each tag by date
    for tag in tags:
        tags[tag].sort(key=lambda p: p.date, reverse=True)
    
    return tags


# --- HTML Generation ---
def setup_jinja_env() -> Environment:
    """Setup Jinja2 template environment"""
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=True
    )
    
    # Add custom filters
    def format_date_filter(d: str) -> str:
        if not d:
            return ""
        try:
            return datetime.strptime(d, "%Y-%m-%d").strftime("%B %d, %Y")
        except ValueError:
            return d

    def format_date_short_filter(d: str) -> str:
        return d if d else ""

    env.filters['format_date'] = format_date_filter
    env.filters['format_date_short'] = format_date_short_filter
    env.globals['now'] = datetime.now

    return env


def generate_post_html(post: Post, env: Environment, all_posts: List[Post]) -> str:
    """Generate HTML for a single post"""
    template = env.get_template("post.html")
    
    # Find adjacent posts for navigation
    post_index = next((i for i, p in enumerate(all_posts) if p.slug == post.slug), -1)
    earlier = all_posts[post_index + 1] if post_index >= 0 and post_index < len(all_posts) - 1 else None
    later = all_posts[post_index - 1] if post_index > 0 else None
    
    return template.render(
        site=SITE_CONFIG,
        page=post,
        content=post.render_content(),
        earlier=earlier,
        later=later,
        current_path=post.url_path
    )


def generate_index_html(posts: List[Post], env: Environment, page: int = 1, total_pages: int = 1) -> str:
    """Generate homepage HTML with pagination"""
    template = env.get_template("home.html")

    start = (page - 1) * SITE_CONFIG["posts_per_page"]
    end = start + SITE_CONFIG["posts_per_page"]
    page_posts = posts[start:end]

    return template.render(
        site=SITE_CONFIG,
        posts=page_posts,
        all_posts=posts,
        current_page=page,
        total_pages=total_pages,
        current_path=""
    )


def generate_archive_html(posts: List[Post], env: Environment) -> str:
    """Generate archive page HTML"""
    template = env.get_template("archive.html")
    
    return template.render(
        site=SITE_CONFIG,
        posts=posts,
        current_path="archive"
    )


def generate_tag_page(tag: str, tag_posts: List[Post], env: Environment) -> str:
    """Generate tag listing page HTML"""
    template = env.get_template("tag.html")
    
    return template.render(
        site=SITE_CONFIG,
        tag=tag,
        posts=tag_posts,
        current_path=f"tags/{tag}"
    )


def generate_static_page_html(post: Post, env: Environment) -> str:
    """Generate static page HTML"""
    # Use custom template for about page (renders template directly without markdown content)
    if post.url_path == "about" and env.get_template("about.html"):
        template = env.get_template("about.html")
        return template.render(
            site=SITE_CONFIG,
            page=post,
            content="",  # about.html has its own content
            current_path=post.url_path
        )
    
    template = env.get_template("page.html")

    return template.render(
        site=SITE_CONFIG,
        page=post,
        content=post.render_content(),
        current_path=post.url_path
    )


def generate_projects_showcase_html(env: Environment) -> str:
    """Generate projects showcase page HTML"""
    template = env.get_template("projects_showcase.html")
    
    return template.render(
        site=SITE_CONFIG,
        current_path="projects"
    )


# --- Build Functions ---
def clean_output_dir():
    """Remove and recreate output directory"""
    if OUTPUT_DIR.exists():
        try:
            shutil.rmtree(OUTPUT_DIR)
        except PermissionError:
            print("[WARN] Could not clean public directory (server may be running). Rebuilding in place...")
    if not OUTPUT_DIR.exists():
        OUTPUT_DIR.mkdir(parents=True)


def copy_static_files():
    """Copy static assets to output"""
    if STATIC_DIR.exists():
        shutil.copytree(STATIC_DIR, OUTPUT_DIR / "static", dirs_exist_ok=True)


def build_site():
    """Main build function"""
    print("[BUILD] Building site...")

    # Setup
    clean_output_dir()
    copy_static_files()

    # Load content
    posts = load_all_posts()
    pages = load_pages()
    tags = get_all_tags(posts)

    print(f"[INFO] Loaded {len(posts)} posts")
    print(f"[INFO] Loaded {len(pages)} pages")
    print(f"[INFO] Found {len(tags)} tags")
    
    # Setup templates
    env = setup_jinja_env()
    
    # Generate paginated index
    total_pages = (len(posts) + SITE_CONFIG["posts_per_page"] - 1) // SITE_CONFIG["posts_per_page"]

    for page_num in range(1, total_pages + 1):
        if page_num == 1:
            output_file = OUTPUT_DIR / "index.html"
        else:
            output_file = OUTPUT_DIR / f"page/{page_num}/index.html"
            output_file.parent.mkdir(parents=True, exist_ok=True)

        html = generate_index_html(posts, env, page_num, total_pages)
        output_file.write_text(html, encoding='utf-8')
        print(f"[OK] Generated page {page_num}/{total_pages}")

    # Generate individual posts
    for post in posts:
        output_file = OUTPUT_DIR / f"{post.url_path}.html"
        html = generate_post_html(post, env, posts)
        output_file.write_text(html, encoding='utf-8')

    print(f"[OK] Generated {len(posts)} post pages")

    # Generate archive page as /archive/index.html
    archive_dir = OUTPUT_DIR / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    archive_file = archive_dir / "index.html"
    html = generate_archive_html(posts, env)
    archive_file.write_text(html, encoding='utf-8')
    print("[OK] Generated archive page")

    # Generate tag pages as /tags/{tag}/index.html
    tags_dir = OUTPUT_DIR / "tags"
    for tag, tag_posts in tags.items():
        tag_output_dir = tags_dir / tag
        tag_output_dir.mkdir(parents=True, exist_ok=True)
        tag_file = tag_output_dir / "index.html"
        html = generate_tag_page(tag, tag_posts, env)
        tag_file.write_text(html, encoding='utf-8')

    print(f"[OK] Generated {len(tags)} tag pages")

    # Generate static pages
    for path, page_post in pages.items():
        if path == "archive":
            continue  # Already handled
        # Create folder/index.html for clean URLs (e.g., /about/index.html)
        output_dir = OUTPUT_DIR / path
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "index.html"
        html = generate_static_page_html(page_post, env)
        output_file.write_text(html, encoding='utf-8')

    print(f"[OK] Generated {len(pages) - 1} static pages")

    # Generate projects showcase page
    projects_dir = OUTPUT_DIR / "projects"
    projects_dir.mkdir(parents=True, exist_ok=True)
    projects_file = projects_dir / "index.html"
    html = generate_projects_showcase_html(env)
    projects_file.write_text(html, encoding='utf-8')
    print("[OK] Generated projects showcase page")

    print("\n[BUILD] Build complete!")
    print(f"[INFO] Output: {OUTPUT_DIR.absolute()}")


def serve_site():
    """Start development server"""
    import http.server
    import socketserver
    import webbrowser

    # Build first
    build_site()

    # Change to output directory
    os.chdir(OUTPUT_DIR)

    port = 1111
    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"\n[SERVER] Development server running at http://127.0.0.1:{port}")
        print("Press Ctrl+C to stop")

        # Open browser
        webbrowser.open(f"http://127.0.0.1:{port}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[SERVER] Server stopped")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        serve_site()
    else:
        build_site()
