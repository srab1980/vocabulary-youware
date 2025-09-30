/**
 * Utility functions for working with ComfyUI workflows
 */

// Type for ComfyUI workflow nodes
interface ComfyUINode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: Record<string, any>;
}

// Type for ComfyUI workflow
interface ComfyUIWorkflow {
  [nodeId: string]: ComfyUINode;
}

// Available models in ComfyUI
const AVAILABLE_MODELS = [
  "LTXV\\ltxv-13b-0.9.7-dev-fp8.safetensors",
  "cartoonmix_v10.safetensors",
  "flux1-dev-fp8.safetensors"
];

/**
 * Updates a ComfyUI workflow with the given prompt
 * @param workflow The base workflow to update
 * @param prompt The prompt text to insert into the workflow
 * @returns Updated workflow with the prompt
 */
export const updateWorkflowWithPrompt = (
  workflow: ComfyUIWorkflow,
  prompt: string
): ComfyUIWorkflow => {
  // Deep clone the workflow to avoid mutating the original
  const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // Find the CLIP Text Encode node (usually class_type "CLIPTextEncode")
  // and update its text input with our prompt
  Object.keys(updatedWorkflow).forEach(nodeId => {
    const node = updatedWorkflow[nodeId];
    if (node.class_type === "CLIPTextEncode") {
      // Update the text input - this is typically the first input
      node.inputs.text = prompt;
    }
    
    // Update seed to a random value for variation
    if (node.class_type === "KSampler") {
      node.inputs.seed = Math.floor(Math.random() * 1000000000);
    }
    
    // Update model to use an available model
    if (node.class_type === "CheckpointLoaderSimple") {
      // Use the first available model if the current one isn't available
      if (!AVAILABLE_MODELS.includes(node.inputs.ckpt_name)) {
        node.inputs.ckpt_name = AVAILABLE_MODELS[0];
      }
    }
  });
  
  return updatedWorkflow;
};

/**
 * Creates a basic ComfyUI workflow for text-to-image generation
 * @param prompt The prompt to use for generation
 * @returns A ComfyUI workflow object
 */
export const createBasicWorkflow = (prompt: string): ComfyUIWorkflow => {
  const workflow: ComfyUIWorkflow = {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000),
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
        "ckpt_name": "flux1-dev-fp8.safetensors"
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
        "text": prompt,
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
  
  return workflow;
};

