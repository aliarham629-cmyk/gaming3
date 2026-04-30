import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy init Gemini
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Check if system key is available
  app.get("/api/config", (req, res) => {
    res.json({ 
      hasSystemKey: !!process.env.GEMINI_API_KEY,
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Proxy Gemini Generation
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, schema, keyword } = req.body;
      const client = getAI();
      
      console.log(`[Gemini Proxy] Generating content for keyword: ${keyword}`);

      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[Gemini Proxy Error] Full details:", {
        message: error.message,
        payload: { prompt: req.body?.prompt?.substring(0, 100) + '...', schema: req.body?.schema },
        error
      });
      res.status(500).json({ error: error.message || "Generation failed" });
    }
  });

  // WordPress Publication Proxy (Bypass CORS)
  app.post("/api/publish-wp", async (req, res) => {
    try {
      const { siteUrl, siteUser, sitePass, article } = req.body;
      
      if (!siteUrl || !siteUser || !sitePass) {
        return res.status(400).json({ error: "Missing WordPress credentials or URL" });
      }

      // Clean URL: ensure protocol and no trailing slash
      let cleanUrl = siteUrl.trim();
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      cleanUrl = cleanUrl.replace(/\/+$/, '');

      console.log(`[WP Proxy] Publishing to: ${cleanUrl}/wp-json/wp/v2/posts`);

      const authHeader = Buffer.from(`${siteUser}:${sitePass}`).toString('base64');
      const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authHeader}`,
          'User-Agent': 'PublisherCore/1.0 (AI Content Publisher)'
        },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          status: 'draft',
          excerpt: article.metaDescription,
          slug: article.slug,
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("[WP Proxy Error Response]:", {
          status: response.status,
          statusText: response.statusText,
          data
        });
        const errorMessage = (data && data.message) || data?.code || response.statusText || "WordPress API error";
        return res.status(response.status).json({ error: errorMessage });
      }

      res.json(data);
    } catch (error: any) {
      console.error("[WP Proxy Error]:", error);
      res.status(500).json({ error: error.message || "Internal publishing error" });
    }
  });

  app.post("/api/wp/test", async (req, res) => {
    try {
      const { siteUrl, siteUser, sitePass } = req.body;
      
      let cleanUrl = siteUrl.trim();
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      cleanUrl = cleanUrl.replace(/\/+$/, '');

      console.log(`[WP Test] Testing connection to: ${cleanUrl}/wp-json/wp/v2/users/me`);

      const authHeader = Buffer.from(`${siteUser}:${sitePass}`).toString('base64');
      const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        return res.status(response.status).json({ error: data.message || "WordPress authentication failed." });
      }

      res.json({ status: "success", message: "WordPress connection verified." });
    } catch (error: any) {
      console.error("[WP Test Error]:", error);
      res.status(500).json({ error: error.message || "Failed to reach WordPress site" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
