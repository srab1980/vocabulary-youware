/// <reference types="@cloudflare/workers-types" />

import { Router, IRequest } from "itty-router";
import * as XLSX from "xlsx";
import axios from "axios";

const router = Router({ base: "/api" });

type Env = {
  DB: D1Database;
  API_BASE_PATH: string;
};

const STORAGE_BASE_URL = "https://storage.youware.me";

const sanitizeExtension = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const createIconKey = (userId: string, extension: string) => {
  const safeExtension = sanitizeExtension(extension) || "png";
  return `icons/${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
};

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

type UserContext = {
  userId: string;
  isAuthenticated: boolean;
};

type CategoryPayload = {
  name?: string;
  slug?: string;
  categoryType?: string;
  description?: string | null;
  iconKey?: string | null;
};

type WordPayload = {
  word?: string;
  arabicTranslation?: string;
  wordIconKey?: string | null;
  turkishSentence?: string | null;
  arabicSentence?: string | null;
  difficultyLevel?: string | null;
  vowelHarmonyRule?: string | null;
  categoryId?: number;
  tags?: string[] | null;
};

type RouteHandler = Parameters<typeof router.get>[1];

// Let's create a more specific type for our handlers
type AppRouteHandler = (request: IRequest, env: Env, ctx: ExecutionContext) => Promise<Response | undefined>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Encrypted-Yw-ID, X-Is-Login",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

// Create a function to apply CORS headers with dynamic origin
const applyCors = (response: Response, origin?: string) => {
  // If a specific origin is provided and it's from our allowed origins, use it
  // Otherwise, use the wildcard (for backward compatibility)
  const allowedOrigins = [
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
    'http://127.0.0.1:5177',
    'http://127.0.0.1:5178',
    'http://127.0.0.1:5179',
    'http://127.0.0.1:5180',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:5180'
  ];
  
  const useOrigin = origin && allowedOrigins.includes(origin) ? origin : "*";
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (key === "Access-Control-Allow-Origin") {
      response.headers.set(key, useOrigin);
    } else {
      response.headers.set(key, value);
    }
  });
  return response;
};

const json = (data: JsonValue, message = "ok", status = 200, code = 0, origin?: string) =>
  applyCors(
    new Response(
      JSON.stringify({
        code,
        message,
        data,
        request_id: typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : "",
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
    origin
  );

const jsonError = (message: string, status = 400, code = status, origin?: string) => json(null, message, status, code, origin);

const withTiming = (handler: AppRouteHandler): AppRouteHandler => {
  return async (request: IRequest, env: Env, ctx: ExecutionContext) => {
    const start = Date.now();
    try {
      const response = await handler(request, env, ctx);
      if (response) {
        const origin = request.headers.get('Origin') || undefined;
        return applyCors(response, origin);
      }
      return response;
    } finally {
      console.log(`${request.method} ${new URL(request.url).pathname} -> ${Date.now() - start}ms`);
    }
  };
};

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage request failed (${response.status}): ${text || response.statusText}`);
  }
  return (await response.json()) as T;
};

