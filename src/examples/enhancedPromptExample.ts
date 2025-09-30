// Example of how the enhanced prompt building works

// This is a simplified version of the buildPrompt function for demonstration
const buildPrompt = (label: string, style: string, context?: {
  translation?: string;
  turkishSentence?: string | null;
  arabicSentence?: string | null;
  difficultyLevel?: string | null;
  tags?: string[];
  categoryName?: string;
}) => {
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

// Examples of enhanced prompts
console.log("=== Enhanced Prompt Examples ===");

// Basic prompt
console.log(buildPrompt("elma", "minimalist flat vector icon"));
// Output: Create a minimalist flat vector icon illustrating "elma".

// With translation
console.log(buildPrompt("elma", "minimalist flat vector icon", {
  translation: "apple"
}));
// Output: Create a minimalist flat vector icon illustrating "elma" which means "apple". Focus on visual representation that captures the meaning clearly.

// With category context
console.log(buildPrompt("elma", "minimalist flat vector icon", {
  translation: "apple",
  categoryName: "Fruits"
}));
// Output: Create a minimalist flat vector icon illustrating "elma" which means "apple" in the context of "Fruits". Focus on visual representation that captures the meaning clearly.

// With difficulty level and tags
console.log(buildPrompt("elma", "minimalist flat vector icon", {
  translation: "apple",
  categoryName: "Fruits",
  difficultyLevel: "A1",
  tags: ["food", "healthy"]
}));
// Output: Create a minimalist flat vector icon illustrating "elma" which means "apple" in the context of "Fruits" (difficulty level: A1) related to food, healthy. Focus on visual representation that captures the meaning clearly.

// With sentences
console.log(buildPrompt("elma", "minimalist flat vector icon", {
  translation: "apple",
  turkishSentence: "Elmayı seviyorum.",
  arabicSentence: "أحب التفاحة."
}));
// Output: Create a minimalist flat vector icon illustrating "elma" which means "apple". The word is used in sentences like: Turkish: "Elmayı seviyorum." Arabic: "أحب التفاحة.". Focus on visual representation that captures the meaning clearly.