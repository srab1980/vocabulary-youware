# ComfyUI Integration Guide

This application includes integration with ComfyUI, allowing you to generate images using custom workflows running on your local machine.

## Prerequisites

1. ComfyUI installed and running on your local machine
2. Required models installed in ComfyUI (e.g., Qwen Image models, VAE, CLIP, etc.)

## Setup

1. Start ComfyUI on your local machine:
   ```bash
   python main.py --port 8188
   ```

2. Ensure ComfyUI is accessible at http://127.0.0.1:8188

3. Start the vocabulary application as usual:
   ```bash
   # In one terminal
   cd backend && npm run dev
   
   # In another terminal
   npm run dev
   ```

## Usage

1. Open the application in your browser (typically http://localhost:5173)

2. In the vocabulary table, you'll see an "Icon provider" section with multiple options including "ComfyUI"

3. Select "ComfyUI" as your icon provider

4. (Optional) If your ComfyUI instance requires authentication, enter your API key

5. Enter your desired icon style in the style prompt field

6. Click "Generate word icons" to generate icons for all words, or click "Generate" on individual words

## Custom Workflows

The application now supports your custom ComfyUI workflow that includes:
- LLM Bridge node for generating detailed prompts
- Qwen Image model for image generation
- Specialized nodes for 3D skeuomorphic icon generation

The workflow automatically populates the LLM Bridge node with:
- The word to generate an icon for
- Context information (translation, category, difficulty level, etc.)
- Example sentences in Turkish and Arabic
- Custom style instructions

## How It Works

1. When you request an icon generation, the application creates a workflow based on your template
2. The word and context information are inserted into the LLM Bridge node
3. The workflow is submitted to your local ComfyUI instance
4. ComfyUI processes the workflow, using the LLM to generate a detailed prompt
5. The Qwen Image model generates the image based on the prompt
6. The generated image is saved and retrieved by the application

## Troubleshooting

### "ComfyUI API request failed" error

- Ensure ComfyUI is running and accessible at http://127.0.0.1:8188
- Check that all required models are installed in ComfyUI:
  - Qwen Image model (svdq-fp4_r32-qwen-image.safetensors)
  - Qwen Image VAE (qwen_image_vae.safetensors)
  - Qwen Image CLIP (qwen_2.5_vl_7b_fp8_scaled.safetensors)
- Verify that API keys are correctly configured in the LLM Bridge node

### Images not generating

- Check the ComfyUI console for any error messages
- Ensure your workflow includes a "SaveImage" node
- Verify that the workflow is correctly connected

### CORS issues

If you encounter CORS issues, you may need to configure ComfyUI to allow requests from your application's origin. This can typically be done by adding the appropriate headers to ComfyUI's response.