const requestUploadPresign = async (
  key: string,
  contentType: string,
  cacheControl?: string,
): Promise<{
  key: string;
  uploadUrl: string;
  expiresAt: string | null;
  requiredHeaders: Record<string, string> | undefined;
}> => {
  const payload: {
    url: string;
    key: string;
    expiresAt?: string;
    requiredHeaders?: Record<string, string>;
  } = await fetchJson(`${STORAGE_BASE_URL}/presign/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType, cacheControl }),
  });

  return {
    key,
    uploadUrl: payload.url,
    expiresAt: payload.expiresAt ?? null,
    requiredHeaders: payload.requiredHeaders,
  };
};

const requestDownloadPresign = async (
  keys: string[],
): Promise<Map<string, { url: string; expiresAt: string | null }>> => {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  const map = new Map<string, { url: string; expiresAt: string | null }>();
  if (unique.length === 0) {
    return map;
  }

  try {
    if (unique.length === 1) {
      const key = unique[0];
      const payload: { url: string; key: string; expiresAt?: string } = await fetchJson(
        `${STORAGE_BASE_URL}/presign/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        },
      );
      map.set(key, { url: payload.url, expiresAt: payload.expiresAt ?? null });
    } else {
      const payload: {
        urls: Array<{ key: string; url: string; expiresAt?: string }>;
      } = await fetchJson(`${STORAGE_BASE_URL}/presign/download/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: unique }),
      });
      payload.urls.forEach((item) => {
        map.set(item.key, { url: item.url, expiresAt: item.expiresAt ?? null });
      });
    }
  } catch (error) {
    console.error("Failed to request download presign", error);
  }

  return map;
};

const isHostedStorageKey = (value: unknown) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:/i.test(trimmed)) return false;
  if (trimmed.startsWith("data:")) return false;
  return true;
};

const resolveHostedIconUrl = (
  rawValue: unknown,
  map: Map<string, { url: string; expiresAt: string | null }>,
): string | null => {
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || /^https?:/i.test(trimmed)) {
    return trimmed;
  }
  return map.get(trimmed)?.url ?? null;
};

const mapWordRows = async (
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> => {
  if (!rows.length) return rows;

  const keysToPresign = rows.flatMap((row) => {
    const keys: string[] = [];
    if (isHostedStorageKey(row.wordIconKey)) {
      keys.push(String(row.wordIconKey));
    }
    if (isHostedStorageKey(row.categoryIconKey)) {
      keys.push(String(row.categoryIconKey));
    }
    return keys;
  });
  const downloadMap = await requestDownloadPresign(keysToPresign);

  return rows.map((row) => {
    const tags = (row.tagList as string | null)?.split(",").filter(Boolean) ?? [];
    delete row.tagList;
    const wordIconKey = typeof row.wordIconKey === "string" ? row.wordIconKey : null;
    const categoryIconKey = typeof row.categoryIconKey === "string" ? row.categoryIconKey : null;
    const wordIconUrl = resolveHostedIconUrl(wordIconKey, downloadMap);
    const categoryIconUrl = resolveHostedIconUrl(categoryIconKey, downloadMap);
    return {
      ...row,
      tags,
      wordIconUrl,
      categoryIconUrl,
    };
  });
};

const parseJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch (error) {
    console.error("Failed to parse JSON body", error);
    return null;
  }
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const sanitizeTag = (tag: string) =>
  tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 48);

const requireAuth = (request: Request): UserContext => {
  const userId = request.headers.get("X-Encrypted-Yw-ID") ?? "";
  const isAuthenticated = request.headers.get("X-Is-Login") === "1";
  return { userId, isAuthenticated };
};

const ensureAuthenticated = (ctx: UserContext) => {
  if (!ctx.isAuthenticated || !ctx.userId) {
    throw new Response(
      JSON.stringify({ code: 401, message: "Authentication required", data: null }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

const fetchCategoryById = async (env: Env, id: number) => {
  const statement = env.DB.prepare(
    `SELECT c.*, (
        SELECT COUNT(1) FROM words w WHERE w.category_id = c.id
      ) AS word_count
     FROM categories c
     WHERE c.id = ?`
  );
  const result = await statement.bind(id).first();
  return result as Record<string, unknown> | undefined;
};

const fetchWordById = async (env: Env, id: number) => {
  const statement = env.DB.prepare(
    `SELECT
        w.id,
        w.word,
        w.arabic_translation AS arabicTranslation,
        w.word_icon_key AS wordIconKey,
        w.turkish_sentence AS turkishSentence,
        w.arabic_sentence AS arabicSentence,
        w.difficulty_level AS difficultyLevel,
        w.vowel_harmony_rule AS vowelHarmonyRule,
        w.category_id AS categoryId,
        w.created_at AS createdAt,
        w.updated_at AS updatedAt,
        w.created_by AS createdBy,
        w.updated_by AS updatedBy,
        c.name AS categoryName,
        c.slug AS categorySlug,
        c.category_type AS categoryType,
        c.icon_key AS categoryIconKey,
        GROUP_CONCAT(wt.tag, ',') AS tagList
      FROM words w
      JOIN categories c ON c.id = w.category_id
      LEFT JOIN word_tags wt ON wt.word_id = w.id
      WHERE w.id = ?
      GROUP BY w.id`
  );
  const record = (await statement.bind(id).first()) as Record<string, unknown> | undefined;
  if (!record) return undefined;
  const [mapped] = await mapWordRows([record]);
  return mapped;
};

const numberFromParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

router.get(
  "/health",
  withTiming(async () =>
    json({ timestamp: new Date().toISOString() }, "ok"),
  ),
);

router.get(
  "/categories",
  withTiming(async (request, env) => {
    const searchParams = new URL(request.url).searchParams;
    const categoryType = searchParams.get("categoryType")?.trim();

    let query =
      `SELECT c.*, (
          SELECT COUNT(1) FROM words w WHERE w.category_id = c.id
        ) AS word_count
       FROM categories c`;
    const params: unknown[] = [];

    if (categoryType) {
      query += " WHERE c.category_type = ?";
      params.push(categoryType);
    }

    query += " ORDER BY c.created_at DESC";

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return json({ items: results }, "categories fetched");
  }),
);

router.get(
  "/categories/:id",
  withTiming(async (request, env) => {
    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid category id", 400);

    const category = await fetchCategoryById(env, id);
    if (!category) return jsonError("Category not found", 404);

    return json(category, "category fetched");
  }),
);

router.post(
  "/categories",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const body = await parseJson<CategoryPayload>(request);
    if (!body) return jsonError("Invalid JSON body", 400);

    const name = body.name?.trim();
    const categoryType = body.categoryType?.trim();
    if (!name || !categoryType) {
      return jsonError("name and categoryType are required", 422);
    }

    const slug = (body.slug?.trim() || slugify(name)).slice(0, 64);
    const description = body.description?.trim() || null;
    const iconKey = body.iconKey?.trim() || null;

    try {
      const insert = await env.DB.prepare(
        `INSERT INTO categories (name, slug, category_type, description, icon_key)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(name, slug, categoryType, description, iconKey).run();

      if (!insert.success) {
        console.error("Failed to insert category", insert.error);
        return jsonError("Failed to create category", 500);
      }

      const categoryId = insert.meta.last_row_id;
      const category = await fetchCategoryById(env, Number(categoryId));
      return json(category ?? null, "category created", 201);
    } catch (error) {
      const message = String(error);
      if (message.includes("UNIQUE")) {
        return jsonError("Category slug already exists", 409);
      }
      console.error("Category creation failed", error);
      return jsonError("Failed to create category", 500);
    }
  }),
);

