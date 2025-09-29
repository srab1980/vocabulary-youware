// Test script to simulate exactly what the browser is doing
async function simulateBrowserRequest() {
  try {
    console.log('Simulating browser request to export endpoint...');
    
    // Simulate the exact request that the browser is making
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
        // Add any other headers that might be sent by the browser
      },
      body: JSON.stringify({
        rows: [
          {
            wordId: 1,
            word: "Merhaba",
            arabicTranslation: "مرحبا",
            wordIconKey: "",
            categoryName: "Sample Category",
            categoryIconKey: "",
            difficultyLevel: "beginner",
            tags: [],
            turkishSentence: "Merhaba, nasılsın?",
            arabicSentence: "مرحبا، كيف حالك؟",
            vowelHarmonyRule: ""
          }
        ],
        fileName: "vocabulary_2025-09-29",
        embedImages: true
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Check specifically for the CORS header
    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log('CORS header present:', !!corsHeader);
    if (corsHeader) {
      console.log('CORS header value:', corsHeader);
    }
    
    if (response.ok) {
      console.log('Browser simulation successful!');
      // Try to get the blob to make sure it's a valid Excel file
      const blob = await response.blob();
      console.log('Received blob with size:', blob.size, 'bytes');
      console.log('Blob type:', blob.type);
    } else {
      console.error('Request failed with status:', response.status);
      const text = await response.text();
      console.error('Response body:', text);
    }
  } catch (error) {
    console.error('Browser simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

simulateBrowserRequest();