import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const source = "dist/pagefind";
const destination = "public/pagefind";

if (!existsSync(source)) {
  throw new Error(`Pagefind output not found: ${source}`);
}

mkdirSync(dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
