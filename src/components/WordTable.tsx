import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Download } from "lucide-react";
import { useWordsStore } from "../store/useWordsStore";
import { useCategoriesStore } from "../store/useCategoriesStore";
import { useImageGenerationStore } from "../store/useImageGenerationStore";
import type { ImageProvider } from "../store/useImageGenerationStore";
import type { CreateWordInput, ExportWordsInput, UpdateWordInput, Word } from "../types/api";
import { validateWordInput } from "../types/validation";
import { IconPreview } from "./IconPreview";

const difficultyLabels: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper",
  C1: "Advanced",
  C2: "Mastery",
};

type WordTableProps = {
  selectedCategoryId: number | null;
};

const defaultForm: CreateWordInput = {
  word: "",
  arabicTranslation: "",
  categoryId: 0,
  turkishSentence: "",
  arabicSentence: "",
  difficultyLevel: "A1",
  vowelHarmonyRule: "",
  tags: [],
};

export function WordTable({ selectedCategoryId }: WordTableProps) {
  const {
    items,
    pagination,
    isLoading,
    error,
    fetchWords,
    createWord,
    updateWord,
    deleteWord,
    filters,
    setFilters,
    exportVocabulary,
  } = useWordsStore();
  const {
    items: categories,
    error: categoryError,
    ensureCategories,
  } = useCategoriesStore();
  const {
    enqueueWords,
    enqueueCategories,
    regenerateWord,
    regenerateCategory,
    jobs,
    queue,
    isProcessing,
    defaultStyle,
    setDefaultStyle,
    provider,
    setProvider,
    openAiApiKey,
    setOpenAiApiKey,
    huggingFaceApiKey,
    setHuggingFaceApiKey,
    qwenApiKey,
    setQwenApiKey,
    comfyuiApiKey,
    setComfyuiApiKey,
  } = useImageGenerationStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Word | null>(null);
  const [formValues, setFormValues] = useState<CreateWordInput>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [styleDraft, setStyleDraft] = useState(`${defaultStyle}`);
  const [styleFeedback, setStyleFeedback] = useState<string | null>(null);
  const [openAiDraft, setOpenAiDraft] = useState(openAiApiKey);
  const [huggingFaceDraft, setHuggingFaceDraft] = useState(huggingFaceApiKey);
  const [qwenDraft, setQwenDraft] = useState(qwenApiKey);
  const [comfyuiDraft, setComfyuiDraft] = useState(comfyuiApiKey);
  const [openAiKeyFeedback, setOpenAiKeyFeedback] = useState<string | null>(null);
  const [huggingFaceKeyFeedback, setHuggingFaceKeyFeedback] = useState<string | null>(null);
  const [qwenKeyFeedback, setQwenKeyFeedback] = useState<string | null>(null);
  const [comfyuiKeyFeedback, setComfyuiKeyFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadingIconIds, setDownloadingIconIds] = useState<Record<number, boolean>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [iconProviderError, setIconProviderError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure we fetch all categories without any filters
    console.log('Fetching categories with no filter');
    void ensureCategories({ categoryType: undefined });
  }, [ensureCategories]);

  useEffect(() => {
    const nextFilters = {
      ...filters,
      categoryId: selectedCategoryId ?? undefined,
    };
    setFilters(nextFilters);
    void fetchWords(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  useEffect(() => {
    setStyleDraft(defaultStyle);
  }, [defaultStyle]);

  useEffect(() => {
    setOpenAiDraft(openAiApiKey);
    if (openAiApiKey) {
      setIconProviderError(null);
    }
  }, [openAiApiKey]);

  useEffect(() => {
    setHuggingFaceDraft(huggingFaceApiKey);
    if (huggingFaceApiKey) {
      setIconProviderError(null);
    }
  }, [huggingFaceApiKey]);

  // Add useEffect for Qwen API key
  useEffect(() => {
    setQwenDraft(qwenApiKey);
    if (qwenApiKey) {
      setIconProviderError(null);
    }
  }, [qwenApiKey]);

  // Add useEffect for ComfyUI API key
  useEffect(() => {
    setComfyuiDraft(comfyuiApiKey);
    if (comfyuiApiKey) {
      setIconProviderError(null);
    }
  }, [comfyuiApiKey]);

  useEffect(() => {
    setIconProviderError(null);
  }, [provider]);

  useEffect(() => {
    if (!openAiKeyFeedback) return;
    const timer = window.setTimeout(() => setOpenAiKeyFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [openAiKeyFeedback]);

  useEffect(() => {
    if (!huggingFaceKeyFeedback) return;
    const timer = window.setTimeout(() => setHuggingFaceKeyFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [huggingFaceKeyFeedback]);

  // Add useEffect for Qwen key feedback
  useEffect(() => {
    if (!qwenKeyFeedback) return;
    const timer = window.setTimeout(() => setQwenKeyFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [qwenKeyFeedback]);

  const handleOpenModal = (word?: Word) => {
    setIconProviderError(null);
    if (word) {
      setEditTarget(word);
      setFormValues({
        word: word.word,
        arabicTranslation: word.arabicTranslation,
        categoryId: word.categoryId,
        wordIconKey: word.wordIconKey,
        turkishSentence: word.turkishSentence ?? "",
        arabicSentence: word.arabicSentence ?? "",
        difficultyLevel: word.difficultyLevel ?? "",
        vowelHarmonyRule: word.vowelHarmonyRule ?? "",
        tags: word.tags,
      });
    } else {
      setEditTarget(null);
      setFormValues({
        ...defaultForm,
        categoryId: selectedCategoryId ?? categories[0]?.id ?? 0,
      });
    }
    setFieldErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setIsModalOpen(true);
  };

  const runValidation = (values: CreateWordInput) => {
    const result = validateWordInput(values);
    if (!result.success) {
      setFieldErrors(result.errors ?? {});
    } else {
      setFieldErrors({});
    }
    return result;
  };

  const setValue = <K extends keyof CreateWordInput>(key: K, value: CreateWordInput[K]) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value } as CreateWordInput;
      if (submitAttempted || touched[key]) {
        runValidation(next);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const validation = runValidation(formValues);
    if (!validation.success || !validation.data) {
      return;
    }
    setIsSubmitting(true);
    const payload: CreateWordInput | UpdateWordInput = {
      ...validation.data,
    };

    try {
      if (editTarget) {
        await updateWord(editTarget.id, payload);
      } else {
        const created = await createWord(payload as CreateWordInput);
        if (created) {
          enqueueWords([{ wordId: created.id, word: created.word }], { style: styleDraft });
        }
      }
      setIsModalOpen(false);
      setFieldErrors({});
      setTouched({});
      setSubmitAttempted(false);
      void fetchWords(filters);
    } catch (error) {
      console.error("Failed to submit word", error);
      setFieldErrors({ form: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this word?")) return;
    const ok = await deleteWord(id);
    if (ok) void fetchWords(filters);
  };

  const persistOpenAiKey = () => {
    const trimmed = openAiDraft.trim();
    setOpenAiApiKey(trimmed);
    setOpenAiDraft(trimmed);
    setOpenAiKeyFeedback(
      trimmed
        ? "OpenAI API key saved locally in this browser."
        : "OpenAI API key cleared."
    );
  };

  const persistHuggingFaceKey = () => {
    const normalized = huggingFaceDraft.trim();
    setHuggingFaceApiKey(normalized);
    setHuggingFaceDraft(normalized);
    setHuggingFaceKeyFeedback(
      normalized
        ? "Hugging Face API key saved locally in this browser."
        : "Hugging Face API key cleared."
    );
  };

  // Add persistQwenKey function
  const persistQwenKey = () => {
    const normalized = qwenDraft.trim();
    setQwenApiKey(normalized);
    setQwenDraft(normalized);
    setQwenKeyFeedback(
      normalized
        ? "Qwen API key saved locally in this browser."
        : "Qwen API key cleared."
    );
  };

  // Add persistComfyuiKey function
  const persistComfyuiKey = () => {
    const normalized = comfyuiDraft.trim();
    setComfyuiApiKey(normalized);
    setComfyuiDraft(normalized);
    setComfyuiKeyFeedback(
      normalized
        ? "ComfyUI API key saved locally in this browser."
        : "ComfyUI API key cleared."
    );
  };

  const ensureProviderReady = () => {
    if (provider === "openai" && !openAiApiKey.trim()) {
      setIconProviderError("Add an OpenAI API key to use ChatGPT image generation.");
      return false;
    }
    if (provider === "huggingface" && !huggingFaceApiKey.trim()) {
      setIconProviderError("Add a Hugging Face API key to use Hugging Face image generation.");
      return false;
    }
    // Add check for Qwen API key
    if (provider === "qwen" && !qwenApiKey.trim()) {
      setIconProviderError("Add a Qwen API key to use Qwen image generation.");
      return false;
    }
    // Add check for ComfyUI (optional, as it can run locally without auth)
    // We won't require an API key for ComfyUI since it often runs locally
    return true;
  };

  const handleGenerateSingle = (word: Word) => {
    if (!ensureProviderReady()) {
      return;
    }
    setIconProviderError(null);
    regenerateWord(word.id, word.word, { style: styleDraft });
  };

  const handleDownloadIcon = async (word: Word) => {
    if (!word.wordIconKey || downloadingIconIds[word.id]) {
      return;
    }

    setDownloadError(null);
    setDownloadingIconIds((prev) => ({ ...prev, [word.id]: true }));

    try {
      const iconUrl = word.wordIconKey;
      let blob: Blob;

      if (iconUrl.startsWith("data:")) {
        const [header, data] = iconUrl.split(",");
        if (!header || !data) {
          throw new Error("Malformed data URL");
        }
        const mimeMatch = header.match(/data:([^;]+);base64/);
        const mimeType = mimeMatch?.[1] ?? "image/png";
        blob = new Blob([Uint8Array.from(window.atob(data), (char) => char.charCodeAt(0))], {
          type: mimeType,
        });
      } else {
        const response = await fetch(iconUrl, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`Failed to fetch icon (${response.status})`);
        }
        blob = await response.blob();
      }

      const extension = (() => {
        const mimeType = blob.type;
        if (mimeType) {
          const [, subtype] = mimeType.split("/");
          if (subtype) {
            return subtype === "svg+xml" ? "svg" : subtype.split(";")[0];
          }
        }
        const pathSegment = iconUrl.split("?")[0];
        const match = pathSegment.match(/\.([a-zA-Z0-9]+)$/);
        if (match?.[1]) {
          return match[1];
        }
        return "png";
      })();

      const sanitizedWord =
        word.word.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
        "icon";
      const filename = `${sanitizedWord}-icon.${extension}`;

      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1500);
    } catch (error) {
      const message = (error instanceof Error ? error.message : "Please try again.").trim();
      setDownloadError(`Unable to download icon for "${word.word}". ${message}`);
      console.error("Failed to download icon", error);
    } finally {
      setDownloadingIconIds((prev) => {
        const next = { ...prev };
        delete next[word.id];
        return next;
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1) return;
    const totalPages = pagination?.totalPages ?? 1;
    if (page > totalPages) return;
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    void fetchWords(nextFilters);
  };

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const categoryIconMap = useMemo(() => {
    const map = new Map<number, string | null>();
    categories.forEach((category) => {
      map.set(category.id, category.icon_key ?? null);
    });
    return map;
  }, [categories]);

  const resolveCategoryIcon = (word: Word) => {
    const fromWord = word.categoryIconUrl || word.categoryIconKey || null;
    if (fromWord) return fromWord;
    return categoryIconMap.get(word.categoryId) ?? null;
  };

  const queuedWordCount = queue.filter((item) => item.type === "word").length;
  const queuedCategoryCount = queue.filter((item) => item.type === "category").length;
  
  // Calculate progress statistics
  const totalWords = items.length;
  const totalCategories = categories.length;
  
  // Count completed word icons
  const completedWordIcons = items.filter(word => word.wordIconKey).length;
  const wordProgressPercentage = totalWords > 0 ? Math.round((completedWordIcons / totalWords) * 100) : 0;
  
  // Count completed category icons
  const completedCategoryIcons = categories.filter(category => category.icon_key).length;
  const categoryProgressPercentage = totalCategories > 0 ? Math.round((completedCategoryIcons / totalCategories) * 100) : 0;
  
  // Count jobs by status
  const queuedJobs = Object.values(jobs).filter(job => job.status === "queued").length;
  const generatingJobs = Object.values(jobs).filter(job => job.status === "generating").length;
  const successJobs = Object.values(jobs).filter(job => job.status === "success").length;
  const errorJobs = Object.values(jobs).filter(job => job.status === "error").length;

  // Get currently generating items
  const currentlyGenerating = Object.values(jobs).filter(job => job.status === "generating");
  
  // Get recently failed items (last 5)
  const recentErrors = Object.values(jobs)
    .filter(job => job.status === "error")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  // Calculate estimated time remaining
  const calculateEstimatedTime = () => {
    // Average time per icon generation (in milliseconds)
    const avgTimePerIcon = 3000; // 3 seconds per icon
    
    // Total items in queue
    const totalQueued = queuedWordCount + queuedCategoryCount + generatingJobs;
    
    // If we have generating jobs, we need to account for them
    const totalTime = totalQueued * avgTimePerIcon;
    
    // Convert to minutes and seconds
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const estimatedTime = calculateEstimatedTime();

  const handleBulkGenerate = () => {
    if (!items.length) return;
    if (!ensureProviderReady()) {
      return;
    }
    setIconProviderError(null);
    enqueueWords(
      items.map((word) => ({ wordId: word.id, word: word.word })),
      { style: styleDraft },
    );
  };

  const handleGenerateCategories = () => {
    if (!categories.length) return;
    if (!ensureProviderReady()) {
      return;
    }
    setIconProviderError(null);
    enqueueCategories(
      categories.map((category) => ({ categoryId: category.id, name: category.name })),
      { style: styleDraft },
    );
  };

  const normalizeIconKey = (iconKey?: string | null) => {
    if (!iconKey) return "";
    if (iconKey.startsWith("data:")) {
      return "[inline icon - download inside app]";
    }
    return iconKey;
  };

  const normalizeIconKeyForExport = (iconKey?: string | null) => {
    // For export, we want to preserve the actual data URLs
    if (!iconKey) return "";
    return iconKey;
  };

  const buildExportPayload = (): ExportWordsInput => ({
    rows: items.map((word) => {
      const resolvedCategoryIcon = resolveCategoryIcon(word);
      return {
        wordId: word.id,
        word: word.word,
        arabicTranslation: word.arabicTranslation,
        wordIconKey: normalizeIconKeyForExport(word.wordIconKey ?? ""),
        categoryName: word.categoryName,
        categoryIconKey: normalizeIconKeyForExport(resolvedCategoryIcon ?? ""),
        difficultyLevel: word.difficultyLevel,
        tags: word.tags,
        turkishSentence: word.turkishSentence,
        arabicSentence: word.arabicSentence,
        vowelHarmonyRule: word.vowelHarmonyRule,
      };
    }),
    fileName: `vocabulary_${new Date().toISOString().slice(0, 10)}`,
    embedImages: true, // Enable image embedding
  });

  const handleExport = async () => {
    if (!items.length || isExporting) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const payload = buildExportPayload();
      const result = await exportVocabulary(payload);
      if (!result) {
        throw new Error("Failed to export vocabulary");
      }

      const { blob, suggestedFileName } = result;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = suggestedFileName ?? `${payload.fileName ?? "vocabulary_export"}.xlsx`;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to export vocabulary";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const resolveJobStatus = (word: Word) => {
    const jobKey = `word-${word.id}`;
    const job = jobs[jobKey];
    if (job) return job;
    if (word.wordIconKey) {
      return {
        wordId: word.id,
        word: word.word,
        style: styleDraft,
        status: "success" as const,
        attempts: 0,
        updatedAt: Date.now(),
        imageUrl: word.wordIconKey,
        error: null,
      };
    }
    return undefined;
  };

  const renderStatusBadge = (word: Word) => {
    const job = resolveJobStatus(word);
    const status = job?.status ?? "idle";

    const baseClass =
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

    switch (status) {
      case "queued":
        return (
          <div className="flex flex-col gap-1">
            <span className={`${baseClass} bg-amber-100 text-amber-700`}>Queued</span>
            {job?.attempts && job.attempts > 0 && (
              <span className="text-[10px] text-amber-600">Attempt {job.attempts + 1}</span>
            )}
          </div>
        );
      case "generating":
        return (
          <div className="flex flex-col gap-1">
            <span className={`${baseClass} bg-blue-100 text-blue-700`}>Generating…</span>
            {job?.attempts && job.attempts > 0 && (
              <span className="text-[10px] text-blue-600">Attempt {job.attempts + 1}</span>
            )}
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col gap-1">
            <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>Ready</span>
            {job?.attempts && job.attempts > 0 && (
              <span className="text-[10px] text-emerald-600">Attempt {job.attempts + 1}</span>
            )}
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col gap-1">
            <span className={`${baseClass} bg-rose-100 text-rose-700`}>Failed</span>
            {job?.attempts && job.attempts > 0 && (
              <span className="text-[10px] text-rose-600">Attempt {job.attempts + 1}</span>
            )}
            {job?.error && (
              <span className="text-[10px] text-rose-500 truncate max-w-[120px]" title={job.error}>
                {job.error.substring(0, 20)}...
              </span>
            )}
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-1">
            <span className={`${baseClass} bg-neutral-100 text-neutral-600`}>Idle</span>
            {word.wordIconKey && (
              <span className="text-[10px] text-neutral-500">Has icon</span>
            )}
          </div>
        );
    }
  };

  const handleRefresh = () => {
    // This will trigger a re-render and recalculate all progress metrics
    setStyleDraft(styleDraft);
  };

  const handleRefreshCategories = () => {
    useCategoriesStore.getState().refreshCategories();
  };

  const handleCancelGeneration = () => {
    if (window.confirm("Are you sure you want to cancel the current generation process?")) {
      // Clear the queue by updating the image generation store
      useImageGenerationStore.setState({ queue: [], isProcessing: false });
      
      // Update all queued jobs to cancelled status
      useImageGenerationStore.setState((state) => {
        const updatedJobs = { ...state.jobs };
        Object.keys(updatedJobs).forEach((jobKey) => {
          if (updatedJobs[jobKey].status === "queued") {
            updatedJobs[jobKey] = {
              ...updatedJobs[jobKey],
              status: "error",
              error: "Cancelled by user",
              updatedAt: Date.now(),
            };
          }
        });
        return { jobs: updatedJobs };
      });
    }
  };

  const handleStyleChange = (value: string) => {
    setStyleDraft(value);
  };

  const handleStylePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    // Give a brief delay to allow the paste to complete
    setTimeout(() => {
      setStyleFeedback("Style prompt pasted! Press Enter or click away to save.");
      // Clear the feedback after 3 seconds
      setTimeout(() => setStyleFeedback(null), 3000);
    }, 100);
  };

  const handleStyleSave = () => {
    setDefaultStyle(styleDraft);
    setStyleFeedback("Style prompt saved successfully!");
    // Clear the feedback after 3 seconds
    setTimeout(() => setStyleFeedback(null), 3000);
  };

  return (
    <section className="flex h-full flex-col rounded-3xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-neutral-900">Vocabulary</h2>
          <p className="text-sm text-neutral-500">Explore, filter, and illustrate bilingual entries.</p>
          {/* Progress indicators */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-700">Words:</span>
              <span className="text-neutral-600">
                {completedWordIcons}/{totalWords} ({wordProgressPercentage}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-700">Categories:</span>
              <span className="text-neutral-600">
                {completedCategoryIcons}/{totalCategories} ({categoryProgressPercentage}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-700">Queue:</span>
              <span className="text-neutral-600">
                {queuedWordCount} words, {queuedCategoryCount} categories
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-blue-700">ETA:</span>
                <span className="text-blue-600">
                  ~{estimatedTime}
                </span>
              </div>
            )}
            {isProcessing && (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="text-xs text-rose-600 hover:text-rose-800"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleRefreshCategories}
              className="text-xs text-green-600 hover:text-green-800"
            >
              Refresh Categories
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={styleDraft}
                onChange={(event) => handleStyleChange(event.target.value)}
                onPaste={handleStylePaste}
                onBlur={handleStyleSave}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleStyleSave();
                  }
                }}
                placeholder="Icon style (e.g. minimalist flat vector icon)"
                className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
              />
              {styleFeedback && (
                <div className="absolute -bottom-5 left-0 text-[10px] text-emerald-600">
                  {styleFeedback}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleBulkGenerate}
              disabled={isProcessing && queue.length === 0}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
            >
              {isProcessing && queuedWordCount > 0 ? `Generating… (${queuedWordCount} left)` : "Generate word icons"}
            </button>
            <button
              type="button"
              onClick={handleGenerateCategories}
              disabled={!categories.length || isProcessing}
              className="rounded-full border border-blue-800 px-4 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-900 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
            >
              {isProcessing && queuedCategoryCount > 0 ? `Generating… (${queuedCategoryCount} left)` : "Generate category icons"}
            </button>
          </div>
          <div className="flex flex-col gap-2 text-xs text-neutral-500 sm:max-w-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-700">Icon provider</span>
              <div className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="icon-provider"
                    value="huggingface"
                    checked={provider === "huggingface"}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProvider(event.target.value as ImageProvider)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span>Hugging Face</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="icon-provider"
                    value="openai"
                    checked={provider === "openai"}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProvider(event.target.value as ImageProvider)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span>ChatGPT</span>
                </label>
                {/* Add Qwen provider option */}
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="icon-provider"
                    value="qwen"
                    checked={provider === "qwen"}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProvider(event.target.value as ImageProvider)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span>Qwen</span>
                </label>
                {/* Add ComfyUI provider option */}
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="icon-provider"
                    value="comfyui"
                    checked={provider === "comfyui"}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProvider(event.target.value as ImageProvider)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span>ComfyUI</span>
                </label>
              </div>
            </div>
            {provider === "huggingface" && (
              <div className="flex flex-col gap-1">
                <label className="text-neutral-500" htmlFor="huggingface-key-input">
                  Hugging Face API key
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    id="huggingface-key-input"
                    value={huggingFaceDraft}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setHuggingFaceDraft(event.target.value)
                    }
                    onBlur={persistHuggingFaceKey}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        persistHuggingFaceKey();
                      }
                    }}
                    placeholder="hf_..."
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Stored locally in this browser only
                  </span>
                </div>
                {huggingFaceKeyFeedback && (
                  <span className="text-[11px] text-emerald-600">{huggingFaceKeyFeedback}</span>
                )}
                <span className="text-[11px] text-neutral-500">
                  Obtain your Hugging Face API key from the Hugging Face dashboard.
                </span>
              </div>
            )}
            
            {provider === "openai" && (
              <div className="flex flex-col gap-1">
                <label className="text-neutral-500" htmlFor="openai-key-input">
                  OpenAI API key
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    id="openai-key-input"
                    value={openAiDraft}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setOpenAiDraft(event.target.value)
                    }
                    onBlur={persistOpenAiKey}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        persistOpenAiKey();
                      }
                    }}
                    placeholder="sk-..."
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Stored locally in this browser only
                  </span>
                </div>
                {openAiKeyFeedback && (
                  <span className="text-[11px] text-emerald-600">{openAiKeyFeedback}</span>
                )}
                <span className="text-[11px] text-neutral-500">
                  OpenAI may require verifying your organization before gpt-image-1 becomes available. Follow the verification steps if 403 errors continue.
                </span>
              </div>
            )}
            
            {provider === "qwen" && (
              <div className="flex flex-col gap-1">
                <label className="text-neutral-500" htmlFor="qwen-key-input">
                  Qwen API key
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    id="qwen-key-input"
                    value={qwenDraft}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setQwenDraft(event.target.value)
                    }
                    onBlur={persistQwenKey}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        persistQwenKey();
                      }
                    }}
                    placeholder="sk-..."
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Stored locally in this browser only
                  </span>
                </div>
                {qwenKeyFeedback && (
                  <span className="text-[11px] text-emerald-600">{qwenKeyFeedback}</span>
                )}
                <span className="text-[11px] text-neutral-500">
                  Obtain your Qwen API key from the Alibaba Cloud dashboard.
                </span>
              </div>
            )}
            
            {provider === "comfyui" && (
                <div className="flex flex-col gap-1">
                  <label className="text-neutral-500" htmlFor="comfyui-key-input">
                    ComfyUI API key (optional)
                  </label>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <input
                      id="comfyui-key-input"
                      value={comfyuiDraft}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setComfyuiDraft(event.target.value)
                      }
                      onBlur={persistComfyuiKey}
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          persistComfyuiKey();
                        }
                      }}
                      placeholder="Bearer ..."
                      className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                    />
                    <span className="text-[11px] text-neutral-400">
                      Stored locally in this browser only
                    </span>
                  </div>
                  {comfyuiKeyFeedback && (
                    <span className="text-[11px] text-emerald-600">{comfyuiKeyFeedback}</span>
                  )}
                  <span className="text-[11px] text-neutral-500">
                    Optional API key for remote ComfyUI instances. Leave empty for local instances.
                  </span>
                </div>
              )}
              
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!items.length || isExporting}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
            >
              {isExporting ? "Exporting…" : "Export Excel"}
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              + New word
            </button>
          </div>
        </div>
      </header>

      {/* Progress visualization section */}
      {(queuedJobs > 0 || generatingJobs > 0 || successJobs > 0 || errorJobs > 0) && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700">Generation Progress</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-800">Queued</span>
                <span className="text-sm font-semibold text-amber-700">{queuedJobs}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-amber-100">
                <div 
                  className="h-2 rounded-full bg-amber-500" 
                  style={{ width: `${totalWords + totalCategories > 0 ? (queuedJobs / (totalWords + totalCategories)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Generating</span>
                <span className="text-sm font-semibold text-blue-700">{generatingJobs}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
                <div 
                  className="h-2 rounded-full bg-blue-500" 
                  style={{ width: `${totalWords + totalCategories > 0 ? (generatingJobs / (totalWords + totalCategories)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-800">Completed</span>
                <span className="text-sm font-semibold text-emerald-700">{successJobs}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-emerald-100">
                <div 
                  className="h-2 rounded-full bg-emerald-500" 
                  style={{ width: `${totalWords + totalCategories > 0 ? (successJobs / (totalWords + totalCategories)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="rounded-lg bg-rose-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-rose-800">Errors</span>
                <span className="text-sm font-semibold text-rose-700">{errorJobs}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-rose-100">
                <div 
                  className="h-2 rounded-full bg-rose-500" 
                  style={{ width: `${totalWords + totalCategories > 0 ? (errorJobs / (totalWords + totalCategories)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Overall Progress</span>
              <span>{totalWords + totalCategories > 0 ? Math.round(((successJobs + errorJobs) / (totalWords + totalCategories)) * 100) : 0}%</span>
            </div>
            <div className="mt-1 h-3 w-full rounded-full bg-neutral-200">
              <div 
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" 
                style={{ width: `${totalWords + totalCategories > 0 ? ((successJobs + errorJobs) / (totalWords + totalCategories)) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          {/* Detailed breakdown */}
          <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center justify-between rounded bg-white p-2">
              <span className="text-neutral-600">Word Icons</span>
              <span className="font-medium text-neutral-800">
                {completedWordIcons}/{totalWords} ({wordProgressPercentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white p-2">
              <span className="text-neutral-600">Category Icons</span>
              <span className="font-medium text-neutral-800">
                {completedCategoryIcons}/{totalCategories} ({categoryProgressPercentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white p-2">
              <span className="text-neutral-600">Total Items</span>
              <span className="font-medium text-neutral-800">
                {successJobs + errorJobs}/{totalWords + totalCategories}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white p-2">
              <span className="text-neutral-600">Estimated Time</span>
              <span className="font-medium text-neutral-800">
                ~{estimatedTime}
              </span>
            </div>
          </div>
          
          {/* Currently generating items */}
          {currentlyGenerating.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-blue-700">Currently Generating</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentlyGenerating.slice(0, 5).map((job) => (
                  <span 
                    key={`${job.targetType}-${job.targetId}`} 
                    className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                  >
                    {job.label} ({job.targetType})
                  </span>
                ))}
                {currentlyGenerating.length > 5 && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                    +{currentlyGenerating.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Recent errors */}
          {recentErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-rose-700">Recent Errors</h4>
              <div className="mt-2 space-y-1">
                {recentErrors.map((job) => (
                  <div 
                    key={`${job.targetType}-${job.targetId}`} 
                    className="rounded bg-rose-50 p-2 text-xs text-rose-700"
                  >
                    <div className="font-medium">{job.label} ({job.targetType})</div>
                    <div className="truncate">{job.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Difficulty</span>
          <select
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.difficultyLevel ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const nextFilters = {
                ...filters,
                difficultyLevel: value || undefined,
                page: 1,
              };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
          >
            <option value="">All levels</option>
            {Object.entries(difficultyLabels).map(([level, label]) => (
              <option key={level} value={level}>
                {level} - {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Category</span>
          <select
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.categoryId ?? ""}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : undefined;
              const nextFilters = {
                ...filters,
                categoryId: value,
                page: 1,
              };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Search</span>
          <input
            type="text"
            placeholder="Filter words..."
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.search ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const nextFilters = {
                ...filters,
                search: value || undefined,
                page: 1,
              };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              const nextFilters = {
                search: undefined,
                categoryId: undefined,
                difficultyLevel: undefined,
                page: 1,
              };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50"
          >
            Clear filters
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p>{error}</p>
        </div>
      )}

      {iconProviderError && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <p>{iconProviderError}</p>
        </div>
      )}

      {downloadError && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p>{downloadError}</p>
        </div>
      )}

      {exportError && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p>{exportError}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <tr>
              <th scope="col" className="px-6 py-3 font-normal">
                Word
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Translation
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Category
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Difficulty
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Icon
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Status
              </th>
              <th scope="col" className="px-6 py-3 font-normal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                  Loading vocabulary…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">
                  No vocabulary entries found. Create your first word!
                </td>
              </tr>
            ) : (
              items.map((word) => {
                const category = categories.find((c) => c.id === word.categoryId);
                const categoryIcon = resolveCategoryIcon(word);
                return (
                  <tr key={word.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-neutral-900">
                      {word.word}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{word.arabicTranslation}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {categoryIcon && (
                          <img
                            src={categoryIcon}
                            alt=""
                            className="h-6 w-6 rounded object-contain"
                          />
                        )}
                        <span className="text-neutral-700">{word.categoryName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                        {word.difficultyLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {word.wordIconKey ? (
                          <img
                            src={word.wordIconKey}
                            alt={`Icon for ${word.word}`}
                            className="h-8 w-8 rounded object-contain"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded border border-dashed border-neutral-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(word)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateSingle(word)}
                          disabled={isProcessing}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(word)}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(word.id)}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                        {word.wordIconKey && (
                          <button
                            type="button"
                            onClick={() => handleDownloadIcon(word)}
                            disabled={downloadingIconIds[word.id]}
                            className="flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingIconIds[word.id] ? "..." : "Download"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing {pagination.page}-{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} words
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  page === pagination.page
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editTarget ? "Edit word" : "Add new word"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="word" className="mb-1 block text-sm font-medium text-neutral-700">
                    Word *
                  </label>
                  <input
                    id="word"
                    type="text"
                    value={formValues.word}
                    onChange={(event) => setValue("word", event.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, word: true }))}
                    className={`w-full rounded-xl border px-3 py-2 outline-none transition focus:ring-2 ${
                      touched.word && fieldErrors.word
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500/20"
                    }`}
                  />
                  {touched.word && fieldErrors.word && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.word}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="arabicTranslation"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Arabic Translation *
                  </label>
                  <input
                    id="arabicTranslation"
                    type="text"
                    dir="rtl"
                    value={formValues.arabicTranslation}
                    onChange={(event) => setValue("arabicTranslation", event.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, arabicTranslation: true }))}
                    className={`w-full rounded-xl border px-3 py-2 outline-none transition focus:ring-2 ${
                      touched.arabicTranslation && fieldErrors.arabicTranslation
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500/20"
                    }`}
                  />
                  {touched.arabicTranslation && fieldErrors.arabicTranslation && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.arabicTranslation}</p>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="categoryId"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Category *
                </label>
                <select
                  id="categoryId"
                  value={formValues.categoryId}
                  onChange={(event) => setValue("categoryId", Number(event.target.value))}
                  onBlur={() => setTouched((prev) => ({ ...prev, categoryId: true }))}
                  className={`w-full rounded-xl border px-3 py-2 outline-none transition focus:ring-2 ${
                    touched.categoryId && fieldErrors.categoryId
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500/20"
                  }`}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {touched.categoryId && fieldErrors.categoryId && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.categoryId}</p>
                )}
              </div>
              <div className="mb-4">
                <label
                  htmlFor="turkishSentence"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Turkish Sentence
                </label>
                <textarea
                  id="turkishSentence"
                  value={formValues.turkishSentence}
                  onChange={(event) => setValue("turkishSentence", event.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20"
                  rows={2}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="arabicSentence"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Arabic Sentence
                </label>
                <textarea
                  id="arabicSentence"
                  dir="rtl"
                  value={formValues.arabicSentence}
                  onChange={(event) => setValue("arabicSentence", event.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20"
                  rows={2}
                />
              </div>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="difficultyLevel"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Difficulty Level
                  </label>
                  <select
                    id="difficultyLevel"
                    value={formValues.difficultyLevel}
                    onChange={(event) => setValue("difficultyLevel", event.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20"
                  >
                    <option value="">Select level</option>
                    {Object.entries(difficultyLabels).map(([level, label]) => (
                      <option key={level} value={level}>
                        {level} - {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="vowelHarmonyRule"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Vowel Harmony Rule
                  </label>
                  <input
                    id="vowelHarmonyRule"
                    type="text"
                    value={formValues.vowelHarmonyRule}
                    onChange={(event) => setValue("vowelHarmonyRule", event.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-neutral-700">Tags</label>
                <input
                  type="text"
                  value={formValues.tags.join(", ")}
                  onChange={(event) => {
                    const tags = event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean);
                    setValue("tags", tags);
                  }}
                  placeholder="Enter tags separated by commas"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20"
                />
              </div>
              {fieldErrors.form && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                  <p>{fieldErrors.form}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-neutral-700 transition hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Saving…" : editTarget ? "Update word" : "Add word"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
