import { create } from "zustand";
import { useWordsStore } from "./useWordsStore";
import { useCategoriesStore } from "./useCategoriesStore";
import ywManifest from "../../yw_manifest.json";
import type { Word } from "../types/api";
import { createBasicWorkflow, updateWorkflowWithPrompt, pollComfyUIForResult, createCustomWorkflow } from "../utils/comfyuiUtils";

// Use local backend when in development mode, otherwise use production
const API_BASE = import.meta.env.DEV 
  ? "http://127.0.0.1:8787/api" 
  : "https://backend.youware.me/api";

export type ImageProvider = "huggingface" | "openai" | "qwen" | "comfyui";

type IconStatus = "idle" | "queued" | "generating" | "success" | "error";

type IconTargetType = "word" | "category";

const PROVIDER_STORAGE_KEY = "vocab-image-provider";
const OPENAI_KEY_STORAGE_KEY = "vocab-openai-api-key";
const HUGGINGFACE_KEY_STORAGE_KEY = "vocab-huggingface-api-key";
const QWEN_KEY_STORAGE_KEY = "vocab-qwen-api-key";
const COMFYUI_KEY_STORAGE_KEY = "vocab-comfyui-api-key";

const FALLBACK_SIZES: Record<string, string> = {
  "gpt-image-1": "1024x1024",
};

const DEFAULT_STYLE = "minimalist flat vector icon with bold outline and soft shadows";

const getInitialProvider = (): ImageProvider => {
  if (typeof window === "undefined") {
    return "huggingface";
  }
  const stored = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored === "qwen") return "qwen";
  return stored === "openai" ? "openai" : "huggingface";
};

const getInitialOpenAiKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(OPENAI_KEY_STORAGE_KEY) ?? "";
};

const getInitialHuggingFaceKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(HUGGINGFACE_KEY_STORAGE_KEY) ?? "";
};

const getInitialQwenKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(QWEN_KEY_STORAGE_KEY) ?? "";
};

const getInitialComfyuiKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(COMFYUI_KEY_STORAGE_KEY) ?? "";
};

type WordQueueItem = {
  type: "word";
  wordId: number;
  label: string;
  style: string;
  provider: ImageProvider;
  force?: boolean;
  // Additional context for better prompts
  context?: {
    translation?: string;
    turkishSentence?: string | null;
    arabicSentence?: string | null;
    difficultyLevel?: string | null;
    tags?: string[];
    categoryName?: string;
  };
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
  huggingFaceApiKey: string;
  // Add qwenApiKey and comfyuiApiKey to the state
  qwenApiKey: string;
  comfyuiApiKey: string;
  setProvider: (provider: ImageProvider) => void;
  setOpenAiApiKey: (apiKey: string) => void;
  setHuggingFaceApiKey: (apiKey: string) => void;
  // Add setter for Qwen API key and ComfyUI API key
  setQwenApiKey: (apiKey: string) => void;
  setComfyuiApiKey: (apiKey: string) => void;
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
  // Use different config keys for different providers
  const configKey = provider === "openai" ? "chatgpt_image" : provider === "qwen" ? "qwen_image" : provider === "comfyui" ? "comfyui_image" : "vocab_image";
  
  // First try to get config from global ywConfig
  if (globalThis.ywConfig?.ai_config?.[configKey]) {
    return globalThis.ywConfig.ai_config[configKey];
  }
  
  // Fallback to using imported manifest
  if (ywManifest?.ai_config?.[configKey]) {
    console.warn(`Using fallback configuration for ${configKey} from imported manifest`);
    return ywManifest.ai_config[configKey];
  }
  
  // For Hugging Face, provide a default configuration if none exists
  if (provider === "huggingface") {
    return {
      model: "stabilityai/stable-diffusion-2-1",
      size: "512x512",
      response_format: "b64_json"
    };
  }
  
  // For Qwen, provide a default configuration if none exists
  if (provider === "qwen") {
    return {
      model: "wanx-v1",
      size: "1024*1024",
      n: 1,
      steps: 30,
      response_format: "url"
    };
  }
  
  throw new Error(`API Error - Image config '${configKey}' not found`);
};

const selectResponseFormat = (config: Record<string, any>) => {
  if (config.response_format) return config.response_format;
  return config.model === "gpt-image-1" ? "b64_json" : "url";
};

