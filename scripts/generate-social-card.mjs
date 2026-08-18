import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1920;
const height = 400;

function printUsage() {
  console.log(`Usage: pnpm generate:social-card -- --slug <post-slug> [options]

Options:
  --slug <slug>              Blog or draft filename without .md
  --source <path>            Markdown source path, relative to the repository
  --output <path>            SVG output path, relative to the repository
  --background-url <url>     Optional Unsplash or other background image URL
  --logo <path>              Optional local logo or focal image, centered in the card
  --help                     Show this help`);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const key = argument.slice(2).replaceAll("-", "_");
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(
    new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"),
  );
  return match?.[1]?.trim() ?? "";
}

function readPostMetadata(markdown) {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error("The markdown file does not contain frontmatter.");
  }

  const frontmatter = match[1];
  const tags = [...frontmatter.matchAll(/^\s*-\s*["']?(.+?)["']?\s*$/gm)].map(
    (tag) => tag[1].trim(),
  );
  return {
    title: frontmatterValue(frontmatter, "title") || "Untitled post",
    description: frontmatterValue(frontmatter, "description"),
    category: tags[0] || "Engineering",
  };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maxCharacters) {
  const words = value.split(/\\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.slice(0, 2);
}

function localImageDataUri(imagePath) {
  if (!imagePath) {
    return "";
  }
  const extension = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  const mimeType = mimeTypes[extension];
  if (!mimeType) {
    throw new Error(`Unsupported focal image type: ${extension}`);
  }
  const content = readFileSync(imagePath);
  return `data:${mimeType};base64,${content.toString("base64")}`;
}

function renderCard(metadata, options, focalImage) {
  const titleLines = wrapText(metadata.title, 34);
  const description = metadata.description
    ? wrapText(metadata.description, 54)[0]
    : "Practical engineering notes";
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="320" y="${174 + index * 54}" class="title">${escapeXml(line)}</text>`,
    )
    .join("\n    ");
  const focalMarkup = focalImage
    ? `<image href="${focalImage}" x="860" y="70" width="200" height="200" preserveAspectRatio="xMidYMid meet" />`
    : `<circle cx="960" cy="170" r="92" fill="#1f7a8c" stroke="#d9f0f2" stroke-width="4" />
    <text x="960" y="190" text-anchor="middle" class="mark">${escapeXml(metadata.category.slice(0, 2).toUpperCase())}</text>`;
  const backgroundMarkup = options.background_url
    ? `<image href="${escapeXml(options.background_url)}" x="0" y="0" width="1920" height="400" preserveAspectRatio="xMidYMid slice" />`
    : `<rect width="1920" height="400" fill="#102a43" />
    <path d="M0 330 C320 240 520 390 820 292 S1400 190 1920 280 V400 H0 Z" fill="#163f59" />`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#071b2b" stop-opacity="0.92" />
      <stop offset="0.5" stop-color="#071b2b" stop-opacity="0.48" />
      <stop offset="1" stop-color="#071b2b" stop-opacity="0.78" />
    </linearGradient>
    <style>
      .category { fill: #b8e3e8; font: 700 20px Georgia, serif; letter-spacing: 3px; }
      .title { fill: #ffffff; font: 700 42px Georgia, serif; }
      .subtitle { fill: #d9f0f2; font: 400 20px Georgia, serif; }
      .mark { fill: #ffffff; font: 700 48px Georgia, serif; }
      .brand { fill: #ffffff; font: 700 18px Georgia, serif; letter-spacing: 2px; }
    </style>
  </defs>
  ${backgroundMarkup}
  <rect width="1920" height="400" fill="url(#shade)" />
  <text x="320" y="90" class="category">${escapeXml(metadata.category.toUpperCase())}</text>
  ${titleMarkup}
  <text x="320" y="318" class="subtitle">${escapeXml(description)}</text>
  <g aria-label="Centered primary image content">
    <circle cx="960" cy="170" r="112" fill="#071b2b" fill-opacity="0.42" stroke="#b8e3e8" stroke-opacity="0.7" stroke-width="2" />
    ${focalMarkup}
  </g>
  <text x="960" y="330" text-anchor="middle" class="brand">JOEL WAYMACK | ENGINEERING NOTES</text>
</svg>
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  if (!options.slug && !options.source) {
    printUsage();
    throw new Error("Provide --slug or --source.");
  }

  const source = options.source
    ? path.resolve(root, options.source)
    : path.join(root, "src", "content", "blog", `${options.slug}.md`);
  if (!existsSync(source)) {
    throw new Error(`Post not found: ${path.relative(root, source)}`);
  }

  const markdown = await readFile(source, "utf8");
  const metadata = readPostMetadata(markdown);
  const output = path.resolve(
    root,
    options.output ||
      path.join(
        "public",
        "images",
        "social",
        `${path.basename(source, ".md")}.svg`,
      ),
  );
  const focalImage = options.logo
    ? localImageDataUri(path.resolve(root, options.logo))
    : "";

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, renderCard(metadata, options, focalImage), "utf8");
  console.log(`Generated ${path.relative(root, output)}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
