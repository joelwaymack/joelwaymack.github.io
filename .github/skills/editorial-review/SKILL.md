---
name: editorial-review
description: Review a draft blog post or article for grammar, spelling, clarity, internal consistency, and logical flow while preserving the author's voice and intent.
---

# Editorial Review

Use this skill when a draft article or blog post needs a final editorial pass before publishing.

## Triggers

Use this skill for prompts such as:

- "Review this doc for grammar and spelling"
- "Check this article for flow and consistency"
- "Edit this draft for clarity"
- "Proofread this blog post"
- "Does this article read logically from start to finish?"
- "Polish this draft without changing my voice"

## Scope

This skill focuses on:

- grammar
- spelling
- punctuation
- awkward phrasing
- repetition
- consistency of terminology and tense
- logical flow between sections
- transitions and section coherence
- clarity for a reader
- voice fidelity: whether the piece still sounds like the author's natural writing

Do not use this skill to rewrite the article into a completely different style or replace the author's perspective unless the user explicitly asks for that.

## Working approach

1. Read the entire document once to understand the argument, structure, and intended audience.
2. Identify issues in four passes:
   - mechanical: grammar, spelling, punctuation
   - editorial: clarity, phrasing, redundancy
   - structural: flow, transitions, section logic, consistency of framing
   - voice: whether the piece still sounds like the author, not like an outside editor
3. Make only the edits needed to improve quality and coherence.
4. Preserve the author's voice, tone, and technical meaning.
5. If a sentence is technically correct but awkward, smooth it without changing the meaning.
6. If a phrasing change makes the article sound generic, avoid it and choose a more specific version that matches the author's cadence and perspective.
7. Keep frontmatter, Markdown structure, and blog conventions intact.
8. When a section is logically weak, tighten the reasoning rather than inserting unrelated content.

## Repository-specific expectations

This repository is a personal blog built with Astro. Drafts and published posts live under:

- src/content/drafts/
- src/content/blog/

When editing content:

- preserve the article's Markdown structure
- do not break frontmatter
- keep headings, lists, and links valid
- maintain a clean, professional technical-blog tone

## Quality bar

The result should read like a polished draft that feels coherent, professional, and easy to follow. The article should:

- have no obvious grammar or spelling errors
- use consistent style and terminology
- flow logically from introduction to conclusion
- sound natural without being over-edited
- still clearly sound like the author’s own voice and worldview

When checking voice, favor sentence patterns, phrasing, and emphasis that feel native to the writer rather than generic business prose. If a change feels like a style transplant, revise it back toward the author's original cadence.

## Output expectations

Return the revised article content or provide a concise summary of the main improvements made. If there are bigger content issues that require rewriting, point them out clearly and suggest the smallest useful next step.

Before finalizing, explicitly confirm whether the revised version still sounds like the author's voice, and if not, preserve or restore the original phrasing that matches the writer's natural style.
