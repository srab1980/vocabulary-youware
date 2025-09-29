export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  request_id: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  category_type: string;
  description: string | null;
  icon_key: string | null;
  word_count?: number;
  created_at: string;
  updated_at: string;
};

export type CategoriesResponse = {
  items: Category[];
};

export type Word = {
  id: number;
  word: string;
  arabicTranslation: string;
  wordIconKey: string | null;
  turkishSentence: string | null;
  arabicSentence: string | null;
  difficultyLevel: string | null;
  vowelHarmonyRule: string | null;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryType: string;
  categoryIconKey?: string | null;
  categoryIconUrl?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string | null;
};

export type WordsResponse = {
  items: Word[];
  pagination: Pagination;
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  categoryType: string;
  description?: string | null;
  iconKey?: string | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateWordInput = {
  word: string;
  arabicTranslation: string;
  categoryId: number;
  wordIconKey?: string | null;
  turkishSentence?: string | null;
  arabicSentence?: string | null;
  difficultyLevel?: string | null;
  vowelHarmonyRule?: string | null;
  tags?: string[];
};

export type UpdateWordInput = Partial<CreateWordInput> & {
  tags?: string[];
};

export type ExportWordRow = {
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
};

export type ExportWordsInput = {
  rows: ExportWordRow[];
  fileName?: string;
  embedImages?: boolean;
};
