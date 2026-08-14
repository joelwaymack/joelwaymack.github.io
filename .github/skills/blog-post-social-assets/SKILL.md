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

Use an Unsplash background image that matches the article’s subject, not a generic stock photo. Read the post first and choose a visual that reflects the real topic:

- Azure / cloud / architecture -> cloud infrastructure, data centers, networks, or modern developer tooling
- event processing / messaging -> abstract streams, queues, data flow, systems integration
- containerization / app delivery -> development environments, containers, shipping, deployment pipelines
- leadership / people / team topics -> thoughtful, human-centered imagery with a calm professional tone
- front-end / UI / web -> developer workspace, browser UI, code screens, product build scenes

Design rules for the header:

- use a wide landscape layout suitable for a header/banner hero image
- keep text large and readable with strong contrast
- avoid clutter and keep one clear visual theme from the article
- maintain the same visual tone as the existing site and chapter headers
- use the Unsplash image as the backdrop, then layer article-specific content on top
- choose a background with enough negative space so the text remains readable
- prefer a background that is slightly darkened or desaturated so the overlay text stands out

Recommended image structure:

- background: relevant Unsplash photo matching the article subject
- overlay: article-specific icon, simple diagram, or the post’s existing hero/technical image placed on the right or lower-right
- title in large bold text
- short subtitle or category label
- subtle accent color and simple geometric background or translucent panel behind the text
- no clutter
- readable at small sizes
- keep one clear theme from the article

Suggested content layout:

- top-left: category or tag such as "Azure", "Architecture", "Engineering", or "Leadership"
- center-left or center area: article title
- right side: a supporting image, icon, or technical illustration related to the topic
- bottom: site name, author, and a small descriptor like "blog post"

Implementation guidance:

- search Unsplash with subject-specific keywords from the article and select a photo that visually matches the concept
- keep the background photo editorial and professional; avoid distracting, noisy, or overly busy imagery
- use a semi-transparent dark overlay or blur behind the text so white text remains crisp on top of the photo
- if the article contains a clear visual concept (for example, event flow, architecture diagram, dashboard, or code screenshot), layer that element over the photo rather than relying on text alone
- keep all branding minimal and consistent with the personal blog aesthetic

Example overlay concept:

- article topic: Azure Functions event processing
- background: Unsplash cloud/architecture scene with data center or abstract system imagery
- overlay: a simplified event flow diagram or a function pipeline graphic on the right
- text: title + small category label placed left or center with white text on a dark transparent panel

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
