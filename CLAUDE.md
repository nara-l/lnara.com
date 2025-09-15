# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website export from a WordPress site (lnara.com - Lawrence Nara's personal blog). The repository contains:

- A WordPress XML export file (`lawrencenara.WordPress.2025-09-14.xml`) containing all blog posts, pages, and metadata
- A complete static site export in the `simply-static-1-1757851696/` directory with all HTML, CSS, and JavaScript files

## Architecture

### Static Site Structure
- **Theme**: Uses the "Oliver" WordPress theme
- **Content**: Personal blog with posts about technology, entrepreneurship, life, and Africa
- **Structure**:
  - Main site files in `simply-static-1-1757851696/`
  - Theme assets in `simply-static-1-1757851696/wp-content/themes/oliver/`
  - JavaScript libraries include jQuery, Bootstrap, Owl Carousel, Magnific Popup, and custom theme scripts
  - CSS structure includes normalize, bootstrap, responsive breakpoints (768px, 992px), and theme-specific styles

### Key Directories
- `simply-static-1-1757851696/wp-content/themes/oliver/`: Theme files (CSS, JS, PHP templates)
- `simply-static-1-1757851696/wp-content/themes/oliver/js/`: JavaScript libraries and custom scripts
- `simply-static-1-1757851696/wp-content/themes/oliver/css/`: Stylesheets and responsive designs

## Development Notes

Since this is a static site export, there are no build processes, package managers, or development servers to run. The site can be served directly from any web server by pointing to the `simply-static-1-1757851696/` directory.

### Font Usage
The theme uses Google Fonts:
- Karla (for navigation, meta text, buttons)
- Merriweather (for headings, titles)
- Coustard (defined but usage unclear)

### JavaScript Dependencies
- jQuery 1.11.3
- Bootstrap components
- Owl Carousel (for sliders)
- Magnific Popup (for lightboxes)
- Isotope (for grid layouts)
- Custom theme functionality in `main.js`