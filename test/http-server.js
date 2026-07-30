import fs from "node:fs";
import { createServer } from "node:http";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  const file = req.url === "/" ? "test/index.html" : `test${new URL(req.url, "http://localhost").pathname}`;

  try {
    const data = await fs.promises.readFile(file);

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream",
    });

    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8000);

export default () => server.close();
