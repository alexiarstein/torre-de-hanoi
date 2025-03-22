const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3003;

// Middleware
app.use(express.json());
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
            date TEXT NOT NULL
        )
    `);
}

// Validate score data
function validateScore(score) {
    const { name, time, moves } = score;
    
    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { valid: false, error: 'Invalid name' };
    }
    
    if (typeof time !== 'number' || time < 0) {
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

    return { valid: true };
}

// API endpoints
app.get('/api/scores', (req, res) => {
    try {
        // Sort by moves first (ascending), then by time (ascending)
        const scores = db.prepare('SELECT * FROM scores ORDER BY moves ASC, time ASC LIMIT 10').all();
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/scores', (req, res) => {
    const score = req.body;
    
    // Validate the score
    const validation = validateScore(score);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }
    
    try {
        const insert = db.prepare('INSERT INTO scores (name, time, moves, date) VALUES (?, ?, ?, ?)');
        const result = insert.run(score.name, score.time, score.moves, score.date);
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New endpoint to delete all scores
app.delete('/api/scores', (req, res) => {
    try {
        db.prepare('DELETE FROM scores').run();
        res.json({ message: 'All scores deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
