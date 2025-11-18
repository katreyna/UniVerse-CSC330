const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = 80;

// CORS configuration for credentials
app.use(cors({
  origin: true,
  credentials: true
}));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public_html")));

// session middleware (for user authentication)
app.use(session({
  secret: 'universe-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// database connection pool
const connection_pool = mysql.createPool({
  host: '34.26.44.205',
  user: 'node',
  password: 'Node123!',
  database: 'UniVerse',
  waitForConnections: true,
  connectionLimit: 10
});

// convert pool to use promises
const promisePool = connection_pool.promise();

// user authentication routes


//load profile
app.get("/api/profile", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const [rows] = await promisePool.query(
      "SELECT username, email, bio, profile_pic FROM users WHERE id = ?",
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// register endpoint
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Empty fields" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    await promisePool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );
    
    res.json({ success: true, message: "User registration complete!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

// login endpoint
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
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ success: true, message: "Welcome back!", user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ success: false, message: "Wrong Password!" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// logout endpoint
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: "Logged out successfully" });
});

// check if user is logged in
app.get("/api/session", (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.json({ loggedIn: false });
  }
});

// ==================== EVENTS API ROUTES ====================

// get all events
app.get("/api/events", async (req, res) => {
  // Mock data for demo/testing
  const mockEvents = [
    {
      id: 1,
      title: "Intramural Soccer Finals",
      event_time: "2025-11-20T19:00:00",
      location: "Moore Field",
      description: "Come cheer on the teams! Free admission for students.",
      rsvp_count: 0
    },
    {
      id: 2,
      title: "Career Fair",
      event_time: "2025-11-25T10:00:00",
      location: "Student Center",
      description: "Tech, finance, and healthcare companies recruiting.",
      rsvp_count: 0
    },
    {
      id: 3,
      title: "Fall Concert",
      event_time: "2025-11-28T20:00:00",
      location: "University Auditorium",
      description: "Featuring local bands and student performers!",
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
       ORDER BY e.event_time ASC`,
      { timeout: 3000 }
    );
    
    // Use mock data if database is empty
    if (events.length === 0) {
      console.log("⚠️ Database empty, using mock data for demo");
      return res.json(mockEvents);
    }
    
    console.log("✅ Database events loaded:", events.length);
    res.json(events);
  } catch (error) {
    console.log("⚠️ Database unavailable, using mock data for demo");
    res.json(mockEvents);
  }
});

// get single event with RSVP status
app.get("/api/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;
    
    const [events] = await promisePool.query(
      `SELECT e.eventID as id, e.title, e.event_time, e.location, e.description,
        COUNT(r.id) as rsvp_count,
        ${userId ? `MAX(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) as user_rsvped` : '0 as user_rsvped'}
       FROM events e
       LEFT JOIN rsvps r ON e.eventID = r.event_id
       WHERE e.eventID = ?
       GROUP BY e.eventID, e.title, e.event_time, e.location, e.description`,
      userId ? [userId, eventId] : [eventId]
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

// RSVP to an event
app.post("/api/events/:id/rsvp", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;
    
    // check if user is logged in
    if (!userId) {
      return res.status(401).json({ success: false, message: "You must be logged in to RSVP" });
    }
    
    // check if event exists
    const [events] = await promisePool.query("SELECT eventID FROM events WHERE eventID = ?", [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    
    // check if user already RSVP'd
    const [existing] = await promisePool.query(
      "SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?",
      [eventId, userId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You already RSVP'd to this event" });
    }
    
    // Create RSVP
    await promisePool.query(
      "INSERT INTO rsvps (event_id, user_id, rsvp_date) VALUES (?, ?, NOW())",
      [eventId, userId]
    );
    
    // get updated RSVP count
    const [count] = await promisePool.query(
      "SELECT COUNT(*) as count FROM rsvps WHERE event_id = ?",
      [eventId]
    );
    
    res.json({ 
      success: true, 
      message: "RSVP successful!", 
      rsvp_count: count[0].count 
    });
  } catch (error) {
    console.error("RSVP error:", error);
    res.status(500).json({ success: false, message: "RSVP failed" });
  }
});

// cancel RSVP
app.delete("/api/events/:id/rsvp", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: "You must be logged in" });
    }
    
    const [result] = await promisePool.query(
      "DELETE FROM rsvps WHERE event_id = ? AND user_id = ?",
      [eventId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: "No RSVP found to cancel" });
    }
    
    // Get updated RSVP count
    const [count] = await promisePool.query(
      "SELECT COUNT(*) as count FROM rsvps WHERE event_id = ?",
      [eventId]
    );
    
    res.json({ 
      success: true, 
      message: "RSVP cancelled", 
      rsvp_count: count[0].count 
    });
  } catch (error) {
    console.error("Cancel RSVP error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel RSVP" });
  }
});

// gets RSVP list for an event
app.get("/api/events/:id/rsvps", async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [rsvps] = await promisePool.query(
      `SELECT u.id, u.username, r.rsvp_date
       FROM rsvps r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ?
       ORDER BY r.rsvp_date DESC`,
      [eventId]
    );
    
    res.json(rsvps);
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

// static file routes

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "sign-up.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "login.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "feed.html"));
});

app.get("/events", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "events.html"));
});

// get profile

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public_html", "profile.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// start server
app.listen(PORT, () => {
  console.log(`UniVerse server running at http://localhost:${PORT}`);
});