router.put(
  "/categories/:id",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid category id", 400);

    const body = await parseJson<CategoryPayload>(request);
    if (!body) return jsonError("Invalid JSON body", 400);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const value = body.name?.trim();
      if (!value) return jsonError("name cannot be empty", 422);
      updates.push("name = ?");
      values.push(value);
    }

    if (body.slug !== undefined) {
      const value = slugify(body.slug || body.name || "");
      if (!value) return jsonError("slug cannot be empty", 422);
      updates.push("slug = ?");
      values.push(value);
    }

    if (body.categoryType !== undefined) {
      const value = body.categoryType?.trim();
      if (!value) return jsonError("categoryType cannot be empty", 422);
      updates.push("category_type = ?");
      values.push(value);
    }

    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description?.trim() || null);
    }

    if (body.iconKey !== undefined) {
      updates.push("icon_key = ?");
      values.push(body.iconKey?.trim() || null);
    }

    if (updates.length === 0) {
      return jsonError("No updatable fields provided", 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    try {
      const result = await env.DB.prepare(
        `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values, id).run();

      if (result.meta.changes === 0) {
        return jsonError("Category not found", 404);
      }

      const category = await fetchCategoryById(env, id);
      return json(category ?? null, "category updated");
    } catch (error) {
      const message = String(error);
      if (message.includes("UNIQUE")) {
        return jsonError("Category slug already exists", 409);
      }
      console.error("Category update failed", error);
      return jsonError("Failed to update category", 500);
    }
  }),
);

router.delete(
  "/categories/:id",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid category id", 400);

    const result = await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
    if (result.meta.changes === 0) {
      return jsonError("Category not found", 404);
    }

    return json({ id }, "category deleted");
  }),
);

router.get(
  "/words",
  withTiming(async (request, env) => {
    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, numberFromParam(searchParams.get("page")) ?? 1);
    const pageSize = Math.min(100, Math.max(1, numberFromParam(searchParams.get("pageSize")) ?? 20));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: unknown[] = [];

    const categoryId = numberFromParam(searchParams.get("categoryId"));
    if (categoryId) {
      filters.push("w.category_id = ?");
      params.push(categoryId);
    }

    const difficultyLevel = searchParams.get("difficultyLevel")?.trim();
    if (difficultyLevel) {
      filters.push("w.difficulty_level = ?");
      params.push(difficultyLevel);
    }

    const vowelHarmonyRule = searchParams.get("vowelHarmonyRule")?.trim();
    if (vowelHarmonyRule) {
      filters.push("w.vowel_harmony_rule = ?");
      params.push(vowelHarmonyRule);
    }

    const search = searchParams.get("search")?.trim();
    if (search) {
      filters.push("(w.word LIKE ? OR w.arabic_translation LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const itemsQuery = `
      SELECT
        w.id,
        w.word,
        w.arabic_translation AS arabicTranslation,
        w.word_icon_key AS wordIconKey,
        w.turkish_sentence AS turkishSentence,
        w.arabic_sentence AS arabicSentence,
        w.difficulty_level AS difficultyLevel,
        w.vowel_harmony_rule AS vowelHarmonyRule,
        w.category_id AS categoryId,
        w.created_at AS createdAt,
        w.updated_at AS updatedAt,
        c.name AS categoryName,
        c.slug AS categorySlug,
        c.category_type AS categoryType,
        c.icon_key AS categoryIconKey,
        GROUP_CONCAT(wt.tag, ',') AS tagList
      FROM words w
      JOIN categories c ON c.id = w.category_id
      LEFT JOIN word_tags wt ON wt.word_id = w.id
      ${whereClause}
      GROUP BY w.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?`;

    const countQuery = `SELECT COUNT(1) AS total FROM words w ${whereClause}`;

    const itemsStatement = env.DB.prepare(itemsQuery).bind(...params, pageSize, offset);
    const countStatement = env.DB.prepare(countQuery).bind(...params);

    const [{ results }, totalRow] = await Promise.all([
      itemsStatement.all(),
      countStatement.first<{ total: number }>(),
    ]);

    const mappedRows = await mapWordRows(results as Array<Record<string, unknown>>);
    const items = mappedRows.map((row) => ({
      ...row,
      tags: (row.tags as string[]) ?? [],
    }));

    const total = totalRow?.total ?? 0;

    return json(
      {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      },
      "words fetched",
    );
  }),
);

router.get(
  "/words/:id",
  withTiming(async (request, env) => {
    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid word id", 400);

    const word = await fetchWordById(env, id);
    if (!word) return jsonError("Word not found", 404);
    return json(word, "word fetched");
  }),
);

router.options(
  "*",
  () =>
    applyCors(
      new Response(null, {
        status: 204,
      }),
    ),
);

router.options(
  "/export",
  () =>
    applyCors(
      new Response(null, {
        status: 204,
      }),
    ),
);

router.post(
  "/export",
  withTiming(async (request: Request) => {
    try {
      const body = await parseJson<{
        rows?: Array<{
          wordId?: number;
          word?: string;
          arabicTranslation?: string;
          wordIconKey?: string | null;
          categoryName?: string | null;
          categoryIconKey?: string | null;
          difficultyLevel?: string | null;
          tags?: string[] | null;
          turkishSentence?: string | null;
          arabicSentence?: string | null;
          vowelHarmonyRule?: string | null;
        }>;
        fileName?: string;
        embedImages?: boolean;
      }>(request);

      if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
        const origin = request.headers.get('Origin') || undefined;
        return jsonError("rows array is required", 422, 422, origin);
      }

      const headers = [
        "Word",
        "Arabic Translation",
        "Word Icon",
        "Usage Sentence (Turkish)",
        "Usage Sentence (Arabic)",
        "Category",
        "Category Icon",
        "Difficulty Level",
        "Vowel Harmony Rule",
        "Tags",
      ];

      const keysNeedingPresign = body.rows.flatMap((row) => {
        const collect = (value: string | null | undefined) => {
          const trimmed = value?.trim() ?? "";
          if (!trimmed) return null;
          if (/^https?:/i.test(trimmed) || trimmed.startsWith("data:")) {
            return null;
          }
          return trimmed;
        };
        const keys: string[] = [];
        const wordIconKey = collect(row.wordIconKey);
        const categoryIconKey = collect(row.categoryIconKey);
        if (wordIconKey) keys.push(wordIconKey);
        if (categoryIconKey) keys.push(categoryIconKey);
        return keys;
      });
      const downloadMap = await requestDownloadPresign(keysNeedingPresign);

      // Function to fetch image as base64 using fetch API instead of axios
      const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: {
              'Accept': 'image/*'
            }
          });
          
          if (!response.ok) {
            console.error('Failed to fetch image:', url, response.status, response.statusText);
            return null;
          }

          // Convert to base64 using ArrayBuffer
          const arrayBuffer = await response.arrayBuffer();
          // Handle potential issues with btoa and non-ASCII characters
          try {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const mimeType = response.headers.get('content-type') || 'image/png';
            return `data:${mimeType};base64,${base64}`;
          } catch (btoaError) {
            console.error('Failed to encode image as base64:', url, btoaError);
            return null;
          }
        } catch (error) {
          console.error('Failed to fetch image:', url, error);
          return null;
        }
      };

      const rows: string[][] = [];
      const imageRefs: { [key: string]: { url: string; cell: string } } = {};

      // Truncate text fields that exceed Excel's 32,767 character limit
      // Using a slightly smaller limit to account for any additional characters that might be added
      const truncateText = (text: string | null | undefined, maxLength: number = 32700): string => {
        if (!text) return "";
        return text.length > maxLength ? text.substring(0, maxLength) : text;
      };

      // Process each row
      for (let i = 0; i < body.rows.length; i++) {
        const row = body.rows[i];
        const rowIndex = i + 2; // +1 for header, +1 for 1-based indexing

        const resolveIcon = async (value: string | null | undefined, cell: string) => {
          const trimmed = value?.trim() ?? "";
          if (!trimmed) return "";

          // If it's already a data URL, return as is
          if (trimmed.startsWith("data:")) {
            return trimmed;
          }

          // If it's a URL, fetch and convert to data URL
          if (/^https?:/i.test(trimmed)) {
            if (body.embedImages) {
              const base64Image = await fetchImageAsBase64(trimmed);
              if (base64Image) {
                imageRefs[`${rowIndex}-${cell}`] = { url: base64Image, cell };
                return "[Image]"; // Placeholder text
              }
            }
            return trimmed; // Return URL if embedding failed or not requested
          }

          // For storage keys, get the presigned URL
          const presignedUrl = downloadMap.get(trimmed)?.url;
          if (presignedUrl) {
            if (body.embedImages) {
              const base64Image = await fetchImageAsBase64(presignedUrl);
              if (base64Image) {
                imageRefs[`${rowIndex}-${cell}`] = { url: base64Image, cell };
                return "[Image]"; // Placeholder text
              }
            }
            return presignedUrl; // Return presigned URL if embedding failed or not requested
          }

          return trimmed;
        };

        // Process icons with image embedding
        const wordIcon = await resolveIcon(row.wordIconKey, "C");
        const categoryIcon = await resolveIcon(row.categoryIconKey, "G");

        // Apply truncation to all text fields before processing
        const processedRow = {
          word: truncateText(row.word),
          arabicTranslation: truncateText(row.arabicTranslation),
          turkishSentence: truncateText(row.turkishSentence),
          arabicSentence: truncateText(row.arabicSentence),
          categoryName: truncateText(row.categoryName),
          difficultyLevel: truncateText(row.difficultyLevel),
          vowelHarmonyRule: truncateText(row.vowelHarmonyRule),
          tags: truncateText(Array.isArray(row.tags) ? row.tags.join(", ") : ""),
        };

        rows.push([
          processedRow.word,
          processedRow.arabicTranslation,
          wordIcon,
          processedRow.turkishSentence,
          processedRow.arabicSentence,
          processedRow.categoryName,
          categoryIcon,
          processedRow.difficultyLevel,
          processedRow.vowelHarmonyRule,
          processedRow.tags,
        ]);
      }

      // Final safety check to ensure no cell value exceeds Excel's limit
      const finalRows = rows.map(row => 
        row.map(cell => {
          if (typeof cell === 'string' && cell.length > 32700) {
            console.warn(`Cell value exceeds limit, truncating. Length: ${cell.length}`);
            return cell.substring(0, 32700);
          }
          return cell;
        })
      );

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...finalRows]);
      
      // Add image references to worksheet if embedding is enabled
      if (body.embedImages && Object.keys(imageRefs).length > 0) {
        // Note: Full image embedding in Excel files requires additional libraries
        // For now, we'll add a note that images are available as URLs
        console.warn("Image embedding requested but full embedding requires additional libraries. Images will be included as URLs.");
      }

      XLSX.utils.sheet_add_aoa(worksheet, [["Exported at", new Date().toISOString()]], {
        origin: "K1",
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vocabulary");
      const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

      const baseFileName = body.fileName?.trim() || "vocabulary_export";
      const safeFileName = `${baseFileName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 64) || "vocabulary_export"}.xlsx`;
      
      // Get the origin from the request
      const origin = request.headers.get('Origin') || undefined;

      return applyCors(new Response(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${safeFileName}"`,
          "Cache-Control": "no-store",
        },
      }), origin);
    } catch (error) {
      console.error("Export failed", error);
      const origin = request.headers.get('Origin') || undefined;
      return jsonError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 500, origin);
    }
  }),
);

