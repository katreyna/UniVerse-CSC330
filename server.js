const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 80;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public_html")));

app.use(session({
  secret: 'universe-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const connection_pool = mysql.createPool({
  host: '34.26.44.205',
  user: 'node',
  password: 'Node123!',
  database: 'UniVerse',
  waitForConnections: true,
  connectionLimit: 10
});

const promisePool = connection_pool.promise();

/* ======================================================
                        profile
====================================================== */

// multer storage config for profile pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "public_html", "uploads", "profiles");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `user-${req.session.userId}${ext}`);
    }
});
const upload = multer({ storage });

// get logged-in user's profile
app.get("/api/profile", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    try {
        const [rows] = await promisePool.query(
            `SELECT u.userID, u.username, u.email, u.bio, u.profile_pic,
                (SELECT COUNT(*) FROM follows WHERE followingID = u.userID) AS followers,
                (SELECT COUNT(*) FROM follows WHERE followerID = u.userID) AS following
             FROM users u
             WHERE u.userID = ?`,
            [req.session.userId]
        );

        if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ error: "Failed to load profile" });
    }
});

// update logged-in user's profile
app.post("/api/profile/update", upload.single("profile_pic"), async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    const { username, bio } = req.body;
    let profilePicPath;

    if (req.file) {
        profilePicPath = `/uploads/profiles/${req.file.filename}`;
    }

    try {
        let query = "UPDATE users SET username = ?, bio = ?";
        const params = [username, bio];

        if (profilePicPath) {
            query += ", profile_pic = ?";
            params.push(profilePicPath);
        }

        query += " WHERE userID = ?";
        params.push(req.session.userId);

        await promisePool.query(query, params);

        // Update session username for other parts of the app
        req.session.username = username;

        res.json({ success: true, message: "Profile updated!", profile_pic: profilePicPath });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
});

