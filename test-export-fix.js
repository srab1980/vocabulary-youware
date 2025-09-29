// Test the export endpoint fix
async function testExportFix() {
  try {
    console.log("Testing export endpoint with CORS fix...");
    
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

    console.log("Sending export request...");
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);
    
    // Check for CORS headers
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowHeaders = response.headers.get('access-control-allow-headers');
    const allowMethods = response.headers.get('access-control-allow-methods');
    
    console.log("CORS headers:");
    console.log("  Access-Control-Allow-Origin:", allowOrigin);
    console.log("  Access-Control-Allow-Headers:", allowHeaders);
    console.log("  Access-Control-Allow-Methods:", allowMethods);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log("✅ Export successful! File size:", arrayBuffer.byteLength, "bytes");
      console.log("Content-Type:", response.headers.get('content-type'));
      console.log("Content-Disposition:", response.headers.get('content-disposition'));
      
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

testExportFix();