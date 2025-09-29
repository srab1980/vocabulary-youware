import { z } from "zod";
import type { CreateCategoryInput, CreateWordInput } from "./api";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug must contain characters")
    .max(64, "Slug is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  categoryType: z
    .string()
    .trim()
    .min(1, "Category type is required")
    .max(80, "Category type is too long"),
  description: z
    .string()
    .trim()
    .max(200, "Description is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  iconKey: z
    .string()
    .trim()
    .max(200, "Icon path is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const difficultyEnum = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

const wordSchema = z.object({
  word: z.string().trim().min(1, "Word is required").max(120, "Word is too long"),
  arabicTranslation: z
    .string()
    .trim()
    .min(1, "Arabic translation is required")
    .max(120, "Arabic translation is too long"),
  categoryId: z
    .number({ invalid_type_error: "Category is required" })
    .int("Category must be an integer")
    .positive("Category is required"),
  wordIconKey: z
    .string()
    .trim()
    .max(200, "Icon path is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  turkishSentence: z
    .string()
    .trim()
    .max(220, "Sentence is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  arabicSentence: z
    .string()
    .trim()
    .max(220, "Sentence is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  difficultyLevel: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || difficultyEnum.safeParse(value).success, {
      message: "Difficulty must be one of A1, A2, B1, B2, C1, C2",
    }),
  vowelHarmonyRule: z
    .string()
    .trim()
    .max(120, "Harmony rule is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tags cannot be empty")
        .max(32, "Tag is too long"),
    )
    .max(10, "Maximum 10 tags")
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((value) => (Array.isArray(value) ? value : undefined)),
});

type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
};

const mapZodErrors = (error: z.ZodError): Record<string, string> => {
  const formErrors: Record<string, string> = {};
  error.errors.forEach((issue) => {
    const path = issue.path.join(".");
    if (!formErrors[path]) {
      formErrors[path] = issue.message;
    }
  });
  return formErrors;
};

export const validateCategoryInput = (
  input: Partial<CreateCategoryInput>,
): ValidationResult<CreateCategoryInput> => {
  const result = categorySchema.safeParse(input);
  if (!result.success) {
    return { success: false, errors: mapZodErrors(result.error) };
  }

  const data: CreateCategoryInput = {
    name: result.data.name,
    categoryType: result.data.categoryType,
    slug: result.data.slug,
    description: result.data.description ?? null,
    iconKey: result.data.iconKey ?? null,
  };

  return { success: true, data };
};

export const validateWordInput = (
  input: Partial<CreateWordInput>,
): ValidationResult<CreateWordInput> => {
  const result = wordSchema.safeParse({
    ...input,
    tags: Array.isArray(input.tags) ? input.tags : undefined,
  });

  if (!result.success) {
    return { success: false, errors: mapZodErrors(result.error) };
  }

  const data: CreateWordInput = {
    word: result.data.word,
    arabicTranslation: result.data.arabicTranslation,
    categoryId: result.data.categoryId,
    wordIconKey: result.data.wordIconKey ?? null,
    turkishSentence: result.data.turkishSentence ?? null,
    arabicSentence: result.data.arabicSentence ?? null,
    difficultyLevel: (result.data.difficultyLevel as CreateWordInput["difficultyLevel"]) ?? null,
    vowelHarmonyRule: result.data.vowelHarmonyRule ?? null,
    tags: result.data.tags,
  };

  return { success: true, data };
};
