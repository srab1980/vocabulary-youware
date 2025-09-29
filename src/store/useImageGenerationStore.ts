import { create } from "zustand";
import { useWordsStore } from "./useWordsStore";
import { useCategoriesStore } from "./useCategoriesStore";
import ywManifest from "../../yw_manifest.json";

export type ImageProvider = "youware" | "openai";

type IconStatus = "idle" | "queued" | "generating" | "success" | "error";

type IconTargetType = "word" | "category";

const PROVIDER_STORAGE_KEY = "vocab-image-provider";
const OPENAI_KEY_STORAGE_KEY = "vocab-openai-api-key";
const YOUWARE_KEY_STORAGE_KEY = "vocab-youware-api-key";

const FALLBACK_SIZES: Record<string, string> = {
  "gpt-image-1": "1024x1024",
};

const DEFAULT_STYLE = "minimalist flat vector icon with bold outline and soft shadows";

const getInitialProvider = (): ImageProvider => {
  if (typeof window === "undefined") {
    return "youware";
  }
  const stored = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
  return stored === "openai" ? "openai" : "youware";
};

const getInitialOpenAiKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(OPENAI_KEY_STORAGE_KEY) ?? "";
};

const getInitialYouwareKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(YOUWARE_KEY_STORAGE_KEY) ?? "";
};

type WordQueueItem = {
  type: "word";
  wordId: number;
  label: string;
  style: string;
  provider: ImageProvider;
  force?: boolean;
};

type CategoryQueueItem = {
  type: "category";
  categoryId: number;
  label: string;
  style: string;
  provider: ImageProvider;
  force?: boolean;
};

type QueueItem = WordQueueItem | CategoryQueueItem;

type IconJob = {
  targetType: IconTargetType;
  targetId: number;
  label: string;
  style: string;
  provider: ImageProvider;
  status: IconStatus;
  attempts: number;
  error?: string | null;
  imageUrl?: string;
  updatedAt: number;
};

type IconCacheEntry = {
  provider: ImageProvider;
  targetType: IconTargetType;
  label: string;
  style: string;
  imageUrl: string;
  cachedAt: number;
};

type ImageGenerationState = {
  queue: QueueItem[];
  jobs: Record<string, IconJob>;
  cache: Record<string, IconCacheEntry>;
  isProcessing: boolean;
  defaultStyle: string;
  provider: ImageProvider;
  openAiApiKey: string;
  youwareApiKey: string;
  setProvider: (provider: ImageProvider) => void;
  setOpenAiApiKey: (apiKey: string) => void;
  setYouwareApiKey: (apiKey: string) => void;
  setDefaultStyle: (style: string) => void;
  enqueueWords: (
    words: Array<{ wordId: number; word: string }>,
    options?: { style?: string; force?: boolean },
  ) => void;
  enqueueCategories: (
    categories: Array<{ categoryId: number; name: string }>,
    options?: { style?: string; force?: boolean },
  ) => void;
  regenerateWord: (wordId: number, word: string, options?: { style?: string }) => void;
  regenerateCategory: (categoryId: number, name: string, options?: { style?: string }) => void;
  clearJob: (targetType: IconTargetType, targetId: number) => void;
  processNext: () => Promise<void>;
};

const resolveConfig = (provider: ImageProvider) => {
  const configKey = provider === "openai" ? "chatgpt_image" : "vocab_image";
  
  // First try to get config from global ywConfig
  if (globalThis.ywConfig?.ai_config?.[configKey]) {
    return globalThis.ywConfig.ai_config[configKey];
  }
  
  // Fallback to using imported manifest
  if (ywManifest?.ai_config?.[configKey]) {
    console.warn(`Using fallback configuration for ${configKey} from imported manifest`);
    return ywManifest.ai_config[configKey];
  }
  
  throw new Error(`API Error - Image config '${configKey}' not found`);
};

const selectResponseFormat = (config: Record<string, any>) => {
  if (config.response_format) return config.response_format;
  return config.model === "gpt-image-1" ? "b64_json" : "url";
};

