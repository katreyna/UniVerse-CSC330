const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcrypt"); // encryption



const PORT = 80; 
const directory  = path.join(__dirname, "public_html");

const connection_pool = mysql.createPool({
  host     : '34.26.44.205',
  user     : 'node',
  password : 'Node1234!',
  database : 'UniVerse',
});



const server = http.createServer((req, res) => {
  console.log(req.url);

//  handling api routes

if (req.method === "POST" && req.url === "/register") { //not /signup, /register for backend only
	let body = "";
	req.on("data", (chunk) => (body += chunk));	
	req.on("end", async () => {
		try {
			const data = JSON.parse(body);
			const { username, email, password } = data;
			if (!username || !email || !password) {
				res.writeHead(400);
				return res.end("Empty fields");
			}
		const hashed = await bcrypt.hash(password, 10); // encrypt password
		connection_pool.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
		[username, email, hashed],
		(err, result) => {
			if (err) {
				console.error(err);
				res.writeHead(500);
				res.end();

			} else {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true,  message: "User registration complete!" }));
			}
		}
		);
		} catch (error) {
			console.error(error);
			res.writeHead(400);
			res.end();
		}
	});
	return;	
}

// login method

if (req.method === "POST" && req.url === "/login") {
	let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
		const { email, password } = JSON.parse(body);
	connection_pool.query(
		"SELECT * FROM users WHERE email = ?",
		[email],
		async (err, results) => {
			if (err || results.length === 0) {
				res.writeHead(400);
				return res.end(JSON.stringify({ success: false, message: "Invalid email or password" }));
			}
			const user = results[0];
			const match = await bcrypt.compare(password, user.password);
			if (match) {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true,  message: "Welcome back!" }));
			} else {
				res.writeHead(401);
				res.end(JSON.stringify({ success: false, message: "Wrong Password!" }));
			}
		}
	);
	});
	return;
}


// handling static files
  let urlPath = req.url === "/" ? "/index" : req.url; // default to index
  if (urlPath.endsWith("/")) urlPath = urlPath.slice(0, -1); // remove trailing /

  // requested URL to a file
  const fileMap = {
    "/": "index.html",
    "/index": "index.html",
    "/signup": "sign-up.html",
    "/login": "login.html",
    "/home" : "feed.html",
    "/events" : "events.html"
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