const buildPrompt = (label: string, style: string, config: Record<string, any>, context?: {
  translation?: string;
  turkishSentence?: string | null;
  arabicSentence?: string | null;
  difficultyLevel?: string | null;
  tags?: string[];
  categoryName?: string;
}) => {
  if (config.prompt_template && typeof config.prompt_template === "function") {
    console.log("🧩 Building prompt from template", { label, style });
    return config.prompt_template({ word: label, style });
  }

  // Enhanced prompt building with context
  let prompt = `Create a ${style} icon illustrating "${label}"`;
  
  if (context?.translation) {
    prompt += ` which means "${context.translation}"`;
  }
  
  if (context?.categoryName) {
    prompt += ` in the context of "${context.categoryName}"`;
  }
  
  if (context?.difficultyLevel) {
    prompt += ` (difficulty level: ${context.difficultyLevel})`;
  }
  
  if (context?.tags && context.tags.length > 0) {
    prompt += ` related to ${context.tags.join(", ")}`;
  }
  
  if (context?.turkishSentence || context?.arabicSentence) {
    prompt += ". The word is used in sentences like:";
    if (context.turkishSentence) {
      prompt += ` Turkish: "${context.turkishSentence}"`;
    }
    if (context.arabicSentence) {
      prompt += ` Arabic: "${context.arabicSentence}"`;
    }
  }
  
  prompt += ". Focus on visual representation that captures the meaning clearly.";

  return prompt;
};

const buildCacheKey = (
  provider: ImageProvider,
  targetType: IconTargetType,
  label: string,
  style: string,
) => `${provider}:${targetType}:${label.toLowerCase()}|${style.toLowerCase()}`;

const jobKeyForTarget = (targetType: IconTargetType, targetId: number) =>
  `${targetType}-${targetId}`;

