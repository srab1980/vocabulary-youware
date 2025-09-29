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
    youwareApiKey,
    setYouwareApiKey,
  } = useImageGenerationStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Word | null>(null);
  const [formValues, setFormValues] = useState<CreateWordInput>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [styleDraft, setStyleDraft] = useState(`${defaultStyle}`);
  const [openAiDraft, setOpenAiDraft] = useState(openAiApiKey);
  const [youwareDraft, setYouwareDraft] = useState(youwareApiKey);
  const [openAiKeyFeedback, setOpenAiKeyFeedback] = useState<string | null>(null);
  const [youwareKeyFeedback, setYouwareKeyFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadingIconIds, setDownloadingIconIds] = useState<Record<number, boolean>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [iconProviderError, setIconProviderError] = useState<string | null>(null);

  useEffect(() => {
    void ensureCategories();
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
    setYouwareDraft(youwareApiKey);
    if (youwareApiKey) {
      setIconProviderError(null);
    }
  }, [youwareApiKey]);

  useEffect(() => {
    setIconProviderError(null);
  }, [provider]);

  useEffect(() => {
    if (!openAiKeyFeedback) return;
    const timer = window.setTimeout(() => setOpenAiKeyFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [openAiKeyFeedback]);

  useEffect(() => {
    if (!youwareKeyFeedback) return;
    const timer = window.setTimeout(() => setYouwareKeyFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [youwareKeyFeedback]);

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

  const persistYouwareKey = () => {
    const trimmed = youwareDraft.trim();
    setYouwareApiKey(trimmed);
    setYouwareDraft(trimmed);
    setYouwareKeyFeedback(
      trimmed
        ? "Youware API key saved locally in this browser."
        : "Youware API key cleared."
    );
  };

  const ensureProviderReady = () => {
    if (provider === "openai" && !openAiApiKey.trim()) {
      setIconProviderError("Add an OpenAI API key to use ChatGPT image generation.");
      return false;
    }
    if (provider === "youware" && !youwareApiKey.trim()) {
      setIconProviderError("Add a Youware API key to use Youware image generation.");
      return false;
    }
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
        return <span className={`${baseClass} bg-amber-100 text-amber-700`}>Queued</span>;
      case "generating":
        return <span className={`${baseClass} bg-blue-100 text-blue-700`}>Generating…</span>;
      case "success":
        return <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>Ready</span>;
      case "error":
        return (
          <span className={`${baseClass} bg-rose-100 text-rose-700`}>
            Failed
          </span>
        );
      default:
        return <span className={`${baseClass} bg-neutral-100 text-neutral-600`}>Idle</span>;
    }
  };

  return (
    <section className="flex h-full flex-col rounded-3xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-neutral-900">Vocabulary</h2>
          <p className="text-sm text-neutral-500">Explore, filter, and illustrate bilingual entries.</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>Word queue: {queuedWordCount}</span>
            <span>Category queue: {queuedCategoryCount}</span>
            <span>Active: {isProcessing ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2">
            <input
              value={styleDraft}
              onChange={(event) => setStyleDraft(event.target.value)}
              onBlur={() => setDefaultStyle(styleDraft)}
              placeholder="Icon style (e.g. minimalist flat vector icon)"
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            />
            <button
              type="button"
              onClick={handleBulkGenerate}
              disabled={isProcessing && queue.length === 0}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
            >
              {isProcessing ? "Generating…" : "Generate word icons"}
            </button>
            <button
              type="button"
              onClick={handleGenerateCategories}
              disabled={!categories.length || isProcessing}
              className="rounded-full border border-blue-800 px-4 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-900 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
            >
              Generate category icons
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
                    value="youware"
                    checked={provider === "youware"}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setProvider(event.target.value as ImageProvider)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span>Youware</span>
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
              </div>
            </div>
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
            {provider === "youware" && (
              <div className="flex flex-col gap-1">
                <label className="text-neutral-500" htmlFor="youware-key-input">
                  Youware API key
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    id="youware-key-input"
                    value={youwareDraft}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setYouwareDraft(event.target.value)
                    }
                    onBlur={persistYouwareKey}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        persistYouwareKey();
                      }
                    }}
                    placeholder="sk-..."
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs text-neutral-700 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Stored locally in this browser only
                  </span>
                </div>
                {youwareKeyFeedback && (
                  <span className="text-[11px] text-emerald-600">{youwareKeyFeedback}</span>
                )}
                <span className="text-[11px] text-neutral-500">
                  Obtain your Youware API key from the Youware dashboard.
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

      <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Difficulty</span>
          <select
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.difficultyLevel ?? ""}
            onChange={(event) => {
              const value = event.target.value || undefined;
              const nextFilters = { ...filters, difficultyLevel: value, page: 1 };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
          >
            <option value="">All levels</option>
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Harmony rule</span>
          <input
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.vowelHarmonyRule ?? ""}
            onChange={(event) => {
              const value = event.target.value || undefined;
              const nextFilters = { ...filters, vowelHarmonyRule: value, page: 1 };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
            placeholder="e.g. I-type (back)"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span className="text-neutral-500">Search</span>
          <input
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
            value={filters.search ?? ""}
            onChange={(event) => {
              const value = event.target.value || undefined;
              const nextFilters = { ...filters, search: value, page: 1 };
              setFilters(nextFilters);
              void fetchWords(nextFilters);
            }}
            placeholder="Word or Arabic equivalent"
          />
        </label>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-neutral-200/80">
        {(isLoading || !items.length) && !error && !categoryError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <span className="animate-pulse text-sm text-neutral-500">Loading vocabulary…</span>
          </div>
        )}
        <div className="max-h-full overflow-auto">
          {(error || categoryError || exportError || downloadError || iconProviderError) && (
            <div className="sticky top-0 z-20 space-y-2 rounded-b-none border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {(error ?? categoryError) && <div>{error ?? categoryError}</div>}
              {exportError && <div>{exportError}</div>}
              {downloadError && <div>{downloadError}</div>}
              {iconProviderError && <div>{iconProviderError}</div>}
            </div>
          )}
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-50/80 backdrop-blur">
              <tr className="text-xs uppercase text-neutral-500">
                <th className="px-4 py-3">Word</th>
                <th className="px-4 py-3">Arabic Translation</th>
                <th className="px-4 py-3">Word Icon</th>
                <th className="px-4 py-3">Usage Sentence (Turkish)</th>
                <th className="px-4 py-3">Usage Sentence (Arabic)</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Category Icon</th>
                <th className="px-4 py-3">Difficulty Level</th>
                <th className="px-4 py-3">Vowel Harmony Rule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((word) => {
                const isDownloadingIcon = Boolean(downloadingIconIds[word.id]);

                return (
                  <tr
                    key={word.id}
                    className="border-t border-neutral-100 text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{word.word}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{word.arabicTranslation}</div>
                    </td>
                    <td className="px-4 py-3">
                      {word.wordIconKey ? (
                        <IconPreview
                          src={word.wordIconKey}
                          alt={`${word.word} icon`}
                          className="h-12 w-12 rounded-lg border border-neutral-200 object-cover"
                          previewSize="md"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">No icon</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-600">
                        {word.turkishSentence ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-600">
                        {word.arabicSentence ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        {word.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const categoryIcon = resolveCategoryIcon(word);
                        if (!categoryIcon) {
                          return <span className="text-xs text-neutral-400">No icon</span>;
                        }
                        return (
                          <IconPreview
                            src={categoryIcon}
                            alt={`${word.categoryName} icon`}
                            className="h-12 w-12 rounded-lg border border-neutral-200 object-cover"
                            previewSize="md"
                          />
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          difficultyLabels[word.difficultyLevel ?? ""]
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {word.difficultyLevel ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        {word.vowelHarmonyRule ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {renderStatusBadge(word)}
                        {jobs[`word-${word.id}`]?.error && (
                          <span className="text-[11px] text-rose-500">
                            {jobs[`word-${word.id}`]?.error}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(word)}
                          className="rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateSingle(word)}
                          className="rounded-full border border-blue-200 px-3 py-1 font-medium text-blue-600 transition hover:border-blue-300 hover:text-blue-700"
                        >
                          Re-generate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadIcon(word)}
                          disabled={!word.wordIconKey || isDownloadingIcon}
                          className="rounded-full border border-emerald-200 px-3 py-1 font-medium text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
                        >
                          {isDownloadingIcon ? (
                            "Saving…"
                          ) : (
                            <span className="flex items-center gap-1">
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              Save icon
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(word.id)}
                          className="rounded-full border border-rose-200 px-3 py-1 font-medium text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !isLoading && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-neutral-500" colSpan={11}>
                    No words found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <footer className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} — {pagination.total} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange((pagination?.page ?? 1) - 1)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => handlePageChange((pagination?.page ?? 1) + 1)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-800"
            >
              Next
            </button>
          </div>
        </footer>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                {editTarget ? "Edit word" : "Create word"}
              </h3>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-neutral-800"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-neutral-600">Word</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.word && (submitAttempted || touched.word)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.word}
                  onChange={(event) => setValue("word", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, word: true }));
                    runValidation(formValues);
                  }}
                />
                {fieldErrors.word && (submitAttempted || touched.word) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.word}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Arabic translation</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.arabicTranslation && (submitAttempted || touched.arabicTranslation)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.arabicTranslation}
                  onChange={(event) => setValue("arabicTranslation", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, arabicTranslation: true }));
                    runValidation(formValues);
                  }}
                />
                {fieldErrors.arabicTranslation && (submitAttempted || touched.arabicTranslation) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.arabicTranslation}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Category</span>
                <select
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.categoryId && (submitAttempted || touched.categoryId)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.categoryId}
                  onChange={(event) => setValue("categoryId", Number(event.target.value))}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, categoryId: true }));
                    runValidation(formValues);
                  }}
                >
                  <option value={0} disabled>
                    Choose category
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && (submitAttempted || touched.categoryId) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.categoryId}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Difficulty level</span>
                <select
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700/10"
                  value={formValues.difficultyLevel ?? ""}
                  onChange={(event) =>
                    setValue(
                      "difficultyLevel",
                      (event.target.value || undefined) as CreateWordInput["difficultyLevel"],
                    )
                  }
                >
                  <option value="">Unknown</option>
                  {Object.keys(difficultyLabels).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {fieldErrors.difficultyLevel && (submitAttempted || touched.difficultyLevel) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.difficultyLevel}</p>
                )}
              </label>
              <label className="text-sm md:col-span-2">
                <span className="text-neutral-600">Turkish sentence</span>
                <textarea
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.turkishSentence && (submitAttempted || touched.turkishSentence)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.turkishSentence ?? ""}
                  onChange={(event) => setValue("turkishSentence", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, turkishSentence: true }));
                    runValidation(formValues);
                  }}
                  rows={2}
                />
                {fieldErrors.turkishSentence && (submitAttempted || touched.turkishSentence) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.turkishSentence}</p>
                )}
              </label>
              <label className="text-sm md:col-span-2">
                <span className="text-neutral-600">Arabic sentence</span>
                <textarea
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.arabicSentence && (submitAttempted || touched.arabicSentence)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.arabicSentence ?? ""}
                  onChange={(event) => setValue("arabicSentence", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, arabicSentence: true }));
                    runValidation(formValues);
                  }}
                  rows={2}
                />
                {fieldErrors.arabicSentence && (submitAttempted || touched.arabicSentence) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.arabicSentence}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Vowel harmony</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.vowelHarmonyRule && (submitAttempted || touched.vowelHarmonyRule)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.vowelHarmonyRule ?? ""}
                  onChange={(event) => setValue("vowelHarmonyRule", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, vowelHarmonyRule: true }));
                    runValidation(formValues);
                  }}
                />
                {fieldErrors.vowelHarmonyRule && (submitAttempted || touched.vowelHarmonyRule) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.vowelHarmonyRule}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Tags</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.tags && (submitAttempted || touched.tags)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={(formValues.tags ?? []).join(", ")}
                  onChange={(event) =>
                    setValue(
                      "tags",
                      event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    )
                  }
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, tags: true }));
                    runValidation(formValues);
                  }}
                  placeholder="Comma-separated"
                />
                {fieldErrors.tags && (submitAttempted || touched.tags) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.tags}</p>
                )}
              </label>
              <label className="text-sm">
                <span className="text-neutral-600">Word icon key (optional)</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.wordIconKey && (submitAttempted || touched.wordIconKey)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.wordIconKey ?? ""}
                  onChange={(event) => setValue("wordIconKey", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, wordIconKey: true }));
                    runValidation(formValues);
                  }}
                  placeholder="/uploads/words/example.png"
                />
                {fieldErrors.wordIconKey && (submitAttempted || touched.wordIconKey) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.wordIconKey}</p>
                )}
              </label>
            </div>
            {fieldErrors.form && (
              <p className="mt-4 text-sm text-rose-500">{fieldErrors.form}</p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {isSubmitting ? "Saving…" : editTarget ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
