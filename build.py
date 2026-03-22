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
    "title": "AI Operational Systems",
    "base_url": "https://maltsev-dev.github.io",
    "author": "A.Maltsev",
    "logo_text": "Automate. Scale. Win.",
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

        # Parse frontmatter (between +++ markers for TOML or --- for YAML)
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
        elif content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                fm_text = parts[1].strip()
                self.content = parts[2].strip()
                # Parse YAML frontmatter manually
                self.metadata = self._parse_yaml(fm_text)
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
        self.extra: Dict[str, Any] = self.metadata.get("extra", {})

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

    def _parse_yaml(self, yaml_text: str) -> Dict[str, Any]:
        """Simple YAML parser for frontmatter (handles basic YAML with nesting)"""
        result = {}
        lines = yaml_text.split('\n')
        
        # Track state
        current_key = None  # Top-level key being processed
        current_list = None  # Current list being built
        current_dict = None  # Current dict item in list
        nested_key = None  # Key inside nested dict (like extra)
        
        for line in lines:
            # Skip empty lines and comments
            if not line.strip() or line.strip().startswith('#'):
                continue
            
            indent = len(line) - len(line.lstrip())
            stripped = line.strip()
            
            # Top-level key: value (indent 0)
            if indent == 0 and ':' in stripped:
                key, value = stripped.split(':', 1)
                key = key.strip()
                value = value.strip()
                current_key = key
                nested_key = None
                
                if value == '':
                    result[key] = None
                    current_list = None
                    current_dict = None
                else:
                    result[key] = self._parse_yaml_value(value)
                    current_list = None
                    current_dict = None
            
            # Level 2: nested dict key: value OR list start
            elif indent == 2 and current_key:
                # Initialize nested dict if needed
                if result.get(current_key) is None:
                    result[current_key] = {}
                
                if isinstance(result[current_key], dict):
                    if stripped.startswith('- '):
                        # This shouldn't happen at indent 2 under a dict
                        pass
                    elif ':' in stripped:
                        key, value = stripped.split(':', 1)
                        key = key.strip()
                        value = value.strip()
                        nested_key = key
                        
                        if value == '':
                            result[current_key][key] = None
                            current_list = None
                        else:
                            result[current_key][key] = self._parse_yaml_value(value)
                            current_list = None
            
            # Level 4: list items under nested dict key
            elif indent == 4 and stripped.startswith('- '):
                # Find which nested key this list belongs to
                if current_key and nested_key and isinstance(result.get(current_key), dict):
                    if result[current_key].get(nested_key) is None:
                        result[current_key][nested_key] = []
                    current_list = result[current_key][nested_key]
                    
                    if isinstance(current_list, list):
                        item_value = stripped[2:].strip()
                        if ':' in item_value and not item_value.startswith('"'):
                            item_dict = {}
                            k, v = item_value.split(':', 1)
                            item_dict[k.strip()] = self._parse_yaml_value(v.strip())
                            current_list.append(item_dict)
                            current_dict = item_dict
                        else:
                            current_list.append(self._parse_yaml_value(item_value))
                            current_dict = None
            
            # Level 6+: nested key: value in list item
            elif indent >= 6 and current_dict is not None and ':' in stripped:
                key, value = stripped.split(':', 1)
                key = key.strip()
                value = value.strip()
                current_dict[key] = self._parse_yaml_value(value)
        
        return result

    def _fix_yaml_lists(self, obj: Any, parent: Dict = None, key: str = None):
        """Convert empty dicts to lists if they should be lists based on content"""
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if isinstance(v, dict) and len(v) == 0:
                    # Check if this key is followed by list items in original
                    # For now, assume keys with list-like names should be lists
                    pass
                else:
                    self._fix_yaml_lists(v, obj, k)

    def _parse_yaml_value(self, value: str) -> Any:
        """Parse a YAML value string into Python type"""
        if not value:
            return ""
        if value.startswith('"') and value.endswith('"'):
            return value[1:-1]
        if value.startswith("'") and value.endswith("'"):
            return value[1:-1]
        if value == 'true':
            return True
        if value == 'false':
            return False
        if value.startswith('[') and value.endswith(']'):
            array_content = value[1:-1].strip()
            if array_content:
                return [item.strip().strip('"').strip("'") for item in array_content.split(',')]
            return []
        try:
            return int(value)
        except ValueError:
            try:
                return float(value)
            except ValueError:
                return value

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


def load_project_pages() -> Dict[str, str]:
    """Load project landing pages from content/projects (HTML files)"""
    projects_dir = CONTENT_DIR / "projects"
    projects = {}

    if projects_dir.exists():
        for html_file in projects_dir.glob("*.html"):
            if html_file.name == "index.html":
                continue  # Skip the projects index page
            slug = html_file.stem
            projects[slug] = html_file.read_text(encoding='utf-8')

    return projects


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


def generate_project_page_html(post: Post, env: Environment) -> str:
    """Generate HTML for project landing page"""
    # Use template from frontmatter, default to project_landing.html
    template_name = post.metadata.get("template", "project_landing.html")
    template = env.get_template(template_name)

    return template.render(
        site=SITE_CONFIG,
        page=post,
        content=post.render_content(),
        current_path=f"projects/{post.slug}"
    )


def generate_projects_showcase_html(env: Environment) -> str:
    """Generate projects showcase page HTML"""
    template = env.get_template("projects_showcase.html")

    return template.render(
        site=SITE_CONFIG,
        current_path="projects"
    )


def generate_404_html(env: Environment) -> str:
    """Generate 404 error page HTML"""
    template = env.get_template("404.html")

    return template.render(
        site=SITE_CONFIG,
        current_path="404"
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
    projects = load_project_pages()
    tags = get_all_tags(posts)

    print(f"[INFO] Loaded {len(posts)} posts")
    print(f"[INFO] Loaded {len(pages)} pages")
    print(f"[INFO] Loaded {len(projects)} project pages")
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

    # Copy project landing pages (pre-built HTML)
    for slug, project_html in projects.items():
        project_output_dir = projects_dir / slug
        project_output_dir.mkdir(parents=True, exist_ok=True)
        project_file = project_output_dir / "index.html"
        # Fix relative paths in HTML (e.g., /static/ -> ../static/ or keep absolute)
        project_file.write_text(project_html, encoding='utf-8')

    print(f"[OK] Generated {len(projects)} project landing pages")

    # Generate 404 error page
    output_file = OUTPUT_DIR / "404.html"
    html = generate_404_html(env)
    output_file.write_text(html, encoding='utf-8')
    print("[OK] Generated 404 error page")

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
