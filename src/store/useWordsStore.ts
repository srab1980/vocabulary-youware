import { create } from "zustand";
import { apiClient } from "../api/client";
import type { CreateWordInput, ExportWordsInput, UpdateWordInput, Word } from "../types/api";

type WordFilters = {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  difficultyLevel?: string;
  vowelHarmonyRule?: string;
  search?: string;
};

type WordsState = {
  items: Word[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  filters: WordFilters;
  fetchWords: (filters?: WordFilters) => Promise<void>;
  getWord: (id: number) => Promise<Word | null>;
  createWord: (input: CreateWordInput) => Promise<Word | null>;
  updateWord: (id: number, input: UpdateWordInput) => Promise<Word | null>;
  deleteWord: (id: number) => Promise<boolean>;
  bulkImportWords: (
    rows: Array<
      Omit<CreateWordInput, "categoryId"> & {
        categoryName?: string | null;
        categoryIconKey?: string | null;
      }
    >,
    options?: { fallbackCategoryId?: number },
  ) => Word[];
  setGeneratedIcon: (
    wordId: number,
    imageUrl: string,
    meta?: {
      strategy?: "ai" | "cache";
      style?: string;
      provider?: string;
    },
  ) => void;
  setCategoryIconForWords: (categoryId: number, iconKey: string | null) => void;
  setFilters: (filters: WordFilters) => void;
  resetFilters: () => void;
  exportVocabulary: (payload: ExportWordsInput) => Promise<{ blob: Blob; suggestedFileName: string | null } | null>;
};

const initialFilters: WordFilters = {
  page: 1,
  pageSize: 20,
};

export const useWordsStore = create<WordsState>((set, get) => ({
  items: [],
  pagination: null,
  isLoading: false,
  error: null,
  filters: initialFilters,
  async fetchWords(filters) {
    set({ isLoading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...(filters ?? {}) };
      const data = await apiClient.listWords(mergedFilters);
      set({
        items: data.items,
        pagination: data.pagination,
        filters: mergedFilters,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Cannot reach backend.youware.me. Please check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Unable to load words.";
      if (error instanceof TypeError) {
        console.warn("Network unavailable while fetching words", message);
      } else {
        console.error("Failed to fetch words", error);
      }
      set({ error: message, isLoading: false });
    }
  },
  async getWord(id) {
    try {
      return await apiClient.getWord(id);
    } catch (error) {
      console.error("Failed to get word", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
  async createWord(input) {
    try {
      const created = await apiClient.createWord(input);
      set({ items: [created, ...get().items] });
      return created;
    } catch (error) {
      console.error("Failed to create word", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
  async updateWord(id, input) {
    try {
      const updated = await apiClient.updateWord(id, input);
      set({
        items: get().items.map((word) => (word.id === id ? updated : word)),
      });
      return updated;
    } catch (error) {
      console.error("Failed to update word", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
  async deleteWord(id) {
    try {
      await apiClient.deleteWord(id);
      set({ items: get().items.filter((word) => word.id !== id) });
      return true;
    } catch (error) {
      console.error("Failed to delete word", error);
      set({ error: (error as Error).message });
      return false;
    }
  },
  bulkImportWords(rows, options) {
    const fallbackCategoryId = options?.fallbackCategoryId;
    const timestampBase = Date.now();
    const normalizedRows = rows
      .map((row, index) => {
        const trimmedWord = row.word?.trim();
        const trimmedTranslation = row.arabicTranslation?.trim();
        if (!trimmedWord || !trimmedTranslation) {
          console.warn("Skipping invalid row during import", { index, row });
          return null;
        }
        return {
          id: timestampBase + index,
          word: trimmedWord,
          arabicTranslation: trimmedTranslation,
          categoryId: fallbackCategoryId ?? 0,
          arabicSentence: row.arabicSentence ?? null,
          turkishSentence: row.turkishSentence ?? null,
          difficultyLevel: row.difficultyLevel ?? null,
          vowelHarmonyRule: row.vowelHarmonyRule ?? null,
          wordIconKey: row.wordIconKey ?? null,
          tags: row.tags ?? [],
          categoryName: row.categoryName ?? "Imported",
          categoryIconKey: row.categoryIconKey ?? null,
          categoryIconUrl: null,
          categorySlug: "imported",
          categoryType: row.categoryName ?? "imported",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Word;
      })
      .filter((value): value is Word => Boolean(value));

    set((state) => ({ items: [...normalizedRows, ...state.items] }));

    return normalizedRows;
  },
  setGeneratedIcon(wordId, imageUrl, meta) {
    console.log("🖼️ Updating word icon", {
      wordId,
      imagePreview: imageUrl.slice(0, 64),
      strategy: meta?.strategy ?? "unknown",
      style: meta?.style,
      provider: meta?.provider ?? "youware",
    });
    set((state) => ({
      items: state.items.map((word) =>
        word.id === wordId
          ? {
              ...word,
              wordIconKey: imageUrl,
              updatedAt: new Date().toISOString(),
            }
          : word,
      ),
    }));
  },

  updateWordIconUrl(wordId, hostedUrl) {
    set((state) => ({
      items: state.items.map((word) =>
        word.id === wordId
          ? {
              ...word,
              wordIconKey: hostedUrl,
              updatedAt: new Date().toISOString(),
            }
          : word,
      ),
    }));
  },
  setCategoryIconForWords(categoryId, iconKey) {
    set((state) => ({
      items: state.items.map((word) =>
        word.categoryId === categoryId
          ? {
              ...word,
              categoryIconKey: iconKey,
              // Only inject fallback if word icon is currently empty
              wordIconKey: word.wordIconKey ?? iconKey ?? null,
            }
          : word,
      ),
    }));
  },
  setFilters(filters) {
    set({ filters: { ...get().filters, ...filters } });
  },
  resetFilters() {
    set({ filters: initialFilters });
  },
  async exportVocabulary(payload) {
    try {
      return await apiClient.exportVocabulary(payload);
    } catch (error) {
      console.error("Failed to export vocabulary", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
}));
