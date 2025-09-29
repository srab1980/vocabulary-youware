// Simple test of the API client functionality
async function testApiClient() {
  try {
    console.log("Testing API client export functionality...");
    
    // Mock the export input data similar to what the frontend would send
    const exportData = {
      rows: [
        {
          wordId: 1,
          word: "merhaba",
          arabicTranslation: "مرحبا",
          wordIconKey: null,
          categoryName: "Greetings",
          categoryIconKey: null,
          difficultyLevel: "A1",
          tags: ["greeting", "common"],
          turkishSentence: "Merhaba, nasılsın?",
          arabicSentence: "مرحبا، كيف حالك؟",
          vowelHarmonyRule: "front"
        }
      ],
      fileName: "test_vocabulary",
      embedImages: true
    };

    console.log("Sending export request to http://127.0.0.1:8787/api/export");
    
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exportData)
    });

    console.log("Response status:", response.status);
    console.log("Response OK:", response.ok);
    
    if (response.ok) {
      const blob = await response.blob();
      console.log("Export successful!");
      console.log("File size:", blob.size, "bytes");
      console.log("Content type:", blob.type);
      
      // Try to get filename from headers
      const contentDisposition = response.headers.get('content-disposition');
      console.log("Content disposition:", contentDisposition);
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (filenameMatch) {
          console.log("Suggested filename:", filenameMatch[1]);
        }
      }
      
      console.log("Test completed successfully!");
      return true;
    } else {
      const errorText = await response.text();
      console.error("Export failed with status:", response.status);
      console.error("Error response:", errorText);
      return false;
    }
  } catch (error) {
    console.error("Test failed with exception:", error);
    return false;
  }
}

// Run the test
testApiClient().then(success => {
  if (success) {
    console.log("✅ API client test PASSED");
  } else {
    console.log("❌ API client test FAILED");
  }
});