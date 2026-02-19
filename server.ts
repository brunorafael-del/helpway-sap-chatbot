import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

function getDb() {
  if (!db) {
    try {
      db = new Database("knowledge_base.db");
      // Initialize database
      db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error("Database initialization failed:", error);
      // Fallback or rethrow
      throw error;
    }
  }
  return db;
}

export const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/knowledge", (req, res) => {
  try {
    const database = getDb();
    const rows = database.prepare("SELECT * FROM knowledge ORDER BY created_at DESC").all();
    res.json(rows);
  } catch (error) {
    console.error("Fetch knowledge error:", error);
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
    const database = getDb();
    const info = database.prepare("INSERT INTO knowledge (question, answer) VALUES (?, ?)").run(question, answer);
    res.json({ id: info.lastInsertRowid, question, answer });
  } catch (error) {
    console.error("Save knowledge error:", error);
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
    const database = getDb();
    database.prepare("DELETE FROM knowledge WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge error:", error);
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

  try {
    const database = getDb();
    const insert = database.prepare("INSERT INTO knowledge (question, answer) VALUES (?, ?)");
    
    const insertMany = database.transaction((items) => {
      for (const item of items) {
        if (item.question && item.answer) {
          insert.run(item.question, item.answer);
        }
      }
    });

    insertMany(data);
    res.json({ success: true, count: data.length });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to bulk import knowledge" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, history, knowledge } = req.body;

  if (!process.env.TESS_API_KEY) {
    return res.status(500).json({ error: "TESS_API_KEY not configured" });
  }

  const knowledgeContext = knowledge.map((item: any, index: number) => 
    `Índice #${index + 1}\nPergunta: ${item.question}\nResposta: ${item.answer}`
  ).join("\n\n");

  const systemInstruction = `Você é um assistente especializado em suporte SAP para a empresa HelpWay.
Sua única fonte de informação é a base de conhecimento fornecida abaixo.

## BASE DE CONHECIMENTO
${knowledgeContext}

## REGRAS DE OURO
- Responda APENAS com base nas informações acima.
- Se a dúvida não estiver na base, diga que não está documentada.
- As respostas devem ser extraídas literalmente da base de conhecimento, sem acréscimos.

## EXPECTATION (Expectativa)
- O índice deve SEMPRE ser exibido no início da resposta no formato "N - " (ex: 1 - ...).
- Quando solicitado para listar os erros, você DEVE listar um por linha, usando OBRIGATORIAMENTE DUAS quebras de linha (\\n\\n) entre cada item para garantir que fiquem em uma coluna vertical.
- Para consultas de usuários, retorne o índice seguido pelo conteúdo de "Resposta".
- IMPORTANTE: Você DEVE sempre incluir o número do índice no início de cada resposta no formato 'N - '. Quando listar vários itens, use OBRIGATORIAMENTE DUAS quebras de linha (\\n\\n) entre cada item, garantindo que fiquem em uma única coluna vertical e nunca na mesma linha.`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text
    })),
    { role: "user", content: message }
  ];

  try {
    // Using the ID might be more stable than the slug for some API versions
    // Also ensuring the URL matches the user's successful test base
    const response = await fetch("https://api.tess.im/api/agents/37609/execute", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TESS_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        messages,
        model: "auto",
        stream: false
      })
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Tess API non-JSON response:", text);
      throw new Error(`A API TESS retornou um erro inesperado (HTML). Verifique se a URL e a API Key estão corretas.`);
    }

    const data = await response.json();
    
    // Tess API response structure usually has the result in a 'content' or 'output' field
    // Based on common Tess responses, it might be data.output or data.choices[0].message.content
    // Let's assume it follows a similar structure to OpenAI if it says "same as OpenAI API"
    const aiText = data.output || data.content || (data.choices && data.choices[0]?.message?.content);

    if (!aiText) {
      console.error("Tess API Error Response:", data);
      throw new Error("Resposta inválida da API TESS");
    }

    res.json({ text: aiText });
  } catch (error: any) {
    console.error("Tess Chat Error:", error);
    res.status(500).json({ error: error.message || "Erro ao consultar a API TESS" });
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
