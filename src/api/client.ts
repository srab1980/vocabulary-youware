import {
  ApiResponse,
  CategoriesResponse,
  Category,
  CreateCategoryInput,
  CreateWordInput,
  ExportWordsInput,
  UpdateCategoryInput,
  UpdateWordInput,
  Word,
  WordsResponse,
} from "../types/api";

// Use local backend when in development mode, otherwise use production
const API_BASE = import.meta.env.DEV 
  ? "http://127.0.0.1:8787/api" 
  : "https://backend.youware.me/api";

const networkErrorMessage =
  "Cannot reach backend. Please check your connection and try again.";

async function handleResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  const normalizedBody = rawBody?.trim();

  if (!response.ok && normalizedBody) {
    if (normalizedBody.includes("Invalid or missing encrypted YwId")) {
      throw new Error(
        "You must be signed in to load workspace data. Please use the account menu to sign in and then retry."
      );
    }
  }

  let payload: ApiResponse<T> | null = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as ApiResponse<T>;
    } catch (error) {
      // Keep payload null so we can throw a clearer fallback message below.
    }
  }

  if (!payload) {
    const fallbackMessage = normalizedBody || `Request failed with status ${response.status}`;
    throw new Error(fallbackMessage);
  }

  if (!response.ok || payload.code !== 0) {
    const message = payload?.message ?? `Request failed with status ${response.status}`;

    if (message.includes("Invalid or missing encrypted YwId")) {
      throw new Error(
        "You must be signed in to load workspace data. Please use the account menu to sign in and then retry."
      );
    }

    throw new Error(message);
  }

  return payload.data;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(networkErrorMessage);
    }
    throw error;
  }
}

const buildQuery = (params: Record<string, string | number | boolean | undefined | null>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const apiClient = {
  async listCategories(options: { categoryType?: string } = {}): Promise<CategoriesResponse> {
    const query = buildQuery({ categoryType: options.categoryType });
    console.log('API Client - listCategories query:', query);
    const response = await safeFetch(`${API_BASE}/categories${query}`);
    return handleResponse<CategoriesResponse>(response);
  },

  async getCategory(id: number): Promise<Category> {
    const response = await safeFetch(`${API_BASE}/categories/${id}`);
    return handleResponse<Category>(response);
  },

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const response = await safeFetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<Category>(response);
  },

  async updateCategory(id: number, input: UpdateCategoryInput): Promise<Category> {
    const response = await safeFetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<Category>(response);
  },

  async deleteCategory(id: number): Promise<{ id: number }> {
    const response = await safeFetch(`${API_BASE}/categories/${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ id: number }>(response);
  },

  async listWords(params: {
    page?: number;
    pageSize?: number;
    categoryId?: number;
    difficultyLevel?: string;
    vowelHarmonyRule?: string;
    search?: string;
  } = {}): Promise<WordsResponse> {
    const query = buildQuery(params);
    const response = await safeFetch(`${API_BASE}/words${query}`);
    return handleResponse<WordsResponse>(response);
  },

  async getWord(id: number): Promise<Word> {
    const response = await safeFetch(`${API_BASE}/words/${id}`);
    return handleResponse<Word>(response);
  },

  async createWord(input: CreateWordInput): Promise<Word> {
    const response = await safeFetch(`${API_BASE}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<Word>(response);
  },

  async updateWord(id: number, input: UpdateWordInput): Promise<Word> {
    const response = await safeFetch(`${API_BASE}/words/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<Word>(response);
  },

  async deleteWord(id: number): Promise<{ id: number }> {
    const response = await safeFetch(`${API_BASE}/words/${id}`, {
      method: "DELETE",
    });
    return handleResponse<{ id: number }>(response);
  },

  async exportVocabulary(payload: ExportWordsInput): Promise<{ blob: Blob; suggestedFileName: string | null }> {
    const response = await safeFetch(`${API_BASE}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Export failed with status ${response.status}`;
      try {
        const jsonPayload = (await response.json()) as ApiResponse<null>;
        errorMessage = jsonPayload.message || errorMessage;
      } catch (error) {
        console.warn("Failed to parse export error payload", error);
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition");
    const suggestedFileName = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? null;

    return { blob, suggestedFileName };
  },
};

export type ApiClient = typeof apiClient;
