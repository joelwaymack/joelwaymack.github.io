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
const personUrn =
  process.env.LINKEDIN_PERSON_URN ||
  (isDryRun ? "urn:li:person:dry-run" : undefined);

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
    author: personUrn,
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
      "X-Restli-Protocol-Version": "2.0",
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
  if (!accessToken || !personUrn) {
    if (isDryRun) {
      console.log(
        "Dry-run mode enabled; continuing without live LinkedIn credentials to preview the payload.",
      );
    } else {
      console.log(
        "LinkedIn share skipped because LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN are not configured.",
      );
      return;
    }
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