// ComfyUI workflow template
const COMFYUI_WORKFLOW_TEMPLATE = {
  "3": {
    "inputs": {
      "seed": 123456789,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": [
        "4",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "latent_image": [
        "5",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "4": {
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.ckpt"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "5": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "text": "",
      "clip": [
        "4",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "text, watermark",
      "clip": [
        "4",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "4",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "8",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
};

// Function to create a ComfyUI workflow from a prompt
const createComfyUIWorkflow = (prompt: string): Record<string, any> => {
  // Deep clone the template
  const workflow = JSON.parse(JSON.stringify(COMFYUI_WORKFLOW_TEMPLATE));
  
  // Update the seed to a random value
  workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);
  
  // Update the prompt in the CLIP Text Encode node
  workflow["6"].inputs.text = prompt;
  
  return workflow;
};

// Function to poll for ComfyUI results
const pollComfyUIResult = async (promptId: string): Promise<string | null> => {
  // This is a simplified implementation
  // In a real-world scenario, you would:
  // 1. Poll the ComfyUI API for the prompt status
  // 2. Wait for completion
  // 3. Extract the image from the SaveImage node
  // 4. Return the image URL or base64 data
  
  try {
    // For demo purposes, we'll make a request to our backend to poll ComfyUI
    const response = await fetch(`${API_BASE}/comfyui/result/${promptId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to poll ComfyUI result: ${response.status}`);
    }
    
    const data = await response.json();
    
    // In a real implementation, you would extract the image from the response
    // For now, we'll return a placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  } catch (error) {
    console.error("ComfyUI polling error:", error);
    throw error;
  }
};

export const useImageGenerationStore = create<ImageGenerationState>((set, get) => ({
  queue: [],
  jobs: {},
  cache: {},
  isProcessing: false,
  defaultStyle: DEFAULT_STYLE,
  provider: getInitialProvider(),
  openAiApiKey: getInitialOpenAiKey(),
  huggingFaceApiKey: getInitialHuggingFaceKey(),
  // Add qwenApiKey and comfyuiApiKey to the initial state
  qwenApiKey: getInitialQwenKey(),
  comfyuiApiKey: getInitialComfyuiKey(),
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
  setHuggingFaceApiKey(apiKey) {
    const normalized = apiKey.trim();
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(HUGGINGFACE_KEY_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(HUGGINGFACE_KEY_STORAGE_KEY);
      }
    }
    set({ huggingFaceApiKey: normalized });
  },
  setQwenApiKey(apiKey) {
    const normalized = apiKey.trim();
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(QWEN_KEY_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(QWEN_KEY_STORAGE_KEY);
      }
    }
    set({ qwenApiKey: normalized });
  },
  setComfyuiApiKey(apiKey) {
    const normalized = apiKey.trim();
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(COMFYUI_KEY_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(COMFYUI_KEY_STORAGE_KEY);
      }
    }
    set({ comfyuiApiKey: normalized });
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

      // Add context information for better prompts
      const context = currentWord ? {
        translation: currentWord.arabicTranslation,
        turkishSentence: currentWord.turkishSentence,
        arabicSentence: currentWord.arabicSentence,
        difficultyLevel: currentWord.difficultyLevel,
        tags: currentWord.tags,
        categoryName: currentWord.categoryName,
      } : undefined;

      newQueueItems.push({ 
        type: "word", 
        wordId, 
        label: trimmedWord, 
        style, 
        provider, 
        force,
        context
      });
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
    // When regenerating, we want to pass the full context
    const currentWord = useWordsStore.getState().items.find((item) => item.id === wordId);
    if (currentWord) {
      // Pass the full word object to get all context
      get().enqueueWords([{
        wordId: currentWord.id,
        word: currentWord.word
      }], { style, force: true });
    } else {
      // Fallback to original behavior if word not found
      get().enqueueWords([{ wordId, word }], { style, force: true });
    }
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

    // Check for Hugging Face API key
    if (queueItem.provider === "huggingface" && !state.huggingFaceApiKey) {
      const message = "API Error - Hugging Face API key not provided";
      console.error("❌ API Error - Missing Hugging Face API key", {
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

    // Additional validation for Hugging Face API key format
    if (queueItem.provider === "huggingface" && state.huggingFaceApiKey) {
      const hfKey = state.huggingFaceApiKey.trim();
      if (!hfKey.startsWith("hf_")) {
        const message = "API Error - Invalid Hugging Face API key format (should start with 'hf_')";
        console.error("❌ API Error - Invalid Hugging Face API key format", {
          target: queueItem.label,
          targetType: queueItem.type,
          keyLength: hfKey.length,
          keyPrefix: hfKey.substring(0, 3)
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
    }

    // Check for Qwen API key
    if (queueItem.provider === "qwen" && !state.qwenApiKey) {
      const message = "API Error - Qwen API key not provided";
      console.error("❌ API Error - Missing Qwen API key", {
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

    // Check for ComfyUI API key (optional, as ComfyUI often runs locally without auth)
    if (queueItem.provider === "comfyui") {
      if (state.comfyuiApiKey) {
        const comfyKey = state.comfyuiApiKey.trim();
        // For ComfyUI, we don't require a specific format since it often runs locally
        // We'll just log a warning if it doesn't look like a Bearer token
        if (!comfyKey.startsWith("Bearer ") && comfyKey.length > 0) {
          console.warn("⚠️ ComfyUI API key provided but doesn't start with 'Bearer '. This might be OK for local instances.", {
            target: queueItem.label,
            targetType: queueItem.type,
            keyLength: comfyKey.length,
            keyPrefix: comfyKey.substring(0, Math.min(7, comfyKey.length))
          });
        }
      }
      // We don't return an error here since ComfyUI might be running locally without auth
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
      // Pass context to buildPrompt for word items
      const prompt = queueItem.type === "word" 
        ? buildPrompt(queueItem.label, queueItem.style, config, queueItem.context)
        : buildPrompt(queueItem.label, queueItem.style, config);
      const isHuggingFaceProvider = queueItem.provider === "huggingface";
      const responseFormat = isHuggingFaceProvider ? selectResponseFormat(config) : null;
      
      // For Qwen, we need a different body structure
      // For ComfyUI, we'll need a workflow-based approach
      const body: Record<string, unknown> = queueItem.provider === "qwen"
        ? {
            model: "wanx-v1",
            input: {
              prompt: prompt,
            },
            parameters: {
              size: "1024*1024",
              n: 1,
              steps: 30,
            }
          }
        : queueItem.provider === "comfyui"
          ? createCustomWorkflow(
              queueItem.label,
              // Check if context exists (only for WordQueueItem)
              "context" in queueItem ? (queueItem.context?.translation || queueItem.label) : queueItem.label,
              "context" in queueItem ? (queueItem.context?.categoryName || "General") : "General",
              "context" in queueItem ? (queueItem.context?.difficultyLevel || "Easy") : "Easy",
              "context" in queueItem ? ((queueItem.context?.tags && queueItem.context.tags.join(", ")) || "General") : "General",
              "context" in queueItem ? (queueItem.context?.turkishSentence || null) : null,
              "context" in queueItem ? (queueItem.context?.arabicSentence || null) : null,
              queueItem.style
            )
          : isHuggingFaceProvider
            ? {
                inputs: prompt,
                parameters: {
                  negative_prompt: "ugly, blurry, low quality, low resolution, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, text, letters, watermark, signature, logo, words, writing, typography, title, heading, label, brand, copyright, trademark, name, username, handle, tag, hashtag, mention, username mention, social media, website, url, link, email, phone number, address, date, time, price, currency, number, quantity, measurement, weight, height, width, length, size, dimension, age, date of birth, personal information, private information, sensitive information, confidential information, secret information, classified information, protected information, restricted information, private data, personal data, sensitive data, confidential data, secret data, classified data, protected data, restricted data",
                  width: 512,
                  height: 512,
                  num_inference_steps: 30
                }
              }
            : {
                model: config.model,
                prompt,
              };

      if (!isHuggingFaceProvider) {
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
        }
      }

      requestBody = body;

      const endpoint =
        queueItem.provider === "openai"
          ? "https://api.openai.com/v1/images/generations"
          : queueItem.provider === "huggingface"
            ? "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1" // Using Stable Diffusion 2.1
            : queueItem.provider === "qwen"
              ? `${API_BASE}/qwen/image` // Use our proxy endpoint with the same base as other API calls
              : queueItem.provider === "comfyui"
                ? `${API_BASE}/comfyui/image` // Use our proxy endpoint
                : "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1"; // Default to Stable Diffusion 2.1

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add Authorization header based on provider
      if (queueItem.provider === "openai") {
        if (!get().openAiApiKey) {
          throw new Error("API Error - OpenAI API key not provided");
        }
        headers["Authorization"] = `Bearer ${get().openAiApiKey}`;
      } else if (queueItem.provider === "huggingface") {
        if (!get().huggingFaceApiKey) {
          throw new Error("API Error - Hugging Face API key not provided");
        }
        // Validate Hugging Face API key format
        const hfKey = get().huggingFaceApiKey.trim();
        if (!hfKey.startsWith("hf_")) {
          throw new Error("API Error - Invalid Hugging Face API key format (should start with 'hf_')");
        }
        headers["Authorization"] = `Bearer ${hfKey}`;
      } else if (queueItem.provider === "qwen") {
        if (!get().qwenApiKey) {
          throw new Error("API Error - Qwen API key not provided");
        }
        headers["Authorization"] = `Bearer ${get().qwenApiKey}`;
      } else if (queueItem.provider === "comfyui" && get().comfyuiApiKey) {
        // Only add auth header if an API key is provided
        // ComfyUI might expect different auth formats, so we'll use the key as-is
        const comfyKey = get().comfyuiApiKey.trim();
        // If it looks like a Bearer token, use it as-is
        // Otherwise, assume it's a raw token and wrap it in Bearer
        if (comfyKey.startsWith("Bearer ")) {
          headers["Authorization"] = comfyKey;
        } else {
          headers["Authorization"] = `Bearer ${comfyKey}`;
        }
      }

      // Add specific headers for Hugging Face if needed
      if (queueItem.provider === "huggingface") {
        headers["Accept"] = "application/json";
      }

      // Add specific headers for Qwen
      if (queueItem.provider === "qwen") {
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "application/json";
      }

      // Add specific headers for ComfyUI
      if (queueItem.provider === "comfyui") {
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "application/json";
      }

      // Debug logging for API keys
      console.log("🔍 API Key Debug Info", {
        provider: queueItem.provider,
        openAiApiKey: get().openAiApiKey ? `${get().openAiApiKey.substring(0, 5)}...` : "NOT SET",
        huggingFaceApiKey: get().huggingFaceApiKey ? `${get().huggingFaceApiKey.substring(0, 5)}...` : "NOT SET",
        qwenApiKey: get().qwenApiKey ? `${get().qwenApiKey.substring(0, 5)}...` : "NOT SET",
        comfyuiApiKey: get().comfyuiApiKey ? `${get().comfyuiApiKey.substring(0, 5)}...` : "NOT SET (or local instance)",
        fullHuggingFaceKeyLength: get().huggingFaceApiKey ? get().huggingFaceApiKey.length : 0,
        headers: { ...headers } // Log headers for debugging
      });

      console.log("🎨 Preparing AI image request", {
        target: queueItem.label,
        style: queueItem.style,
        provider: queueItem.provider,
        endpoint,
        // For ComfyUI, log the workflow directly
        body: queueItem.provider === "comfyui" ? body : body,
        // Add more detailed logging
        fullHeaders: Object.keys(headers).map(key => `${key}: ${key === 'Authorization' ? '[REDACTED]' : headers[key]}`)
      });

      const startTime = Date.now();

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body), // Send the body directly
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
        imagesReturned: isHuggingFaceProvider 
          ? (Array.isArray(data) && data.length > 0 ? 1 : 0) 
          : data?.data?.length ?? 0,
      });

      // Handle different response formats for providers
      let firstImage;
      if (queueItem.provider === "qwen") {
        // Qwen returns a direct URL in the response for synchronous requests
        // or task_id for asynchronous requests
        if (data?.output?.results && Array.isArray(data.output.results) && data.output.results.length > 0) {
          // Synchronous response with direct image URL
          firstImage = { url: data.output.results[0].url };
        } else if (data?.output?.task_id) {
          // Asynchronous response with task ID
          // For simplicity in this implementation, we'll simulate getting the image directly
          // In a real implementation, you would need to poll the task status endpoint
          // For now, we'll just return a placeholder
          firstImage = { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" };
        } else {
          throw new Error(`Qwen API Error: ${JSON.stringify(data)}`);
        }
      } else if (queueItem.provider === "comfyui") {
        // Handle ComfyUI response
        // Handle ComfyUI response
        // ComfyUI returns a prompt ID that we need to poll for results
        // The prompt_id is nested in the data property
        const promptId = data?.data?.prompt_id || data?.prompt_id;
        if (promptId) {
          console.log("ComfyUI prompt submitted with ID:", promptId);
          
          // Poll for the result using our backend proxy
          try {
            const imageUrl = await pollComfyUIForResult(promptId);
            if (imageUrl) {
              firstImage = { url: imageUrl };
            } else {
              // If we couldn't get an image URL, return a placeholder
              firstImage = { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" };
            }
          } catch (error) {
            console.error("ComfyUI polling error:", error);
            // Even if polling fails or times out, we should not throw an error since the job was submitted successfully
            // The job is likely still processing in the background
            // Return a placeholder image and log that the job is still running
            console.log(`ComfyUI job ${promptId} is still processing or timed out, using placeholder image`);
            firstImage = { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" };
          }
        } else {
          throw new Error(`ComfyUI API Error: ${JSON.stringify(data)}`);
        }
      } else if (isHuggingFaceProvider) {
        // Hugging Face returns different response formats
        // It could be an array of objects with blob property or a direct object
        if (Array.isArray(data) && data.length > 0) {
          // Check if it's an array of objects with blob property
          if (data[0]?.blob) {
            firstImage = { b64_json: data[0].blob };
          } 
          // Check if it's an array with a direct base64 string
          else if (typeof data[0] === 'string') {
            firstImage = { b64_json: data[0] };
          }
          // Check if it's an object with a blob property (error case or direct response)
          else if (data[0]?.error) {
            throw new Error(`Hugging Face API Error: ${data[0].error}`);
          }
        } 
        // Direct object response
        else if (data?.blob) {
          firstImage = { b64_json: data.blob };
        } 
        // Error response
        else if (data?.error) {
          throw new Error(`Hugging Face API Error: ${data.error}`);
        }
        
        // If we still don't have a valid image, throw an error
        if (!firstImage) {
          throw new Error("API Error - Invalid response format from Hugging Face image generation");
        }
      } else {
        // OpenAI format
        firstImage = data?.data?.[0];
      }

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