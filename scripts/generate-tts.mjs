import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
};

const inputPath = getArg("--input");
const outputPath = getArg("--output");
const voice = getArg("--voice", "alloy");
const model = getArg("--model", "gpt-4o-mini-tts");
const maxChars = Number(getArg("--max-chars", "3500"));

if (!inputPath || !outputPath) {
  console.error(
    "Usage: node scripts/generate-tts.mjs --input <md> --output <mp3> [--voice alloy] [--model gpt-4o-mini-tts]"
  );
  process.exit(1);
}

loadDotEnv();
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY in environment.");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const text = normalizeText(raw);
const chunks = chunkText(text, maxChars);

if (!chunks.length) {
  console.error("No text found after normalization.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, Buffer.alloc(0));

console.log(`Generating ${chunks.length} chunk(s) with voice="${voice}".`);

for (let i = 0; i < chunks.length; i += 1) {
  const chunk = chunks[i];
  console.log(`Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
  const audioBuffer = await synthesize(chunk, { apiKey, model, voice });
  fs.appendFileSync(outputPath, audioBuffer);
}

console.log(`Saved: ${outputPath}`);

function normalizeText(source) {
  // Remove BOM if present
  let text = source.replace(/^\uFEFF/, "");

  // Extract frontmatter to get title and description
  const frontmatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  let intro = "";

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
    const descMatch = frontmatter.match(/description:\s*["'](.+?)["']/);

    if (titleMatch) intro += titleMatch[1] + ". ";
    if (descMatch) intro += descMatch[1] + ". ";

    // Remove frontmatter from body
    text = text.replace(/^---[\s\S]*?---\s*\n/, "");
  }

  // Clean markdown formatting
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\[(.*?)\]\([^)]+\)/g, "$1");
  text = text.replace(/`{1,3}([^`]+)`{1,3}/g, "$1");
  text = text.replace(/[*_#>]/g, " ");
  text = text.replace(/\s+/g, " ");

  return (intro + text).trim();
}

function loadDotEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    if (!key || process.env[key]) continue;
    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

function chunkText(text, limit) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start + 200) {
        end = lastSpace;
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }
  return chunks;
}

async function synthesize(input, { apiKey, model, voice }) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, voice, input }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
