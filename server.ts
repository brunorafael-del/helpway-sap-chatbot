import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("knowledge_base.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/knowledge", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM knowledge ORDER BY created_at DESC").all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch knowledge" });
  }
});

app.post("/api/knowledge", (req, res) => {
  const { question, answer, password } = req.body;
  
  if (password !== "KarinaHelpWay#2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!question || !answer) {
    return res.status(400).json({ error: "Question and answer are required" });
  }

  try {
    const info = db.prepare("INSERT INTO knowledge (question, answer) VALUES (?, ?)").run(question, answer);
    res.json({ id: info.lastInsertRowid, question, answer });
  } catch (error) {
    res.status(500).json({ error: "Failed to save knowledge" });
  }
});

app.delete("/api/knowledge/:id", (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== "KarinaHelpWay#2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    db.prepare("DELETE FROM knowledge WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete knowledge" });
  }
});

// Bulk import from Excel-like data (JSON array)
app.post("/api/knowledge/bulk", (req, res) => {
  const { data, password } = req.body;

  if (password !== "KarinaHelpWay#2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Data must be an array" });
  }

  const insert = db.prepare("INSERT INTO knowledge (question, answer) VALUES (?, ?)");
  
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (item.question && item.answer) {
        insert.run(item.question, item.answer);
      }
    }
  });

  try {
    insertMany(data);
    res.json({ success: true, count: data.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to bulk import knowledge" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}
