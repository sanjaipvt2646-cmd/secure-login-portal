
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET || "";

// MySQL connection
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "login_user",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "login_portal",
    waitForConnections: true,
    connectionLimit: 10
});

if (SECRET.length < 32) {
    console.error("Set JWT_SECRET (32+ characters) in .env");
    process.exit(1);
}

// Trust one reverse proxy (AWS Application Load Balancer)
app.set("trust proxy", 1);

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "upgrade-insecure-requests": null
        }
    }
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// LIVE HTTP ACCESS LOGGING
app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        console.log(
            `${req.ip} - [${new Date().toISOString()}] ` +
            `"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ` +
            `${res.statusCode} ${res.get("content-length") || 0} ` +
            `${Date.now() - start}ms "${req.get("user-agent") || "-"}"`
        );
    });

    next();
});

app.use(express.static(path.join(__dirname, "public")));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30
});

// Authentication middleware
function auth(req, res, next) {
    try {
        req.user = jwt.verify(req.cookies.token || "", SECRET);
        next();
    } catch {
        return res.status(401).json({ message: "Please log in." });
    }
}

// Admin middleware
function admin(req, res, next) {
    if (
        !process.env.ADMIN_KEY ||
        req.get("x-admin-key") !== process.env.ADMIN_KEY
    ) {
        return res.status(401).json({ message: "Invalid admin key." });
    }

    next();
}

// Health check
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({
            status: "ok",
            database: "connected"
        });
    } catch {
        res.status(503).json({
            status: "error",
            database: "unavailable"
        });
    }
});

// User registration
app.post("/api/register", limiter, async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (
            name.length < 2 ||
            name.length > 80 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            password.length < 8 ||
            password.length > 72
        ) {
            return res.status(400).json({
                message: "Enter a valid name, email and password (8–72 characters)."
            });
        }

        const hash = await bcrypt.hash(password, 12);

        await db.execute(
            "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",
            [name, email, hash]
        );

        res.status(201).json({
            message: "Account created. You can now sign in."
        });

    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        console.error(e);

        res.status(500).json({
            message: "Registration failed. Check database connection."
        });
    }
});

// User login
app.post("/api/login", limiter, async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        const [rows] = await db.execute(
            "SELECT id,name,email,password_hash FROM users WHERE email=? LIMIT 1",
            [email]
        );

        if (
            !rows.length ||
            !await bcrypt.compare(password, rows[0].password_hash)
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const u = rows[0];

        const token = jwt.sign(
            { id: u.id, email: u.email },
            SECRET,
            { expiresIn: "2h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.COOKIE_SECURE === "true",
            maxAge: 7200000
        });

        res.json({
            message: "Login successful.",
            user: {
                name: u.name,
                email: u.email
            }
        });

    } catch (e) {
        console.error(e);

        res.status(500).json({
            message: "Login failed. Check database connection."
        });
    }
});

// Current user
app.get("/api/me", auth, async (req, res) => {
    const [r] = await db.execute(
        "SELECT id,name,email,created_at FROM users WHERE id=?",
        [req.user.id]
    );

    if (!r.length) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    res.json({ user: r[0] });
});

// Logout
app.post("/api/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax"
    });

    res.json({ message: "Logged out" });
});

// Admin users
app.get("/api/admin/users", admin, async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT id,name,email,created_at FROM users ORDER BY created_at DESC"
        );

        res.json({ users });

    } catch (e) {
        console.error(e);

        res.status(500).json({
            message: "Could not fetch users"
        });
    }
});

// Frontend fallback
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
