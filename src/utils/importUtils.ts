export type ColumnDetectionResult = {
  headers: string[];
  wordColumnIndex: number;
  translationColumnIndex: number;
};

const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase();

export const detectKeyColumns = (headers: unknown[]): ColumnDetectionResult => {
  const normalized = headers.map(normalizeHeader);

  const findIndex = (candidates: string[], fallback: number) => {
    const index = normalized.findIndex((header) =>
      header && candidates.some((candidate) => header.includes(candidate)),
    );
    return index >= 0 ? index : fallback;
  };

  return {
    headers: normalized,
    wordColumnIndex: findIndex(["word", "term", "vocabulary"], 1),
    translationColumnIndex: findIndex(["arabic", "translation", "meaning"], 2),
  };
};
