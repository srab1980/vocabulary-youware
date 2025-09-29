# API Directory

This directory documents how the frontend should talk to the deployed Youware Backend located at `https://backend.youware.me`.

## Base Configuration

- **Base URL**: `https://backend.youware.me/api`
- All requests must include `Content-Type: application/json` when a body is sent.
- The platform automatically injects authentication headers (`X-Encrypted-Yw-ID`, `X-Is-Login`). Do **not** add extra headers.

## Endpoints

### GET `/categories`
Fetch list of categories.

**Query params**
- `categoryType` (optional) — filter by `category_type`.

**Response**
```jsonc
{
  "code": 0,
  "message": "categories fetched",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "adjective",
        "slug": "adjective",
        "category_type": "adjective",
        "description": null,
        "icon_key": null,
        "word_count": 12,
        "created_at": "2025-09-27T09:21:00.000Z",
        "updated_at": "2025-09-27T09:21:00.000Z"
      }
    ]
  }
}
```

### GET `/categories/:id`
Fetch a single category (includes `word_count`).

### POST `/categories`
Create a category (requires authenticated user).

**Body**
```json
{
  "name": "Adjective",
  "slug": "adjective", // optional, auto-slugified when omitted
  "categoryType": "adjective",
  "description": "Descriptive words",
  "iconKey": "uploads/categories/adjective.svg"
}
```

### PUT `/categories/:id`
Update a category. Send only fields to modify (`name`, `slug`, `categoryType`, `description`, `iconKey`).

### DELETE `/categories/:id`
Delete a category (cascades to words via foreign key).

---

### GET `/words`
List words with pagination and filters.

**Query params**
- `page` (default `1`)
- `pageSize` (default `20`, max `100`)
- `categoryId`
- `difficultyLevel`
- `vowelHarmonyRule`
- `search` (matches `word` or `arabic_translation`)

**Response**
```jsonc
{
  "code": 0,
  "message": "words fetched",
  "data": {
    "items": [
      {
        "id": 42,
        "word": "alçak",
        "arabicTranslation": "منخفض",
        "wordIconKey": null,
        "turkishSentence": "Alçak bir duvar var.",
        "arabicSentence": "يوجد جدار منخفض.",
        "difficultyLevel": "A2",
        "vowelHarmonyRule": "I-type (back)",
        "categoryId": 1,
        "categoryName": "Adjective",
        "categorySlug": "adjective",
        "categoryType": "adjective",
        "tags": ["descriptive", "basic"],
        "createdAt": "2025-09-27T09:23:00.000Z",
        "updatedAt": "2025-09-27T09:23:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 200,
      "totalPages": 10
    }
  }
}
```

### GET `/words/:id`
Fetch a single word with tags and category metadata.

### POST `/words`
Create a word (requires auth).

**Body**
```json
{
  "word": "alçak",
  "arabicTranslation": "منخفض",
  "categoryId": 1,
  "wordIconKey": "uploads/words/alcak.png",
  "turkishSentence": "Alçak bir duvar var.",
  "arabicSentence": "يوجد جدار منخفض.",
  "difficultyLevel": "A2",
  "vowelHarmonyRule": "I-type (back)",
  "tags": ["descriptive", "basic"]
}
```

### PUT `/words/:id`
Update word fields (same keys as POST). Include `tags` to replace the tag list; omit to leave unchanged.

### DELETE `/words/:id`
Remove a word.

---

## Fetch Helpers (example)

```ts
const API_BASE = "https://backend.youware.me/api";

export async function fetchWords(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE}/words?${query.toString()}`);
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message ?? "Failed to fetch words");
  }
  return payload.data;
}
```

Keep all asset references (`wordIconKey`, `iconKey`) as R2 keys; request fresh presigned download URLs from backend when rendering images.
