const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 80; //
const directory  = path.join(__dirname, "public_html");

const server = http.createServer((req, res) => {
  console.log(req.url);

  let urlPath = req.url === "/" ? "/index" : req.url; // default to index
  if (urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1); // remove trailing /

  // requested URL to a file
  const fileMap = {
    "/": "index.html",
    "/index": "index.html",
    "/signup": "sign-up.html",
    "/home": "home.html"
  };

  let fileName = fileMap[urlPath] || urlPath.substring(1); // remove leading / if not mapped
  const filePath = path.join(directory, fileName);

  const extname = path.extname(filePath).toLowerCase();
  const fileTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
  };
  const contentType = fileTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(` running at http://localhost:${PORT}`);
});
