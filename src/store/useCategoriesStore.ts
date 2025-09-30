import { create } from "zustand";
import { apiClient } from "../api/client";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../types/api";

type CategoriesState = {
  items: Category[];
  isLoading: boolean;
  error: string | null;
  selectedCategoryId: number | null;
  hasFetched: boolean;
  fetchCategories: (options?: { categoryType?: string; force?: boolean }) => Promise<void>;
  ensureCategories: (options?: { categoryType?: string }) => Promise<void>;
  refreshCategories: (options?: { categoryType?: string }) => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<Category | null>;
  updateCategory: (id: number, input: UpdateCategoryInput) => Promise<Category | null>;
  deleteCategory: (id: number) => Promise<boolean>;
  setCategoryIcon: (id: number, iconKey: string | null) => Promise<void>;
};

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  selectedCategoryId: null,
  hasFetched: false,
  async fetchCategories(options) {
    const { categoryType, force } = options ?? {};
    console.log('Fetching categories with options:', { categoryType, force });
    if (get().isLoading && !force) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.listCategories({ categoryType });
      console.log('Received categories data:', data.items.length);
      set({
        items: data.items,
        isLoading: false,
        error: null,
        hasFetched: true,
      });
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Cannot reach backend.youware.me. Please check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Unable to load categories.";
      if (error instanceof TypeError) {
        console.warn("Network unavailable while fetching categories", message);
      } else {
        console.error("Failed to fetch categories", error);
      }
      set({ error: message, isLoading: false, hasFetched: false });
    }
  },
  async ensureCategories(options) {
    if (get().hasFetched || get().isLoading) {
      return;
    }
    await get().fetchCategories(options);
  },
  async refreshCategories(options) {
    await get().fetchCategories({ ...(options ?? {}), force: true });
  },
  async createCategory(input) {
    try {
      const created = await apiClient.createCategory(input);
      set({ items: [created, ...get().items], hasFetched: true, error: null });
      void get().refreshCategories();
      return created;
    } catch (error) {
      console.error("Failed to create category", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
  async updateCategory(id, input) {
    try {
      const updated = await apiClient.updateCategory(id, input);
      set({
        items: get().items.map((category) => (category.id === id ? updated : category)),
      });
      void get().refreshCategories();
      return updated;
    } catch (error) {
      console.error("Failed to update category", error);
      set({ error: (error as Error).message });
      return null;
    }
  },
  async deleteCategory(id) {
    try {
      await apiClient.deleteCategory(id);
      set({
        items: get().items.filter((category) => category.id !== id),
        selectedCategoryId: get().selectedCategoryId === id ? null : get().selectedCategoryId,
        hasFetched: true,
      });
      void get().refreshCategories();
      return true;
    } catch (error) {
      console.error("Failed to delete category", error);
      set({ error: (error as Error).message });
      return false;
    }
  },
  async setCategoryIcon(id, iconKey) {
    try {
      const updated = await apiClient.updateCategory(id, { iconKey });
      set((state) => ({
        items: state.items.map((category) => (category.id === id ? updated : category)),
        hasFetched: true,
        error: null,
      }));
    } catch (error) {
      console.error("Failed to update category icon", error);
      set({ error: (error as Error).message });
    }
  },
}));