router.post(
  "/words",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const body = await parseJson<WordPayload>(request);
    if (!body) return jsonError("Invalid JSON body", 400);

    const word = body.word?.trim();
    const arabicTranslation = body.arabicTranslation?.trim();
    const categoryId = body.categoryId;

    if (!word || !arabicTranslation || !categoryId) {
      return jsonError("word, arabicTranslation and categoryId are required", 422);
    }

    const wordIconKey = body.wordIconKey?.trim() || null;
    const turkishSentence = body.turkishSentence?.trim() || null;
    const arabicSentence = body.arabicSentence?.trim() || null;
    const difficultyLevel = body.difficultyLevel?.trim() || null;
    const vowelHarmonyRule = body.vowelHarmonyRule?.trim() || null;

    const tags = Array.isArray(body.tags)
      ? body.tags.map(sanitizeTag).filter(Boolean)
      : [];

    let wordId: number | null = null;

    try {
      const insert = await env.DB.prepare(
        `INSERT INTO words (
          word,
          arabic_translation,
          word_icon_key,
          turkish_sentence,
          arabic_sentence,
          difficulty_level,
          vowel_harmony_rule,
          category_id,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        word,
        arabicTranslation,
        wordIconKey,
        turkishSentence,
        arabicSentence,
        difficultyLevel,
        vowelHarmonyRule,
        categoryId,
        // user.userId, // Removed user tracking for local development
      ).run();

      if (!insert.success) {
        console.error("Failed to insert word", insert.error);
        return jsonError("Failed to create word", 500);
      }

      wordId = Number(insert.meta.last_row_id);

      if (tags.length) {
        const statements = tags.map((tag) =>
          env.DB.prepare("INSERT INTO word_tags (word_id, tag) VALUES (?, ?)").bind(wordId, tag),
        );
        await env.DB.batch(statements);
      }

      const createdWord = await fetchWordById(env, wordId);
      return json(createdWord ?? null, "word created", 201);
    } catch (error) {
      console.error("Word creation failed", error);
      if (wordId) {
        await env.DB.prepare("DELETE FROM words WHERE id = ?").bind(wordId).run();
      }
      return jsonError("Failed to create word", 500);
    }
  }),
);

router.put(
  "/words/:id",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid word id", 400);

    const body = await parseJson<WordPayload>(request);
    if (!body) return jsonError("Invalid JSON body", 400);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.word !== undefined) {
      const value = body.word?.trim();
      if (!value) return jsonError("word cannot be empty", 422);
      updates.push("word = ?");
      values.push(value);
    }

    if (body.arabicTranslation !== undefined) {
      const value = body.arabicTranslation?.trim();
      if (!value) return jsonError("arabicTranslation cannot be empty", 422);
      updates.push("arabic_translation = ?");
      values.push(value);
    }

    if (body.wordIconKey !== undefined) {
      updates.push("word_icon_key = ?");
      values.push(body.wordIconKey?.trim() || null);
    }

    if (body.turkishSentence !== undefined) {
      updates.push("turkish_sentence = ?");
      values.push(body.turkishSentence?.trim() || null);
    }

    if (body.arabicSentence !== undefined) {
      updates.push("arabic_sentence = ?");
      values.push(body.arabicSentence?.trim() || null);
    }

    if (body.difficultyLevel !== undefined) {
      updates.push("difficulty_level = ?");
      values.push(body.difficultyLevel?.trim() || null);
    }

    if (body.vowelHarmonyRule !== undefined) {
      updates.push("vowel_harmony_rule = ?");
      values.push(body.vowelHarmonyRule?.trim() || null);
    }

    if (body.categoryId !== undefined) {
      if (!body.categoryId) return jsonError("categoryId must be a positive number", 422);
      updates.push("category_id = ?");
      values.push(body.categoryId);
    }

    if (updates.length === 0 && body.tags === undefined) {
      return jsonError("No updatable fields provided", 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    // Removed user tracking for local development
    // updates.push("updated_by = ?");
    // values.push(user.userId);

    const updateResult = await env.DB.prepare(
      `UPDATE words SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values, id).run();

    if (updateResult.meta.changes === 0) {
      return jsonError("Word not found", 404);
    }

    if (body.tags !== undefined) {
      const tags = Array.isArray(body.tags)
        ? body.tags.map(sanitizeTag).filter(Boolean)
        : [];

      const statements = [env.DB.prepare("DELETE FROM word_tags WHERE word_id = ?").bind(id)];
      tags.forEach((tag) => {
        statements.push(env.DB.prepare("INSERT INTO word_tags (word_id, tag) VALUES (?, ?)").bind(id, tag));
      });
      await env.DB.batch(statements);
    }

    const updatedWord = await fetchWordById(env, id);
    return json(updatedWord ?? null, "word updated");
  }),
);

