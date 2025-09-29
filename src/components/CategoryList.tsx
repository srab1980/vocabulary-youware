import { useEffect, useMemo, useState } from "react";
import { useCategoriesStore } from "../store/useCategoriesStore";
import type { CreateCategoryInput } from "../types/api";
import { validateCategoryInput } from "../types/validation";

type CategoryListProps = {
  onSelect: (categoryId: number | null) => void;
  selectedId: number | null;
};

export function CategoryList({ onSelect, selectedId }: CategoryListProps) {
  const {
    items,
    isLoading,
    error,
    ensureCategories,
    createCategory,
  } = useCategoriesStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<CreateCategoryInput>({
    name: "",
    categoryType: "",
    slug: "",
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void ensureCategories();
  }, [ensureCategories]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = a.word_count ?? 0;
        const right = b.word_count ?? 0;
        if (left === right) return a.name.localeCompare(b.name);
        return right - left;
      }),
    [items],
  );

  const handleOpenForm = () => {
    setFormValues({ name: "", slug: "", categoryType: "", description: "" });
    setFieldErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setIsFormOpen(true);
  };

  const runValidation = (values: CreateCategoryInput) => {
    const result = validateCategoryInput(values);
    if (!result.success) {
      setFieldErrors(result.errors ?? {});
    } else {
      setFieldErrors({});
    }
    return result;
  };

  const setValue = <K extends keyof CreateCategoryInput>(key: K, value: CreateCategoryInput[K]) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value ?? "" } as CreateCategoryInput;
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
    const created = await createCategory(validation.data);
    setIsSubmitting(false);
    if (created) {
      onSelect(created.id);
      setIsFormOpen(false);
      setFieldErrors({});
      setTouched({});
      setSubmitAttempted(false);
    }
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-neutral-200/60 bg-white/70 p-6 shadow-sm backdrop-blur">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Categories</h2>
          <p className="text-sm text-neutral-500">Organize vocabulary clusters.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenForm}
          className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900"
        >
          + New
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="animate-pulse text-sm text-neutral-500">Loading…</span>
          </div>
        )}

        {error && !isLoading ? (
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <ul className="space-y-2 overflow-y-auto pr-1">
            <li>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                  selectedId === null
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100/60 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                <span className="text-sm font-medium">All words</span>
              </button>
            </li>
            {sortedItems.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onSelect(category.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    selectedId === category.id
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100/60 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{category.name}</p>
                    <p className="text-xs text-neutral-500">{category.category_type}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                    {category.word_count ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Create category</h3>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-neutral-800"
                onClick={() => setIsFormOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="text-neutral-600">Name</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.name && (submitAttempted || touched.name)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.name}
                  onChange={(event) => setValue("name", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, name: true }));
                    runValidation(formValues);
                  }}
                />
                {fieldErrors.name && (submitAttempted || touched.name) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.name}</p>
                )}
              </label>
              <label className="block text-sm">
                <span className="text-neutral-600">Type</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.categoryType && (submitAttempted || touched.categoryType)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.categoryType}
                  onChange={(event) => setValue("categoryType", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, categoryType: true }));
                    runValidation(formValues);
                  }}
                  placeholder="e.g. adjective"
                />
                {fieldErrors.categoryType && (submitAttempted || touched.categoryType) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.categoryType}</p>
                )}
              </label>
              <label className="block text-sm">
                <span className="text-neutral-600">Slug (optional)</span>
                <input
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.slug && (submitAttempted || touched.slug)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.slug ?? ""}
                  onChange={(event) => setValue("slug", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, slug: true }));
                    runValidation(formValues);
                  }}
                  placeholder="auto-generated when empty"
                />
                {fieldErrors.slug && (submitAttempted || touched.slug) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.slug}</p>
                )}
              </label>
              <label className="block text-sm">
                <span className="text-neutral-600">Description</span>
                <textarea
                  className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-700/10 ${
                    fieldErrors.description && (submitAttempted || touched.description)
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-neutral-300 focus:border-neutral-500"
                  }`}
                  value={formValues.description ?? ""}
                  onChange={(event) => setValue("description", event.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, description: true }));
                    runValidation(formValues);
                  }}
                  rows={3}
                />
                {fieldErrors.description && (submitAttempted || touched.description) && (
                  <p className="mt-1 text-xs text-rose-500">{fieldErrors.description}</p>
                )}
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {isSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