// Your custom workflow template
const CUSTOM_WORKFLOW_TEMPLATE: ComfyUIWorkflow = {
  "1": {
    "inputs": {
      "preview": "",
      "prompt": "",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "max_tokens": 150,
      "response_format": "text",
      "json_schema": "",
      "openai_api_key": "", // Removed hardcoded API key
      "google_api_key": "", // Removed hardcoded API key
      "debug": "no"
    },
    "class_type": "LLMBridgeNode",
    "_meta": {
      "title": "LLM Bridge (OpenAI/Gemini)"
    }
  },
  "2": {
    "inputs": {
      "preview": "",
      "source": [
        "2",
        0
      ]
    },
    "class_type": "PreviewAny",
    "_meta": {
      "title": "Preview Any"
    }
  },
  "3": {
    "inputs": {
      "width": 1328,
      "height": 1328,
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "EmptySD3LatentImage"
    }
  },
  "4": {
    "inputs": {
      "text": " ",
      "clip": [
        "12",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "5": {
    "inputs": {
      "shift": 3.1000000000000005,
      "model": [
        "13",
        0
      ]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": {
      "title": "ModelSamplingAuraFlow"
    }
  },
  "8": {
    "inputs": {
      "seed": 1032067917949260,
      "steps": 20,
      "cfg": 2.5,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": [
        "5",
        0
      ],
      "positive": [
        "10",
        0
      ],
      "negative": [
        "4",
        0
      ],
      "latent_image": [
        "3",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "9": {
    "inputs": {
      "samples": [
        "8",
        0
      ],
      "vae": [
        "11",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "10": {
    "inputs": {
      "text": [
        "2",
        1
      ],
      "clip": [
        "12",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "11": {
    "inputs": {
      "vae_name": "qwen_image_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "12": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "13": {
    "inputs": {
      "model_name": "svdq-fp4_r32-qwen-image.safetensors",
      "cpu_offload": "auto",
      "num_blocks_on_gpu": 1,
      "use_pin_memory": "disable"
    },
    "class_type": "NunchakuQwenImageDiTLoader",
    "_meta": {
      "title": "Nunchaku Qwen-Image DiT Loader"
    }
  },
  "14": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "9",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
};

/**
 * Creates a custom ComfyUI workflow based on your template
 * @param word The word to generate an icon for
 * @param translation The translation of the word
 * @param category The category of the word
 * @param difficultyLevel The difficulty level
 * @param theme The theme/tags related to the word
 * @param turkishSentence Turkish example sentence
 * @param arabicSentence Arabic example sentence
 * @param style The artistic style to use
 * @returns A ComfyUI workflow object
 */
export const createCustomWorkflow = (
  word: string,
  translation: string,
  category: string,
  difficultyLevel: string,
  theme: string,
  turkishSentence: string | null,
  arabicSentence: string | null,
  style: string
): ComfyUIWorkflow => {
  // Deep clone the template
  const workflow = JSON.parse(JSON.stringify(CUSTOM_WORKFLOW_TEMPLATE));
  
  // Update the user prompt in the LLM Bridge node
  workflow["2"].inputs.user_prompt = word;
  
  // Create the detailed prompt for the PreviewAny node
  const detailedPrompt = `Create a skeuomorphic 3D icon illustrating "${word}" which means "${translation}" in the context of "${category}" (difficulty level: ${difficultyLevel}). This word is related to ${theme}. The word is used in sentences like: Turkish: "${turkishSentence || 'N/A'}" Arabic: "${arabicSentence || 'N/A'}". Focus on a realistic object representation that directly conveys the meaning of the word. The icon should be ${style}.`;
  
  // Update the preview in the PreviewAny node
  workflow["1"].inputs.preview = detailedPrompt;
  
  // Update seed to a random value for variation
  workflow["8"].inputs.seed = Math.floor(Math.random() * 1000000000000000);
  
  return workflow;
};

/**
 * Extracts image data from ComfyUI history response
 * @param historyResponse The response from ComfyUI history API
 * @returns Image data URL or null if not found
 */
export const extractImageFromHistory = (historyResponse: any): string | null => {
  try {
    // The structure of ComfyUI history response can vary
    // This is a simplified extraction - you may need to adjust based on your workflow
    
    // Check if the response has any prompt data
    if (!historyResponse || Object.keys(historyResponse).length === 0) {
      console.log("No history data found");
      return null;
    }
    
    // Look for the SaveImage node output
    const promptIds = Object.keys(historyResponse);
    if (!promptIds.length) {
      console.log("No prompt IDs found in history");
      return null;
    }
    
    // Try to find the specific prompt ID we're looking for first
    // If not found, get the most recent prompt
    let promptData;
    for (const promptId of promptIds) {
      if (historyResponse[promptId]?.outputs) {
        promptData = historyResponse[promptId];
        break; // Found one, exit the loop
      }
    }
    
    // If we still don't have prompt data, try the first one
    if (!promptData) {
      const promptId = promptIds[0];
      promptData = historyResponse[promptId];
    }
    
    const outputs = promptData?.outputs;
    
    if (!outputs) {
      console.log("No outputs found in prompt data");
      return null;
    }
    
    // Find the SaveImage node (typically node class "SaveImage")
    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput?.images && nodeOutput.images.length > 0) {
        // Get the first image info
        const imageInfo = nodeOutput.images[0];
        if (imageInfo.filename) {
          // Construct the full URL to the image
          // ComfyUI serves images from /view endpoint
          return `http://127.0.0.1:8188/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}&type=${encodeURIComponent(imageInfo.type || 'output')}`;
        }
      }
    }
    
    console.log("No image found in outputs");
    return null;
  } catch (error) {
    console.error("Error extracting image from ComfyUI history:", error);
    return null;
  }
};

/**
 * Polls ComfyUI for result completion and retrieves the image
 * @param promptId The prompt ID to poll for
 * @param maxAttempts Maximum number of polling attempts
 * @param intervalMs Interval between polling attempts in milliseconds
 * @returns Image data URL or null if not found
 */
export const pollComfyUIForResult = async (
  promptId: string,
  maxAttempts = 60, // Increase max attempts to allow for longer jobs
  intervalMs = 3000 // Increase interval to 3 seconds to reduce load
): Promise<string | null> => {
  // Use our backend proxy instead of direct ComfyUI access to avoid CORS issues
  const API_BASE = import.meta.env.DEV 
    ? "http://127.0.0.1:8787/api" 
    : "https://backend.youware.me/api";
    
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Log polling progress every 10 attempts
      if (attempt % 10 === 0) {
        console.log(`ComfyUI polling attempt ${attempt + 1}/${maxAttempts} for prompt ${promptId}`);
      }
      
      // Poll through our backend proxy
      const response = await fetch(`${API_BASE}/comfyui/result/${promptId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const historyResponse = await response.json();
      
      // Check if the prompt has completed
      // Extract the actual history data from our response wrapper
      const historyData = historyResponse?.data;
      if (historyData && Object.keys(historyData).length > 0) {
        // Extract the image URL from the response
        const imageUrl = extractImageFromHistory(historyData);
        if (imageUrl) {
          console.log(`ComfyUI polling successful for prompt ${promptId}`);
          return imageUrl;
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Error polling ComfyUI (attempt ${attempt + 1}):`, error);
      // Wait before next attempt even on error
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  // Max attempts reached
  throw new Error(`ComfyUI polling timed out after ${maxAttempts} attempts`);
};