import { GoogleGenAI, Type as SchemaType } from "@google/genai";

export interface GenerationParams {
  websiteId: string;
  apiKey: string;
  keyword: string;
  siteUrl: string;
  siteUser: string;
  sitePass: string;
}

const getArticles = () => JSON.parse(localStorage.getItem('articles') || '[]');
const saveArticles = (articles: any[]) => localStorage.setItem('articles', JSON.stringify(articles));

export async function generateAndPublish(params: GenerationParams) {
  const { websiteId, apiKey, keyword, siteUrl, siteUser, sitePass } = params;
  
  const articleId = Math.random().toString(36).substring(7);
    const newArticle = {
      id: articleId,
      keyword,
      title: `Processing: ${keyword}`,
      content: '',
      status: 'draft',
      websiteId,
      createdAt: Date.now(),
    };

  const articles = getArticles();
  articles.push(newArticle);
  saveArticles(articles);

  const updateArticleLocally = (id: string, updates: any) => {
    const current = getArticles();
    const index = current.findIndex((a: any) => a.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates, updatedAt: new Date().toISOString() };
      saveArticles(current);
    }
  };

  try {
    const ai = new GoogleGenAI({ apiKey });

    const generateWithProxy = async (prompt: string, schema: any) => {
      const finalPrompt = prompt.replace("${keyword}", keyword);
      
      if (apiKey === "system-default" || !apiKey) {
        const response = await window.fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, schema, keyword })
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Generation Service Failure: ${errText}`);
        }
        const data = await response.json();
        return data.text;
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema
          }
        });
        return response.text;
      }
    };

    // 1. Generate SEO Data
    const seoDataRaw = await generateWithProxy(
      `Act as an expert gaming SEO writer. Convert the keyword "${keyword}" into a trending, high-CTR SEO title, meta description, and a URL slug.`,
      {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          metaDescription: { type: SchemaType.STRING },
          slug: { type: SchemaType.STRING }
        },
        required: ["title", "metaDescription", "slug"]
      }
    );

    const seoData = JSON.parse(seoDataRaw);
    updateArticleLocally(articleId, {
      title: seoData.title,
      metaDescription: seoData.metaDescription,
      slug: seoData.slug,
    });

    // 2. Generate Content
    const contentDataRaw = await generateWithProxy(
      `Act as an expert gaming industry historian and critic. Write a comprehensive, high-quality, and deeply researched article for the title: "${seoData.title}".
      
      CRITICAL REQUIREMENTS:
      - LENGTH: Minimum 1200 words of deep, high-value content.
      - STRUCTURE: Use clear, SEO-optimized H2 and H3 subheadings.
      - MANDATORY SECTIONS: Intro, History, Deep Dive, GEO, Future, FAQ.
      - OUTPUT: Raw HTML. 
      
      JSON FIELD SPECIFICATIONS:
      1. "contentHtml": article body.
      2. "schemaMarkup": valid JSON-LD code.`,
      {
        type: SchemaType.OBJECT,
        properties: {
          contentHtml: { type: SchemaType.STRING },
          schemaMarkup: { type: SchemaType.STRING }
        },
        required: ["contentHtml", "schemaMarkup"]
      }
    );

    const contentData = JSON.parse(contentDataRaw);
    updateArticleLocally(articleId, {
      content: contentData.contentHtml,
      schemaMarkup: contentData.schemaMarkup,
    });

    // 3. Publish to WordPress
    const proxyResponse = await window.fetch("/api/publish-wp", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteUrl,
        siteUser,
        sitePass,
        article: {
          title: seoData.title,
          content: contentData.contentHtml,
          metaDescription: seoData.metaDescription,
          slug: seoData.slug
        }
      })
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json();
      throw new Error(errorData.error || "Failed to publish via proxy");
    }

    const wpPost = await proxyResponse.json();
    updateArticleLocally(articleId, {
      status: 'published',
      wpPostId: wpPost.id.toString(),
      wpUrl: wpPost.link,
    });

    return { success: true, articleId };

  } catch (error: any) {
    console.error("Critical Failure:", error);
    updateArticleLocally(articleId, {
      status: 'error',
      error: error.message || "Unknown error",
    });
    throw error;
  }
}

export async function deleteArticle(articleId: string) {
  const current = getArticles();
  const updated = current.filter((a: any) => a.id !== articleId);
  saveArticles(updated);
}

export async function bulkDeleteArticles(articleIds: string[]) {
  const current = getArticles();
  const updated = current.filter((a: any) => !articleIds.includes(a.id));
  saveArticles(updated);
}