// get another user's profile by ID (legacy endpoint)
app.get("/api/profile/:id", async (req, res) => {
    const profileId = req.params.id;

    try {
        const [rows] = await promisePool.query(
            `SELECT u.userID, u.username, u.bio, u.profile_pic,
                (SELECT COUNT(*) FROM follows WHERE followingID = u.userID) AS followers,
                (SELECT COUNT(*) FROM follows WHERE followerID = u.userID) AS following
             FROM users u
             WHERE u.userID = ?`,
            [profileId]
        );

        if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// get user profile by ID (with follow status)
app.get("/api/users/:id", async (req, res) => {
    const profileId = req.params.id;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const [rows] = await promisePool.query(
            `SELECT u.userID, u.username, u.bio, u.profile_pic,
                (SELECT COUNT(*) FROM follows WHERE followingID = u.userID) AS followers,
                (SELECT COUNT(*) FROM follows WHERE followerID = u.userID) AS following,
                (SELECT COUNT(*) FROM posts WHERE userID = u.userID) AS posts_count,
                EXISTS(SELECT 1 FROM follows WHERE followerID = ? AND followingID = u.userID) AS is_following
             FROM users u
             WHERE u.userID = ?`,
            [currentUserId, profileId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        rows[0].is_following = Boolean(rows[0].is_following);
        res.json(rows[0]);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// get user profile by username
app.get("/api/users/username/:username", async (req, res) => {
    const username = req.params.username;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const [rows] = await promisePool.query(
            `SELECT u.userID, u.username, u.bio, u.profile_pic,
                (SELECT COUNT(*) FROM follows WHERE followingID = u.userID) AS followers,
                (SELECT COUNT(*) FROM follows WHERE followerID = u.userID) AS following,
                (SELECT COUNT(*) FROM posts WHERE userID = u.userID) AS posts_count,
                EXISTS(SELECT 1 FROM follows WHERE followerID = ? AND followingID = u.userID) AS is_following
             FROM users u
             WHERE u.username = ?`,
            [currentUserId, username]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        rows[0].is_following = Boolean(rows[0].is_following);
        res.json(rows[0]);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// follow a user
app.post("/api/users/:id/follow", async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    if (currentUserId == targetUserId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
    }

    try {
        // Check if user exists
        const [user] = await promisePool.query(
            "SELECT userID FROM users WHERE userID = ?",
            [targetUserId]
        );
        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if already following
        const [existing] = await promisePool.query(
            "SELECT * FROM follows WHERE followerID = ? AND followingID = ?",
            [currentUserId, targetUserId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: "Already following this user" });
        }

        // Insert into follows (fixed column name)
        await promisePool.query(
            "INSERT INTO follows (followerID, followingID) VALUES (?, ?)",
            [currentUserId, targetUserId]
        );

        // Get updated followers count
        const [countRows] = await promisePool.query(
            "SELECT COUNT(*) AS followers FROM follows WHERE followingID = ?",
            [targetUserId]
        );

        res.json({
            success: true,
            message: "Successfully followed user",
            followers: countRows[0].followers
        });
    } catch (err) {
        console.error("Follow error:", err);
        res.status(500).json({ error: "Failed to follow user" });
    }
});

// unfollow a user
app.post("/api/users/:id/unfollow", async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.session.userId;

    if (!currentUserId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const [result] = await promisePool.query(
            "DELETE FROM follows WHERE followerID = ? AND followingID = ?",
            [currentUserId, targetUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Not following this user" });
        }

        // Get updated followers count
        const [countRows] = await promisePool.query(
            "SELECT COUNT(*) AS followers FROM follows WHERE followingID = ?",
            [targetUserId]
        );

        res.json({
            success: true,
            message: "Successfully unfollowed user",
            followers: countRows[0].followers
        });
    } catch (err) {
        console.error("Unfollow error:", err);
        res.status(500).json({ error: "Failed to unfollow user" });
    }
});

// get a user's events
app.get("/api/users/:id/events", async (req, res) => {
    const userId = req.params.id;

    try {
        const [events] = await promisePool.query(
            `SELECT e.eventID as id, e.title, e.event_time as date, 
                    e.location, e.description,
                    COUNT(r.id) as rsvp_count
             FROM events e
             LEFT JOIN rsvps r ON e.eventID = r.event_id
             WHERE e.userID = ?
             GROUP BY e.eventID, e.title, e.event_time, e.location, e.description
             ORDER BY e.event_time ASC`,
            [userId]
        );

        res.json(events);
    } catch (err) {
        console.error("Failed to fetch user events:", err);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

/* ======================================================
                        register
====================================================== */
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Empty fields" });
    }

    // Check if username/email already exists
    const [existing] = await promisePool.query(
      "SELECT userID FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Username or email already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    const [result] = await promisePool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );

    const userId = result.insertId;

    // Automatically log in the user by creating session
    req.session.userId = userId;
    req.session.username = username;

    res.json({
      success: true,
      message: "User registration complete and logged in!",
      user: { id: userId, username }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

/* ======================================================
                        login
====================================================== */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [results] = await promisePool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }
    
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (match) {
      req.session.userId = user.userID;   // FIXED
      req.session.username = user.username;

      res.json({
        success: true,
        message: "Welcome back!",
        user: { id: user.userID, username: user.username } // FIXED
      });
    } else {
      res.status(401).json({ success: false, message: "Wrong Password!" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

/* ======================================================
                        logout
====================================================== */
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

/* ======================================================
                    check session
====================================================== */
app.get("/api/session", async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });

  try {
    const [rows] = await promisePool.query(
      "SELECT userID, username, profile_pic FROM users WHERE userID = ?",
      [req.session.userId]
    );

    if (rows.length === 0) return res.json({ loggedIn: false });

    const user = rows[0];
    res.json({
      loggedIn: true,
      user: {
        id: user.userID,
        username: user.username,
        profile_pic: user.profile_pic || '/uploads/profiles/default.png'
      }
    });
  } catch (err) {
    console.error("Session error:", err);
    res.status(500).json({ loggedIn: false });
  }
});

/* ======================================================
                        posts
====================================================== */

// Get all posts
app.get("/api/posts", async (req, res) => {
  try {
    const [posts] = await promisePool.query(`
        SELECT p.postID AS id, p.userID AS userId, u.username, u.profile_pic,
        p.content, p.created
        FROM posts p
        JOIN users u ON p.userID = u.userID
        ORDER BY p.created DESC
`);

    res.json(posts);
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// get posts for a specific user
app.get('/api/posts', async (req, res) => {
  try {
    const username = req.query.username; // optional query parameter

    let query = `
      SELECT p.postID AS id, p.userID AS userId, u.username, u.profile_pic,
             p.content, p.created
      FROM posts p
      JOIN users u ON p.userID = u.userID
    `;
    const params = [];

    if (username) {
      query += ' WHERE u.username = ?';
      params.push(username);
    }

    query += ' ORDER BY p.created DESC';

    const [posts] = await promisePool.query(query, params);
    res.json(posts);

  } catch (err) {
    console.error('Failed to fetch posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
app.post("/api/posts", async (req, res) => {
  const userId = req.session.userId;
  const { content } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "You must be logged in to post" });
  }

  if (!content || content.trim() === "") {
    return res.status(400).json({ success: false, message: "Post content cannot be empty" });
  }

  try {
    await promisePool.query(
      "INSERT INTO posts (userID, content, created) VALUES (?, ?, NOW())",
      [userId, content]
    );

    res.json({ success: true, message: "Post created successfully" });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
});

// Check if user liked a post
app.get("/api/posts/:id/liked", async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ liked: false });

  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM likes WHERE postID = ? AND userID = ?",
      [postId, userId]
    );

    res.json({ liked: rows.length > 0 });
  } catch (err) {
    console.error("Check liked error:", err);
    res.status(500).json({ liked: false });
  }
});

// Get like count
app.get("/api/posts/:id/likes", async (req, res) => {
  const postId = req.params.id;

  try {
    const [rows] = await promisePool.query(
      "SELECT COUNT(*) AS count FROM likes WHERE postID = ?",
      [postId]
    );

    res.json({ count: rows[0].count });
  } catch (err) {
    console.error("Get likes error:", err);
    res.status(500).json({ count: 0 });
  }
});
// Like a post
app.post("/api/posts/:id/like", async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  try {
    // Prevent double-like
    const [existing] = await promisePool.query(
      "SELECT * FROM likes WHERE postID = ? AND userID = ?",
      [postId, userId]
    );

    if (existing.length > 0) return res.status(400).json({ error: "Already liked" });

    await promisePool.query(
      "INSERT INTO likes (postID, userID, created) VALUES (?, ?, NOW())",
      [postId, userId]
    );

    const [count] = await promisePool.query(
      "SELECT COUNT(*) AS count FROM likes WHERE postID = ?",
      [postId]
    );

    res.json({ success: true, likeCount: count[0].count });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
});
// Unlike a post
app.post("/api/posts/:id/unlike", async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  try {
    await promisePool.query(
      "DELETE FROM likes WHERE postID = ? AND userID = ?",
      [postId, userId]
    );

    const [count] = await promisePool.query(
      "SELECT COUNT(*) AS count FROM likes WHERE postID = ?",
      [postId]
    );

    res.json({ success: true, likeCount: count[0].count });
  } catch (err) {
    console.error("Unlike error:", err);
    res.status(500).json({ error: "Failed to unlike post" });
  }
});

// Get replies
app.get("/api/posts/:id/replies", async (req, res) => {
  const postId = req.params.id;

  try {
    const [rows] = await promisePool.query(
      `SELECT r.replyID AS id, r.content, r.created,
       u.username, u.profile_pic
       FROM replies r
       JOIN users u ON r.userID = u.userID
       WHERE r.postID = ?
       ORDER BY r.created ASC`,
      [postId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Get replies error:", err);
    res.status(500).json([]);
  }
});

// Post a reply
app.post("/api/posts/:id/reply", async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.userId;
  const { content } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: "Not logged in" });
  if (!content || content.trim() === "") return res.status(400).json({ success: false, message: "Empty reply" });

  try {
    await promisePool.query(
      "INSERT INTO replies (postID, userID, content, created) VALUES (?, ?, ?, NOW())",
      [postId, userId, content]
    );

    res.json({ success: true, message: "Reply posted!" });
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ success: false, message: "Failed to post reply" });
  }
});

/* ======================================================
                        events
====================================================== */

// Get all events
app.get("/api/events", async (req, res) => {
  const mockEvents = [
    {
      id: 1,
      title: "Intramural Soccer Finals",
      event_time: "2025-11-20T19:00:00",
      location: "Moore Field",
      description: "Come cheer on the teams! Free admission for students.",
      rsvp_count: 0
    }
  ];

  try {
    const [events] = await promisePool.query(
      `SELECT e.eventID as id, e.title, e.event_time, e.location, e.description,
        COUNT(r.id) as rsvp_count
       FROM events e
       LEFT JOIN rsvps r ON e.eventID = r.event_id
       GROUP BY e.eventID, e.title, e.event_time, e.location, e.description
       ORDER BY e.event_time ASC`
    );

    if (events.length === 0) return res.json(mockEvents);

    res.json(events);
  } catch (error) {
    res.json(mockEvents);
  }
});

// Get single event
app.get("/api/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;
    
    const [events] = await promisePool.query(
      `SELECT e.eventID as id, e.title, e.event_time, e.location, e.description,
        COUNT(r.id) as rsvp_count,
        ${userId ? `MAX(CASE WHEN r.userID = ? THEN 1 ELSE 0 END)` : '0'} as user_rsvped
       FROM events e
       LEFT JOIN rsvps r ON e.eventID = r.eventID
       WHERE e.eventID = ?
       GROUP BY e.eventID, e.title, e.event_time, e.location, e.description`,
      userID ? [userID, eventID] : [eventID]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    res.json(events[0]);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// RSVP
app.post("/api/events/:id/rsvp", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "You must be logged in to RSVP" });
    }

    const [events] = await promisePool.query("SELECT eventID FROM events WHERE eventID = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const [existing] = await promisePool.query(
      "SELECT id FROM rsvps WHERE event_id = ? AND userID = ?",
      [eventId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You already RSVP'd to this event" });
    }

    await promisePool.query(
      "INSERT INTO rsvps (event_id, userID, rsvp_date) VALUES (?, ?, NOW())",
      [eventId, userId]
    );

    const [count] = await promisePool.query(
      "SELECT COUNT(*) as count FROM rsvps WHERE event_id = ?",
      [eventId]
    );

    res.json({ success: true, message: "RSVP successful!", rsvp_count: count[0].count });
  } catch (error) {
    console.error("RSVP error:", error);
    res.status(500).json({ success: false, message: "RSVP failed" });
  }
});

// Cancel RSVP
app.delete("/api/events/:id/rsvp", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "You must be logged in" });
    }

    const [result] = await promisePool.query(
      "DELETE FROM rsvps WHERE event_id = ? AND userID = ?",
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: "No RSVP found to cancel" });
    }

    const [count] = await promisePool.query(
      "SELECT COUNT(*) as count FROM rsvps WHERE eventID = ?",
      [eventID]
    );

    res.json({ success: true, message: "RSVP cancelled", rsvp_count: count[0].count });
  } catch (error) {
    console.error("Cancel RSVP error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel RSVP" });
  }
});

// Get list of RSVPs
app.get("/api/events/:id/rsvps", async (req, res) => {
  try {
    const eventID = req.params.id;

    const [rsvps] = await promisePool.query(
      `SELECT u.userID AS id, u.username, r.rsvp_date   
       FROM rsvps r
       JOIN users u ON r.userID = u.userID             
       WHERE r.eventID = ?
       ORDER BY r.rsvp_date DESC`,
      [eventId]
    );

    res.json(rsvps);
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

/* ======================================================
                  static file routing
====================================================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "sign-up.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "login.html"));
});

app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "index.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "feed.html"));
});

app.get("/events", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "events.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "profile.html"));
});

app.get("/user/:username", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "other-profiles.html"));
});

// 404
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

app.use('/uploads', express.static(path.join(__dirname, 'public_html', 'uploads')));


/* ======================================================
                    start server!!!!
====================================================== */
app.listen(PORT, () => {
  console.log(`UniVerse server running at http://localhost:${PORT}`);
});
/* ---------- test ---------- */
promisePool.query("SELECT 1")
  .then(() => console.log("✅ Connected to MySQL successfully!"))
  .catch((err) => console.error("❌ MySQL connection failed:", err));

