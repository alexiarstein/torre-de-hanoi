const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
app.disable('x-powered-by'); // Disable X-Powered-By header
const port = 3000;

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all routes
app.use(limiter);

// CORS configuration - only allow same origin
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '1kb' })); // Limit payload size
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new Database('scores.db');
console.log('Connected to SQLite database');
createTable();

// Create scores table if it doesn't exist
function createTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            time INTEGER NOT NULL,
            moves INTEGER NOT NULL,
            date TEXT NOT NULL,
            ip_address TEXT NOT NULL
        )
    `);
}

// Validate score data
function validateScore(score, ip) {
    const { name, time, moves, date } = score;
    
    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { valid: false, error: 'Invalid name' };
    }
    
    if (name.length > 50) {
        return { valid: false, error: 'Name too long' };
    }
    
    if (typeof time !== 'number' || time < 0 || time > 3600) { // Max 1 hour
        return { valid: false, error: 'Invalid time' };
    }
    
    if (typeof moves !== 'number' || moves < 0) {
        return { valid: false, error: 'Invalid moves' };
    }

    // Calculate minimum possible moves for 6 disks
    const minMoves = Math.pow(2, 6) - 1; // 63 moves for 6 disks
    
    if (moves < minMoves) {
        return { valid: false, error: 'Invalid number of moves' };
    }

    // Validate date
    const scoreDate = new Date(date);
    if (isNaN(scoreDate.getTime()) || scoreDate > new Date()) {
        return { valid: false, error: 'Invalid date' };
    }

    // Check for duplicate submissions from same IP
    const recentScores = db.prepare('SELECT COUNT(*) as count FROM scores WHERE ip_address = ? AND date > datetime("now", "-1 hour")').get(ip);
    if (recentScores.count >= 5) { // Max 5 scores per hour per IP
        return { valid: false, error: 'Too many submissions from this IP' };
    }

    return { valid: true };
}

// API endpoints
app.get('/api/scores', (req, res) => {
    try {
        // Only return top 10 scores, sorted by moves first, then time
        const scores = db.prepare('SELECT id, name, time, moves, date FROM scores ORDER BY moves ASC, time ASC LIMIT 10').all();
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/scores', (req, res) => {
    const score = req.body;
    const ip = req.ip;
    
    // Validate the score
    const validation = validateScore(score, ip);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }
    
    try {
        // Check if we already have too many scores
        const count = db.prepare('SELECT COUNT(*) as count FROM scores').get();
        if (count.count >= 100) { // Limit to 100 scores
            // Delete the worst score if we're at the limit
            db.prepare('DELETE FROM scores WHERE id = (SELECT id FROM scores ORDER BY moves DESC, time DESC LIMIT 1)').run();
        }

        const insert = db.prepare('INSERT INTO scores (name, time, moves, date, ip_address) VALUES (?, ?, ?, ?, ?)');
        const result = insert.run(score.name, score.time, score.moves, score.date, ip);
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
