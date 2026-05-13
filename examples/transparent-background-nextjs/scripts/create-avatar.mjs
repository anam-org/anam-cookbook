import { readFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.ANAM_API_KEY;
const imagePath = process.argv[2] || "./public/greenscreen-david.jpg";
const displayName = process.argv[3] || "Green Screen David";
const avatarModel =
  process.env.ANAM_AVATAR_MODEL || process.argv[4] || "cara-4-latest";

if (!apiKey) {
  console.error("Set ANAM_API_KEY before running this script.");
  process.exit(1);
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

const absolutePath = path.resolve(imagePath);
const image = await readFile(absolutePath);
const body = new FormData();

body.append("displayName", displayName);
if (avatarModel) {
  body.append("avatarModel", avatarModel);
}
body.append(
  "imageFile",
  new Blob([image], { type: mimeTypeFor(absolutePath) }),
  path.basename(absolutePath),
);

const response = await fetch("https://api.anam.ai/v1/avatars", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  body,
});

const text = await response.text();
let data;

try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

if (!response.ok) {
  console.error("Avatar creation failed:", data);
  process.exit(1);
}

const avatarId = data.id || data.avatarId || data.data?.id;

if (!avatarId) {
  console.log("Avatar created, but no id field was found in the response:");
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.log(`Created avatar "${data.displayName || displayName}"`);
console.log(`ANAM_AVATAR_ID=${avatarId}`);