const buildPrompt = (label: string, style: string, config: Record<string, any>) => {
  if (config.prompt_template && typeof config.prompt_template === "function") {
    console.log("🧩 Building prompt from template", { label, style });
    return config.prompt_template({ word: label, style });
  }
  return `Create a ${style} icon illustrating "${label}".`;
};

const buildCacheKey = (
  provider: ImageProvider,
  targetType: IconTargetType,
  label: string,
  style: string,
) => `${provider}:${targetType}:${label.toLowerCase()}|${style.toLowerCase()}`;

const jobKeyForTarget = (targetType: IconTargetType, targetId: number) =>
  `${targetType}-${targetId}`;

export const useImageGenerationStore = create<ImageGenerationState>((set, get) => ({
  queue: [],
  jobs: {},
  cache: {},
  isProcessing: false,
  defaultStyle: DEFAULT_STYLE,
  provider: getInitialProvider(),
  openAiApiKey: getInitialOpenAiKey(),
  youwareApiKey: getInitialYouwareKey(),
  setProvider(provider) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    }
    set({ provider });
  },
  setOpenAiApiKey(apiKey) {
    const normalized = apiKey.trim();
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(OPENAI_KEY_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(OPENAI_KEY_STORAGE_KEY);
      }
    }
    set({ openAiApiKey: normalized });
  },
  setYouwareApiKey(apiKey) {
    const normalized = apiKey.trim();
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(YOUWARE_KEY_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(YOUWARE_KEY_STORAGE_KEY);
      }
    }
    set({ youwareApiKey: normalized });
  },
  setDefaultStyle(style) {
    set({ defaultStyle: style.trim() || DEFAULT_STYLE });
  },
  enqueueWords(words, options) {
    const provider = get().provider;
    const style = options?.style?.trim() || get().defaultStyle;
    const force = options?.force ?? false;
    if (!words.length) return;

    if (provider === "openai" && !get().openAiApiKey.trim()) {
      console.error("❌ API Error - OpenAI API key not provided", {
        queueSize: words.length,
        targetType: "word",
      });
      return;
    }

    const { cache, jobs } = get();
    const newQueueItems: QueueItem[] = [];
    const updatedJobs: Record<string, IconJob> = { ...jobs };

    words.forEach(({ wordId, word }) => {
      const trimmedWord = word?.trim();
      if (!trimmedWord) return;

      const cacheKey = buildCacheKey(provider, "word", trimmedWord, style);
      const jobKey = jobKeyForTarget("word", wordId);
      const existingJob = jobs[jobKey];

      if (
        !force &&
        existingJob &&
        existingJob.provider === provider &&
        (existingJob.status === "queued" || existingJob.status === "generating")
      ) {
        return;
      }

      const currentWord = useWordsStore.getState().items.find((item) => item.id === wordId);
      if (!force && currentWord?.wordIconKey) {
        updatedJobs[jobKey] = {
          targetType: "word",
          targetId: wordId,
          label: trimmedWord,
          style,
          provider: existingJob?.provider ?? provider,
          status: "success",
          attempts: existingJob?.attempts ?? 0,
          error: null,
          imageUrl: currentWord.wordIconKey,
          updatedAt: Date.now(),
        };
        return;
      }

      const cached = cache[cacheKey];
      if (!force && cached) {
        console.log("♻️ Reusing cached icon", { word: trimmedWord, style, provider: cached.provider });
        useWordsStore.getState().setGeneratedIcon(wordId, cached.imageUrl, {
          strategy: "cache",
          style,
          provider: cached.provider,
        });
        updatedJobs[jobKey] = {
          targetType: "word",
          targetId: wordId,
          label: trimmedWord,
          style,
          provider: cached.provider,
          status: "success",
          attempts: existingJob?.attempts ?? 0,
          error: null,
          imageUrl: cached.imageUrl,
          updatedAt: Date.now(),
        };
        return;
      }

      newQueueItems.push({ type: "word", wordId, label: trimmedWord, style, provider, force });
      updatedJobs[jobKey] = {
        targetType: "word",
        targetId: wordId,
        label: trimmedWord,
        style,
        provider,
        status: "queued",
        attempts: existingJob?.attempts ?? 0,
        error: null,
        imageUrl: existingJob?.imageUrl,
        updatedAt: Date.now(),
      };
    });

    if (!newQueueItems.length) {
      set(() => ({ jobs: updatedJobs }));
      return;
    }

    set((state) => ({
      queue: [...state.queue, ...newQueueItems],
      jobs: updatedJobs,
    }));

    void get().processNext();
  },
  enqueueCategories(categories, options) {
    const provider = get().provider;
    const style = options?.style?.trim() || get().defaultStyle;
    const force = options?.force ?? false;
    if (!categories.length) return;

    if (provider === "openai" && !get().openAiApiKey.trim()) {
      console.error("❌ API Error - OpenAI API key not provided", {
        queueSize: categories.length,
        targetType: "category",
      });
      return;
    }

    const { cache, jobs } = get();
    const categoriesState = useCategoriesStore.getState();
    const newQueueItems: QueueItem[] = [];
    const updatedJobs: Record<string, IconJob> = { ...jobs };

    categories.forEach(({ categoryId, name }) => {
      const trimmedName = name?.trim();
      if (!trimmedName) return;

      const cacheKey = buildCacheKey(provider, "category", trimmedName, style);
      const jobKey = jobKeyForTarget("category", categoryId);
      const existingJob = jobs[jobKey];

      if (
        !force &&
        existingJob &&
        existingJob.provider === provider &&
        (existingJob.status === "queued" || existingJob.status === "generating")
      ) {
        return;
      }

      const categoryRecord = categoriesState.items.find((category) => category.id === categoryId);
      if (!force && categoryRecord?.icon_key) {
        useWordsStore.getState().setCategoryIconForWords(categoryId, categoryRecord.icon_key);
        updatedJobs[jobKey] = {
          targetType: "category",
          targetId: categoryId,
          label: trimmedName,
          style,
          provider: existingJob?.provider ?? provider,
          status: "success",
          attempts: existingJob?.attempts ?? 0,
          error: null,
          imageUrl: categoryRecord.icon_key,
          updatedAt: Date.now(),
        };
        return;
      }

      const cached = cache[cacheKey];
      if (!force && cached) {
        console.log("♻️ Reusing cached category icon", {
          category: trimmedName,
          style,
          provider: cached.provider,
        });
        useCategoriesStore.getState().setCategoryIcon(categoryId, cached.imageUrl);
        useWordsStore.getState().setCategoryIconForWords(categoryId, cached.imageUrl);
        updatedJobs[jobKey] = {
          targetType: "category",
          targetId: categoryId,
          label: trimmedName,
          style,
          provider: cached.provider,
          status: "success",
          attempts: existingJob?.attempts ?? 0,
          error: null,
          imageUrl: cached.imageUrl,
          updatedAt: Date.now(),
        };
        return;
      }

      newQueueItems.push({
        type: "category",
        categoryId,
        label: trimmedName,
        style,
        provider,
        force,
      });
      updatedJobs[jobKey] = {
        targetType: "category",
        targetId: categoryId,
        label: trimmedName,
        style,
        provider,
        status: "queued",
        attempts: existingJob?.attempts ?? 0,
        error: null,
        imageUrl: existingJob?.imageUrl,
        updatedAt: Date.now(),
      };
    });

    if (!newQueueItems.length) {
      set(() => ({ jobs: updatedJobs }));
      return;
    }

    set((state) => ({
      queue: [...state.queue, ...newQueueItems],
      jobs: updatedJobs,
    }));

    void get().processNext();
  },
  regenerateWord(wordId, word, options) {
    const style = options?.style?.trim() || get().defaultStyle;
    get().enqueueWords([{ wordId, word }], { style, force: true });
  },
  regenerateCategory(categoryId, name, options) {
    const style = options?.style?.trim() || get().defaultStyle;
    get().enqueueCategories([{ categoryId, name }], { style, force: true });
  },
  clearJob(targetType, targetId) {
    const jobKey = jobKeyForTarget(targetType, targetId);
    set((state) => {
      const nextJobs = { ...state.jobs };
      delete nextJobs[jobKey];
      return { jobs: nextJobs };
    });
  },
  async processNext() {
    const state = get();
    if (state.isProcessing || state.queue.length === 0) {
      return;
    }

    const queueItem = state.queue[0];
    const jobKey =
      queueItem.type === "word"
        ? jobKeyForTarget("word", queueItem.wordId)
        : jobKeyForTarget("category", queueItem.categoryId);

    if (queueItem.provider === "openai" && !state.openAiApiKey) {
      const message = "API Error - OpenAI API key not provided";
      console.error("❌ API Error - Missing OpenAI API key", {
        target: queueItem.label,
        targetType: queueItem.type,
      });
      set((prev) => {
        const [, ...restQueue] = prev.queue;
        const previousJob = prev.jobs[jobKey];
        return {
          queue: restQueue,
          isProcessing: false,
          jobs: {
            ...prev.jobs,
            [jobKey]: {
              targetType: queueItem.type,
              targetId:
                queueItem.type === "word" ? queueItem.wordId : queueItem.categoryId,
              label: queueItem.label,
              style: queueItem.style,
              provider: queueItem.provider,
              status: "error",
              attempts: previousJob?.attempts ?? 0,
              error: message,
              imageUrl: previousJob?.imageUrl,
              updatedAt: Date.now(),
            },
          },
        };
      });
      void get().processNext();
      return;
    }

    set((prev) => ({
      isProcessing: true,
      jobs: {
        ...prev.jobs,
        [jobKey]: {
          targetType: queueItem.type,
          targetId: queueItem.type === "word" ? queueItem.wordId : queueItem.categoryId,
          label: queueItem.label,
          style: queueItem.style,
          provider: queueItem.provider,
          status: "generating",
          attempts: (prev.jobs[jobKey]?.attempts ?? 0) + 1,
          error: null,
          imageUrl: prev.jobs[jobKey]?.imageUrl,
          updatedAt: Date.now(),
        },
      },
    }));

    let imageUrl: string | undefined;
    let errorMessage: string | null = null;
    let requestBody: Record<string, unknown> | null = null;

    try {
      const config = resolveConfig(queueItem.provider);
      const prompt = buildPrompt(queueItem.label, queueItem.style, config);
      const isYouwareProvider = queueItem.provider === "youware";
      const responseFormat = isYouwareProvider ? selectResponseFormat(config) : null;
      const body: Record<string, unknown> = {
        model: config.model,
        prompt,
      };

      if (responseFormat) {
        body.response_format = responseFormat;
      }

      if (config.n) {
        body.n = config.n;
      }

      if (config.size) {
        body.size = config.size;
      } else if (FALLBACK_SIZES[config.model]) {
        body.size = FALLBACK_SIZES[config.model];
      }

      if (config.quality) {
        body.quality = config.quality;
      }

      if (config.model === "gpt-image-1") {
        body.background = "transparent";
        if (queueItem.provider === "youware") {
          body.output_format = "png";
        }
      }

      requestBody = body;

      const endpoint =
        queueItem.provider === "openai"
          ? "https://api.openai.com/v1/images/generations"
          : import.meta.env.DEV 
            ? "/api/proxy/youware/public/v1/ai/images/generations"
            : "https://api.youware.com/public/v1/ai/images/generations";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization:
          queueItem.provider === "openai"
            ? `Bearer ${get().openAiApiKey}`
            : `Bearer ${get().youwareApiKey || "sk-YOUWARE"}`,
      };

      console.log("🎨 Preparing AI image request", {
        target: queueItem.label,
        style: queueItem.style,
        provider: queueItem.provider,
        endpoint,
        body,
      });

      const startTime = Date.now();

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const fallbackText = await response.text().catch(() => "");
        let errorData: unknown = fallbackText;
        try {
          errorData = fallbackText ? JSON.parse(fallbackText) : fallbackText;
        } catch (parseError) {
          // ignore parse failure, keep raw text
        }
        console.error("❌ API Error - Image generation request failed", {
          status: response.status,
          statusText: response.statusText,
          provider: queueItem.provider,
          errorData,
        });

        if (
          response.status === 400 &&
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData &&
          typeof (errorData as any).error?.message === "string" &&
          (errorData as any).error.message.includes("Supported values are")
        ) {
          const fallbackSize = FALLBACK_SIZES[config.model];
          if (fallbackSize && body.size !== fallbackSize) {
            console.warn("📐 Adjusting image size to supported value", {
              previousSize: body.size,
              fallbackSize,
            });
            body.size = fallbackSize;
            await new Promise((resolve) => setTimeout(resolve, 250));
            set((prev) => ({
              queue: [queueItem, ...prev.queue.slice(1)],
              isProcessing: false,
              jobs: {
                ...prev.jobs,
                [jobKey]: {
                  ...prev.jobs[jobKey],
                  status: "queued",
                  updatedAt: Date.now(),
                },
              },
            }));
            return;
          }
        }

        throw new Error(
          `API Error - Image generation request failed: ${response.status} ${response.statusText || ""} ${
            typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData)
          }`.trim(),
        );
      }

      const data = await response.json();

      console.log("✅ AI API Response (Image)", {
        target: queueItem.label,
        style: queueItem.style,
        provider: queueItem.provider,
        processingTime: `${Date.now() - startTime}ms`,
        responseFormat: responseFormat ?? "default",
        imagesReturned: data?.data?.length ?? 0,
      });

      const firstImage = data?.data?.[0];
      if (!firstImage) {
        throw new Error("API Error - Invalid response format from image generation");
      }

      imageUrl = firstImage.b64_json
        ? `data:image/png;base64,${firstImage.b64_json}`
        : firstImage.url;

      if (!imageUrl) {
        throw new Error("API Error - No image URL returned by provider");
      }

      if (queueItem.type === "word") {
        useWordsStore.getState().setGeneratedIcon(queueItem.wordId, imageUrl, {
          strategy: "ai",
          style: queueItem.style,
          provider: queueItem.provider,
        });
      } else {
        useCategoriesStore.getState().setCategoryIcon(queueItem.categoryId, imageUrl);
        useWordsStore.getState().setCategoryIconForWords(queueItem.categoryId, imageUrl);
      }

      const cacheKey = buildCacheKey(
        queueItem.provider,
        queueItem.type,
        queueItem.label,
        queueItem.style,
      );
      set((prev) => ({
        cache: {
          ...prev.cache,
          [cacheKey]: {
            provider: queueItem.provider,
            targetType: queueItem.type,
            label: queueItem.label,
            style: queueItem.style,
            imageUrl: imageUrl as string,
            cachedAt: Date.now(),
          },
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "API Error - Unknown error during image generation";
      errorMessage = message;
      console.error("❌ API Error - Image generation failed", {
        target: queueItem.label,
        style: queueItem.style,
        provider: queueItem.provider,
        requestBody,
        error: message,
      });
    }

    set((prev) => {
      const [, ...restQueue] = prev.queue;
      return {
        queue: restQueue,
        isProcessing: false,
        jobs: {
          ...prev.jobs,
          [jobKey]: {
            ...prev.jobs[jobKey],
            status: errorMessage ? "error" : "success",
            error: errorMessage,
            imageUrl: imageUrl ?? prev.jobs[jobKey]?.imageUrl,
            updatedAt: Date.now(),
            provider: queueItem.provider,
          },
        },
      };
    });

    void get().processNext();
  },
}));
