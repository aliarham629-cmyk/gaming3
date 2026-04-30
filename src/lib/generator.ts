import { GoogleGenAI, Type as SchemaType } from "@google/genai";
import { db, auth } from "./firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, deleteDoc, writeBatch } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface GenerationParams {
  userId: string;
  websiteId: string;
  batchId: string;
  apiKey: string;
  keyword: string;
  siteUrl: string;
  siteUser: string;
  sitePass: string;
}

export async function generateAndPublish(params: GenerationParams) {
  const { userId, websiteId, batchId, apiKey, keyword, siteUrl, siteUser, sitePass } = params;
  
  const articlePath = `users/${userId}/articles`;
  let articleRef;
  
  try {
    articleRef = await addDoc(collection(db, articlePath), {
      keyword,
      title: `Processing: ${keyword}`,
      content: '',
      status: 'draft',
      websiteId,
      batchId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, articlePath);
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const generateWithProxy = async (prompt: string, schema: any) => {
      // Always replace keyword in prompt if placeholder exists
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

    await updateDoc(articleRef, {
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

    await updateDoc(articleRef, {
      content: contentData.contentHtml,
      schemaMarkup: contentData.schemaMarkup,
      status: 'draft' // Mark as draft once content is ready
    });

    // 3. Publish to WordPress
    await publishToWordPress(userId, articleRef.id, {
      siteUrl,
      siteUser,
      sitePass
    });

    return { success: true, articleId: articleRef.id };

  } catch (error: any) {
    console.error("Critical Failure:", error);
    if (articleRef) {
      try {
        await updateDoc(articleRef, {
          status: 'error',
          error: error.message || "Unknown error",
        });
      } catch (e) {
        console.error("Could not update error state in Firestore:", e);
      }
    }
    throw error;
  }
}

export async function publishToWordPress(
  userId: string, 
  articleId: string, 
  site: { siteUrl: string; siteUser: string; sitePass: string }
) {
  const articleRef = doc(db, 'users', userId, 'articles', articleId);
  const { siteUrl, siteUser, sitePass } = site;
  
  try {
    const articleDoc = await getDoc(articleRef);
    if (!articleDoc.exists()) throw new Error("Article document not found in system.");
    const article = articleDoc.data();

    // Use Server Proxy to bypass CORS
    const proxyResponse = await window.fetch("/api/publish-wp", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteUrl,
        siteUser,
        sitePass,
        article: {
          title: article.title,
          content: article.content,
          metaDescription: article.metaDescription,
          slug: article.slug
        }
      })
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json();
      throw new Error(errorData.error || "Failed to publish via proxy");
    }

    const wpPost = await proxyResponse.json();

    await updateDoc(articleRef, {
      status: 'published',
      wpPostId: wpPost.id.toString(),
      wpUrl: wpPost.link,
      updatedAt: serverTimestamp(),
    });

    return wpPost;
  } catch (error: any) {
    console.error("Publishing Failure:", error);
    await updateDoc(articleRef, {
      status: 'error',
      error: `Publishing Error: ${error.message || "Unknown failure"}`,
      updatedAt: serverTimestamp(),
    });
    throw error;
  }
}

export async function deleteArticle(userId: string, articleId: string) {
  const articleRef = doc(db, 'users', userId, 'articles', articleId);
  try {
    await deleteDoc(articleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, articleRef.path);
  }
}

export async function bulkDeleteArticles(userId: string, articleIds: string[]) {
  const batch = writeBatch(db);
  const paths: string[] = [];
  
  articleIds.forEach(id => {
    const articleRef = doc(db, 'users', userId, 'articles', id);
    batch.delete(articleRef);
    paths.push(articleRef.path);
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, paths.join(', '));
  }
}
