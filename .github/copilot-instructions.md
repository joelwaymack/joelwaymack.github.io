# Copilot Instructions for this repository

## Project purpose
This repository is Joel Waymack's personal website and blog, published via Astro and GitHub Pages. The site is meant to showcase his professional profile and publish technical articles related to software engineering, cloud architecture, and leadership.

## Tech stack
- Astro
- TypeScript
- Markdown blog content
- GitHub Pages hosting

## Local development
- Install dependencies with `pnpm install`
- Start the dev server with `pnpm start` or `pnpm dev`
- Build the site with `pnpm build`
- Preview the build with `pnpm preview`

## Repository structure
- `src/pages/` contains page routes and top-level pages
- `src/content/blog/` contains published blog posts as Markdown files
- `src/content/drafts/` contains draft posts that are not yet published
- `src/components/` contains reusable Astro components
- `src/layouts/` contains page and blog layouts
- `src/styles/` contains global styles
- `public/` contains static assets such as images and fonts

## Content conventions
- Blog posts live in `src/content/blog/*.md`
- Drafts live in `src/content/drafts/*.md`
- Use frontmatter for blog metadata such as:
  - `title`
  - `description`
  - `pubDate`
  - `updatedDate` (optional)
  - `heroImage` (optional)
- Keep post titles clear, specific, and useful for search and social sharing.
- Prefer concise, practical technical writing with clear examples.
- Maintain a professional tone consistent with a personal engineering blog.

## Styling and code conventions
- Prefer simple, readable Astro/HTML patterns.
- Keep components focused and reusable.
- Maintain existing project conventions before introducing new patterns.
- Do not over-engineer simple static site content.
- Follow existing formatting and naming patterns unless a change clearly improves consistency.

## Publishing expectations
- This is a personal blog/site, not a product app.
- Prefer low-complexity, maintainable solutions.
- Updates should keep the site professional, readable, and easy to navigate.
- When adding content, ensure it fits the author's voice and technical focus.

## When making changes
- Prefer minimal, targeted edits.
- Preserve site structure and navigation.
- Keep content accessible and mobile-friendly.
- Rebuild the site if making content, layout, or routing changes.

## Helpful reminders
- The site is static and content-driven.
- Blog posts are the primary publishing mechanism.
- Keep the author persona consistent across the homepage, posts, and site copy.
- Avoid unnecessary framework churn or feature bloat.
