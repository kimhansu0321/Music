const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const dbPath = process.env.VERCEL ? '/tmp/database.sqlite' : path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if not exists
        db.run(`CREATE TABLE IF NOT EXISTS music_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            genre TEXT,
            youtube_id TEXT,
            reason TEXT,
            likes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating table music_recommendations', err.message);
            }
        });
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            music_id INTEGER,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(music_id) REFERENCES music_recommendations(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                console.error('Error creating table comments', err.message);
            }
        });
    }
});

// API Endpoints

// Get all music recommendations
app.get('/api/music', (req, res) => {
    const sql = `SELECT * FROM music_recommendations ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Add a new music recommendation
app.post('/api/music', (req, res) => {
    const { title, artist, genre, youtube_id, reason } = req.body;
    if (!title || !artist) {
        return res.status(400).json({ error: "Title and Artist are required" });
    }
    
    // Extract YouTube video ID if full URL is provided
    let videoId = youtube_id;
    if (youtube_id && youtube_id.includes('v=')) {
        videoId = youtube_id.split('v=')[1].substring(0, 11);
    } else if (youtube_id && youtube_id.includes('youtu.be/')) {
        videoId = youtube_id.split('youtu.be/')[1].substring(0, 11);
    }
    
    const sql = `INSERT INTO music_recommendations (title, artist, genre, youtube_id, reason, likes) VALUES (?, ?, ?, ?, ?, 0)`;
    const params = [title, artist, genre, videoId, reason];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: {
                id: this.lastID,
                title, artist, genre, youtube_id: videoId, reason, likes: 0
            }
        });
    });
});

// Like a music recommendation
app.post('/api/music/:id/like', (req, res) => {
    const sql = `UPDATE music_recommendations SET likes = likes + 1 WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "liked" });
    });
});

// Unlike a music recommendation
app.post('/api/music/:id/unlike', (req, res) => {
    const sql = `UPDATE music_recommendations SET likes = likes - 1 WHERE id = ? AND likes > 0`;
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "unliked" });
    });
});

// Get comments for a music recommendation
app.get('/api/music/:id/comments', (req, res) => {
    const sql = `SELECT * FROM comments WHERE music_id = ? ORDER BY created_at ASC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Add a comment to a music recommendation
app.post('/api/music/:id/comments', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    
    const sql = `INSERT INTO comments (music_id, text) VALUES (?, ?)`;
    db.run(sql, [req.params.id, text], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, music_id: req.params.id, text }
        });
    });
});

// Delete a music recommendation
app.delete('/api/music/:id', (req, res) => {
    const sql = `DELETE FROM music_recommendations WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "deleted" });
    });
});

// Start the server unconditionally locally, but export for Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
