---
name: blog-post-social-assets
description: Create a concise LinkedIn-ready summary and a matching social image for a blog post in this Astro site.
---

# Blog post social asset generator

Use this skill when the user wants to:
- write a social summary for a blog post
- create a LinkedIn post caption for a published article
- generate or refine a hero/social image for a blog post
- create metadata for a blog post's share experience

## Goal

Turn a blog post into:
1. a short, polished summary suitable for LinkedIn or other social sharing
2. a matching social image that visually represents the article
3. optional frontmatter updates for the post when the user wants the summary saved in the content

## Operating rules

- Read the target article from `src/content/blog/*.md` or the draft being worked on.
- Prefer the actual article content over a generic summary.
- Keep the summary concise, useful, and professional.
- Write for a technical audience and a personal engineering blog.
- Avoid hype phrases, buzzwords, or clickbait.
- Keep summaries clear and specific enough that a reader can understand the value without reading the article.

## Output format for the summary

Produce a summary that is:
- 1 paragraph, 2-4 sentences, usually 120-220 characters for LinkedIn-style sharing
- written in a clear, human tone
- focused on the real learning, insight, or takeaway
- suitable to be pasted directly into `linkedinSummary` frontmatter or a LinkedIn post body

Good structure:
- hook: what problem or topic the post addresses
- insight: what the article teaches or explains
- takeaway: why it matters to engineers or leaders

Example:
"A practical look at building event-driven Azure Functions integrations, with guidance on throughput, reliability, and the tradeoffs that matter in real systems."

## Image creation guidance

When the user asks for an image, create a social card or blog header that matches the blog's design language and is easy to read at a wide banner ratio.

Required header image size for this blog:
- 1920x400

Additional guidance:
- use a wide landscape layout suitable for a header/banner hero image
- keep text large and readable with strong contrast
- avoid clutter and keep one clear visual theme from the article
- maintain the same visual tone as the existing site and chapter headers

Recommended image structure:
- title in large bold text
- short subtitle or category label
- subtle accent color and simple geometric background
- no clutter
- readable at small sizes
- keep one clear theme from the article

Suggested content layout:
- top-left: category or tag such as "Azure", "Architecture", or "Engineering"
- center-left or center area: article title
- bottom: site name, author, and a small descriptor like "blog post"

## Content workflow

1. Read the article's frontmatter and main body.
2. Identify the core idea, the audience, and the technical takeaway.
3. Draft a social summary in 1-2 versions:
   - a concise version for LinkedIn
   - a slightly fuller version if the user wants more context
4. If image generation is requested, produce a design brief for the card:
   - title
   - subtitle
   - palette
   - layout
   - wording
5. If a local asset is desired, suggest saving it under `public/images/social/` or a blog-specific image folder and naming it consistently with the post slug.

## Frontmatter conventions

When asked to save the summary into the article:
- use `linkedinSummary` in the frontmatter of the post
- keep the value as a single sentence or short paragraph, not a long article excerpt
- leave the actual post content unchanged unless the user explicitly asks for a metadata update

Example:
```yaml
---
title: "Example Post Title"
description: "A practical guide to ..."
linkedinSummary: "A practical look at ..."
---
```

## Quality bar

Do not output:
- generic filler like "check out my new post"
- excessive hashtags
- overlong LinkedIn copy
- images with too much text or unreadable layouts

Prefer:
- professional, practical, and specific writing
- clean, readable design
- a summary that matches the blog's tone and author voice

## Example prompt you can use

"Create a LinkedIn-ready summary and a matching social image for this blog post. Use the article title, the technical takeaway, and the audience. Keep the summary concise and professional. Then propose a simple social card layout with title, subtitle, and branding ideas."