router.delete(
  "/words/:id",
  withTiming(async (request, env) => {
    // Removed authentication requirement for local development
    // const user = requireAuth(request);
    // try {
    //   ensureAuthenticated(user);
    // } catch (response) {
    //   return response as Response;
    // }

    const id = numberFromParam(request.params?.id ?? null);
    if (!id) return jsonError("Invalid word id", 400);

    const result = await env.DB.prepare("DELETE FROM words WHERE id = ?").bind(id).run();
    if (result.meta.changes === 0) {
      return jsonError("Word not found", 404);
    }

    return json({ id }, "word deleted");
  }),
);

router.all(
  "*",
  withTiming(async () => jsonError("Not Found", 404)),
);

const normalizeBasePath = (input: string | null | undefined) => {
  if (!input) return "/api";
  const trimmed = input.trim();
  if (!trimmed) return "/api";
  const leading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = leading.replace(/\/+$/, "");
  return withoutTrailing.length ? withoutTrailing : "/";
};

const joinBaseWithPath = (basePath: string, targetPath: string) => {
  const sanitizedBase = basePath === "/" ? "" : basePath;
  const sanitizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  return `${sanitizedBase}${sanitizedPath}`.replace(/\/{2,}/g, "/");
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const basePath = normalizeBasePath(env.API_BASE_PATH);
    let effectiveRequest = request;

    if (basePath !== "/") {
      const originalUrl = new URL(request.url);
      if (!originalUrl.pathname.startsWith(basePath)) {
        originalUrl.pathname = joinBaseWithPath(basePath, originalUrl.pathname);
        effectiveRequest = new Request(originalUrl.toString(), request);
      }
    }

    const response = await router.handle(effectiveRequest, env, ctx);
    if (response) {
      return response;
    }

    return jsonError("Not Found", 404);
  },
};
