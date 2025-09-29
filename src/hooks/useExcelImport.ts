import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { detectKeyColumns } from "../utils/importUtils";

export type ParsedWordRow = {
  word: string;
  arabicTranslation: string;
  turkishSentence?: string | null;
  arabicSentence?: string | null;
  difficultyLevel?: string | null;
  vowelHarmonyRule?: string | null;
  tags?: string[];
  categoryName?: string | null;
  categoryIconKey?: string | null;
};

export type ExcelImportResult = {
  rows: ParsedWordRow[];
  meta: {
    detectedWordColumn: number;
    detectedTranslationColumn: number;
  };
};

const parseTags = (raw: unknown): string[] => {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|]/)
    .map((value) => value.trim())
    .filter(Boolean);
};

export function useExcelImport() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File): Promise<ExcelImportResult | null> => {
    setStatus("Parsing…");
    setError(null);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    if (!workbook.SheetNames.length) {
      setError("No worksheets were found in the uploaded file.");
      return null;
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });

    if (rows.length <= 1) {
      setError("The worksheet has no data rows to import.");
      return null;
    }

    const detection = detectKeyColumns(rows[0] ?? []);

    const headers = rows[0]?.map((cell) => String(cell ?? "").trim().toLowerCase()) ?? [];

    const detectColumnIndex = (candidates: string[], fallback: number) => {
      const matched = headers.findIndex((header) =>
        header && candidates.some((candidate) => header.includes(candidate)),
      );
      return matched >= 0 ? matched : fallback;
    };

    const turkishColumnIndex = detectColumnIndex(
      ["usage sentence (turkish)", "turkish", "sentence", "example"],
      4,
    );
    const arabicSentenceIndex = detectColumnIndex(
      ["usage sentence (arabic)", "arabic sentence", "arabic example"],
      5,
    );
    const categoryColumnIndex = detectColumnIndex(["category"], 6);
    const categoryIconIndex = detectColumnIndex(["category icon", "category image"], 7);
    const difficultyColumnIndex = detectColumnIndex(["difficulty", "level"], 8);
    const harmonyColumnIndex = detectColumnIndex(["vowel harmony", "harmony"], 9);
    const tagsColumnIndex = detectColumnIndex(["tags", "labels"], 10);

    const parsedRows: ParsedWordRow[] = rows.slice(1).map((row) => {
      const safeRow = row ?? [];
      const readCell = (index: number) => String(safeRow[index] ?? "").trim();

      return {
        word: readCell(detection.wordColumnIndex),
        arabicTranslation: readCell(detection.translationColumnIndex),
        turkishSentence: readCell(turkishColumnIndex) || null,
        arabicSentence: readCell(arabicSentenceIndex) || null,
        difficultyLevel: readCell(difficultyColumnIndex) || null,
        vowelHarmonyRule: readCell(harmonyColumnIndex) || null,
        tags: parseTags(safeRow[tagsColumnIndex]),
        categoryName: readCell(categoryColumnIndex) || null,
        categoryIconKey: readCell(categoryIconIndex) || null,
      } satisfies ParsedWordRow;
    });

    const validRows = parsedRows.filter((row) => row.word && row.arabicTranslation);
    if (!validRows.length) {
      setError(
        "No valid rows found. Ensure Column B contains the vocabulary words and Column C contains translations.",
      );
      return null;
    }

    setStatus(`Parsed ${validRows.length} rows.`);

    return {
      rows: validRows,
      meta: {
        detectedWordColumn: detection.wordColumnIndex + 1,
        detectedTranslationColumn: detection.translationColumnIndex + 1,
      },
    };
  }, []);

  return {
    parseFile,
    status,
    error,
    reset: () => {
      setStatus(null);
      setError(null);
    },
  };
}
