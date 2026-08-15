import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const blogDir = path.join(repoRoot, "src/content/blog");
const siteUrl = process.env.SITE_URL || "https://waymack.net";
const isDryRun = ["1", "true", "yes"].includes(
  String(process.env.LINKEDIN_DRY_RUN || "").toLowerCase(),
);
const accessToken =
  process.env.LINKEDIN_ACCESS_TOKEN || (isDryRun ? "dry-run-token" : undefined);
const configuredAuthorUrn =
  process.env.LINKEDIN_AUTHOR_URN ||
  process.env.LINKEDIN_PERSON_URN ||
  (isDryRun ? "urn:li:person:123456" : undefined);

function normalizeLinkedInAuthorUrn(rawValue) {
  if (!rawValue) {
    return undefined;
  }

  const value = String(rawValue).trim();
  if (!value) {
    return undefined;
  }

  // LinkedIn UGC author validation is stricter than the public docs suggest:
  // the API accepts member/company URNs with numeric IDs, not person/organization.
  if (/^urn:li:person:/i.test(value)) {
    return value.replace(/^urn:li:person:/i, "urn:li:member:");
  }

  if (/^urn:li:organization:/i.test(value)) {
    return value.replace(/^urn:li:organization:/i, "urn:li:company:");
  }

  return value;
}

function isValidLinkedInAuthorUrn(value) {
  return /^urn:li:(member:-?\d+|company:\d+)$/.test(String(value || ""));
}

const authorUrn = normalizeLinkedInAuthorUrn(configuredAuthorUrn);

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return {};
  }

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const keyValue = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) {
      continue;
    }

    const [, key, rawValue] = keyValue;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value === "true") value = true;
    if (value === "false") value = false;

    result[key] = value;
  }

  return result;
}

function getSlugFromFile(fileName) {
  return fileName.replace(/\.md$/, "");
}

function updateFrontmatter(markdown, updates) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return markdown;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);
  const entries = new Map();

  for (const line of lines) {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) {
      continue;
    }
    entries.set(keyValue[1], line);
  }

  for (const [key, value] of Object.entries(updates)) {
    const normalized = `${key}: ${value}`;
    if (entries.has(key)) {
      const targetLine = entries.get(key);
      const idx = lines.indexOf(targetLine);
      if (idx !== -1) {
        lines[idx] = normalized;
      }
    } else {
      const insertAfter = lines.findIndex((line) =>
        line.startsWith("description:"),
      );
      if (insertAfter >= 0) {
        lines.splice(insertAfter + 1, 0, normalized);
      } else {
        lines.push(normalized);
      }
    }
  }

  return `---\n${lines.join("\n")}\n---\n${markdown.slice(match[0].length)}`;
}

async function readBlogPosts() {
  const files = (await fs.readdir(blogDir))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const posts = [];

  for (const file of files) {
    const fullPath = path.join(blogDir, file);
    const markdown = await fs.readFile(fullPath, "utf8");
    const frontmatter = parseFrontmatter(markdown);

    if (frontmatter.linkedinShared === true) {
      continue;
    }

    const title = String(frontmatter.title || getSlugFromFile(file));
    const description = String(frontmatter.description || "");
    const pubDate = frontmatter.pubDate
      ? new Date(frontmatter.pubDate).toISOString()
      : new Date().toISOString();
    const slug = getSlugFromFile(file);

    posts.push({
      file,
      fullPath,
      title,
      description,
      pubDate,
      slug,
      url: `${siteUrl}/blog/${slug}`,
      summary: frontmatter.linkedinSummary || description,
    });
  }

  return posts.sort(
    (a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime(),
  );
}

async function sharePostToLinkedIn(post) {
  const url = "https://api.linkedin.com/v2/ugcPosts";
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: `${post.title}\n\n${post.summary}\n\n${post.url}`,
        },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            description: {
              text: post.summary,
            },
            originalUrl: post.url,
            title: {
              text: post.title,
            },
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  if (isDryRun) {
    console.log("LinkedIn dry run enabled. No live post will be created.");
    console.log(JSON.stringify({ url, payload }, null, 2));
    return { dryRun: true, url, payload };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `LinkedIn API request failed (${response.status}): ${text}`,
    );
  }

  return text;
}

async function markPostAsShared(fullPath) {
  const markdown = await fs.readFile(fullPath, "utf8");
  const updated = updateFrontmatter(markdown, { linkedinShared: "true" });
  await fs.writeFile(fullPath, updated);
}

async function main() {
  if (!accessToken || !authorUrn) {
    if (isDryRun) {
      console.log(
        "Dry-run mode enabled; continuing without live LinkedIn credentials to preview the payload.",
      );
    } else {
      console.log(
        "LinkedIn share skipped because LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN (or LINKEDIN_PERSON_URN) are not configured.",
      );
      return;
    }
  }

  if (authorUrn && !isValidLinkedInAuthorUrn(authorUrn)) {
    throw new Error(
      "Invalid LinkedIn author URN. Expected urn:li:member:<numeric-id> or urn:li:company:<numeric-id>. " +
        "If you have a person or organization URN, convert it to the numeric member/company form before posting.",
    );
  }

  const posts = await readBlogPosts();
  const nextPost = posts[0];

  if (!nextPost) {
    console.log("No unpublished posts are ready to share on LinkedIn.");
    return;
  }

  console.log(`Preparing LinkedIn payload for: ${nextPost.title}`);
  const result = await sharePostToLinkedIn(nextPost);

  if (result && result.dryRun) {
    console.log(
      "Dry run complete; no post was published and no share state was written.",
    );
    return;
  }

  await markPostAsShared(nextPost.fullPath);
  console.log(`Marked ${nextPost.file} as linkedinShared: true.`);
}

await main();
