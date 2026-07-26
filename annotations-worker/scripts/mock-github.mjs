import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8790);
const files = new Map();
let revision = 0;

const json = (response, status, value) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
};

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/__state" && request.method === "GET") {
    return json(
      response,
      200,
      Object.fromEntries(
        [...files.entries()].map(([path, file]) => [
          path,
          { ...file, decoded: Buffer.from(file.content, "base64").toString("utf8") },
        ])
      )
    );
  }

  const match = url.pathname.match(
    /^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/
  );
  if (!match) return json(response, 404, { message: "Not found" });
  const path = decodeURIComponent(match[1]);

  if (request.method === "GET") {
    const file = files.get(path);
    return file
      ? json(response, 200, file)
      : json(response, 404, { message: "Not found" });
  }

  if (request.method !== "PUT") {
    return json(response, 405, { message: "Method not allowed" });
  }

  let body = "";
  request.setEncoding("utf8");
  request.on("data", chunk => (body += chunk));
  request.on("end", () => {
    const input = JSON.parse(body);
    const existing = files.get(path);
    if (existing && input.sha !== existing.sha) {
      return json(response, 409, { message: "SHA conflict" });
    }

    revision += 1;
    const file = {
      sha: `local-${revision}`,
      content: input.content,
    };
    files.set(path, file);
    return json(response, 200, {
      content: { path, sha: file.sha },
      commit: { sha: `commit-${revision}` },
    });
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Mock GitHub Contents API ready on http://127.0.0.1:${port}`);
});
