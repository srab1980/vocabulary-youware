import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { useWordsStore } from "../store/useWordsStore";
import { useImageGenerationStore } from "../store/useImageGenerationStore";

const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

type UploadPanelProps = {
  selectedCategoryId: number | null;
};

type ParsedRow = {
  word: string;
  arabicTranslation: string;
  arabicSentence?: string | null;
  turkishSentence?: string | null;
  difficultyLevel?: string | null;
  vowelHarmonyRule?: string | null;
  tags?: string[];
  wordIconKey?: string | null;
  categoryName?: string | null;
  categoryIconKey?: string | null;
};

const normaliseHeader = (value: unknown) => String(value ?? "").trim().toLowerCase();

const detectColumnIndex = (headers: string[], candidates: string[], fallbackIndex: number) => {
  const matchedIndex = headers.findIndex((header) =>
    header && candidates.some((candidate) => header.includes(candidate)),
  );
  if (matchedIndex >= 0) {
    return matchedIndex;
  }
  return fallbackIndex;
};

const parseTags = (raw: unknown): string[] => {
  if (!raw) return [];
  const text = String(raw);
  if (!text.trim()) return [];
  return text
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export function UploadPanel({ selectedCategoryId }: UploadPanelProps) {
  const bulkImportWords = useWordsStore((state) => state.bulkImportWords);
  const enqueueWords = useImageGenerationStore((state) => state.enqueueWords);
  const defaultStyle = useImageGenerationStore((state) => state.defaultStyle);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowSummary, setRowSummary] = useState<string | null>(null);
  const [detectedColumn, setDetectedColumn] = useState<string | null>(null);

  const resetFeedback = () => {
    setStatus(null);
    setError(null);
    setRowSummary(null);
    setDetectedColumn(null);
  };

  const handleFile = useCallback(
    async (file: File) => {
      resetFeedback();

      if (!file) {
        setError("No file selected." );
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(file.type) && (!extension || !ACCEPTED_EXTENSIONS.includes(`.${extension}`))) {
        setError("Unsupported file format. Please upload .xlsx, .xls, or .csv.");
        return;
      }

      console.log("📄 Starting Excel import", { name: file.name, size: file.size });
      setStatus("Parsing workbook…");

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        if (!workbook.SheetNames.length) {
          throw new Error("No worksheets were found in the uploaded file.");
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        });

        if (rows.length <= 1) {
          throw new Error("The worksheet has no data rows to import.");
        }

        const headers = rows[0]?.map(normaliseHeader) ?? [];
        const wordColumnIndex = detectColumnIndex(headers, ["word", "term", "vocabulary"], 1);
        const translationColumnIndex = detectColumnIndex(headers, ["arabic", "translation", "meaning"], 2);
        const turkishColumnIndex = detectColumnIndex(
          headers,
          ["usage sentence (turkish)", "turkish", "sentence", "example"],
          4,
        );
        const arabicSentenceIndex = detectColumnIndex(
          headers,
          ["usage sentence (arabic)", "arabic sentence", "arabic example"],
          5,
        );
        const categoryColumnIndex = detectColumnIndex(headers, ["category"], 6);
        const categoryIconColumnIndex = detectColumnIndex(headers, ["category icon", "category image"], 7);
        const difficultyColumnIndex = detectColumnIndex(headers, ["difficulty", "level"], 8);
        const vowelHarmonyColumnIndex = detectColumnIndex(headers, ["vowel harmony", "harmony"], 9);
        const tagsColumnIndex = detectColumnIndex(headers, ["tags", "labels"], 10);

        console.log("🧭 Detected column indexes", {
          wordColumnIndex,
          translationColumnIndex,
          turkishColumnIndex,
          arabicSentenceIndex,
          categoryColumnIndex,
          categoryIconColumnIndex,
          difficultyColumnIndex,
          vowelHarmonyColumnIndex,
          tagsColumnIndex,
        });

        const parsedRows: ParsedRow[] = rows.slice(1).map((row) => {
          const safeRow = row ?? [];
          const readCell = (index: number) => String(safeRow[index] ?? "").trim();

          const categoryName = readCell(categoryColumnIndex);
          const categoryIcon = readCell(categoryIconColumnIndex);

          return {
            word: readCell(wordColumnIndex),
            arabicTranslation: readCell(translationColumnIndex),
            turkishSentence: readCell(turkishColumnIndex) || null,
            arabicSentence: readCell(arabicSentenceIndex) || null,
            difficultyLevel: readCell(difficultyColumnIndex) || null,
            vowelHarmonyRule: readCell(vowelHarmonyColumnIndex) || null,
            tags: parseTags(safeRow[tagsColumnIndex]),
            categoryName: categoryName || undefined,
            categoryIconKey: categoryIcon || null,
          };
        });

        const filteredRows = parsedRows.filter((row) => row.word && row.arabicTranslation);
        if (!filteredRows.length) {
          throw new Error("No valid rows found. Ensure Column B contains the vocabulary words and Column C contains translations.");
        }

        const inserted = bulkImportWords(filteredRows, {
          fallbackCategoryId: selectedCategoryId ?? undefined,
        });
        enqueueWords(
          inserted.map((row) => ({ wordId: row.id, word: row.word })),
          { style: defaultStyle },
        );

        setFileName(file.name);
        setStatus("Imported successfully.");
        setRowSummary(`${filteredRows.length} vocabulary rows added to the workspace.`);
        setDetectedColumn(`Words detected in column index ${wordColumnIndex + 1}.`);
        console.log("✅ Excel import completed", {
          file: file.name,
          importedRows: filteredRows.length,
          wordColumnIndex,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse the Excel file.";
        console.error("❌ Excel import failed", { error: message });
        setError(message);
      }
    },
    [bulkImportWords, enqueueWords, selectedCategoryId, defaultStyle],
  );

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    event.target.value = "";
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <section className="mb-8 rounded-3xl border border-dashed border-neutral-300 bg-white/80 p-6 shadow-sm">
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200/60 bg-neutral-50/70 p-6 text-center transition hover:border-neutral-300"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <p className="text-sm text-neutral-600">
          Upload your vocabulary spreadsheet (.xlsx, .xls, .csv). Words are expected in Column B by default.
        </p>
        <label className="cursor-pointer rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800">
          Choose file
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={onFileChange}
          />
        </label>
        <p className="text-xs text-neutral-400">…or drag and drop it here</p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        {fileName && <p className="font-medium text-neutral-700">Last file: {fileName}</p>}
        {status && <p className="text-emerald-600">{status}</p>}
        {rowSummary && <p className="text-neutral-600">{rowSummary}</p>}
        {detectedColumn && <p className="text-neutral-500">{detectedColumn}</p>}
        {error && <p className="text-rose-600">{error}</p>}
      </div>
    </section>
  );
}
