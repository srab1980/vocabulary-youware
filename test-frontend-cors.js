// Test CORS from the exact frontend origin
async function testFrontendCORS() {
  try {
    console.log("Testing CORS from frontend origin (http://127.0.0.1:5178)...");
    
    // Test data similar to what the frontend would send
    const testData = {
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
      fileName: "test_export",
      embedImages: false
    };

    console.log("Sending export request from frontend origin...");
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5178',
      },
      body: JSON.stringify(testData)
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);
    
    // Check for CORS headers
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowHeaders = response.headers.get('access-control-allow-headers');
    const allowMethods = response.headers.get('access-control-allow-methods');
    
    console.log("CORS headers in POST response:");
    console.log("  Access-Control-Allow-Origin:", allowOrigin);
    console.log("  Access-Control-Allow-Headers:", allowHeaders);
    console.log("  Access-Control-Allow-Methods:", allowMethods);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log("✅ Export successful! File size:", arrayBuffer.byteLength, "bytes");
      
      if (allowOrigin && allowHeaders && allowMethods) {
        console.log("✅ CORS headers are properly applied!");
      } else {
        console.log("⚠️  Some CORS headers may be missing");
      }
    } else {
      const errorText = await response.text();
      console.log("❌ Export failed:", errorText);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

testFrontendCORS();