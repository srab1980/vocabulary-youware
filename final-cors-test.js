// Final comprehensive CORS test
async function finalCORSTest() {
  try {
    console.log("=== Final CORS Test ===");
    
    // Test data
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
      fileName: "final_test_export",
      embedImages: false
    };

    // Test 1: OPTIONS request
    console.log("\n1. Testing OPTIONS request...");
    const optionsResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:5180',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });

    console.log("   OPTIONS Status:", optionsResponse.status);
    const optionsOrigin = optionsResponse.headers.get('access-control-allow-origin');
    console.log("   OPTIONS Allow-Origin:", optionsOrigin);

    // Test 2: POST request
    console.log("\n2. Testing POST request...");
    const postResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5180',
      },
      body: JSON.stringify(testData)
    });

    console.log("   POST Status:", postResponse.status);
    const postOrigin = postResponse.headers.get('access-control-allow-origin');
    console.log("   POST Allow-Origin:", postOrigin);

    if (postResponse.ok) {
      const arrayBuffer = await postResponse.arrayBuffer();
      console.log("   ✅ Export successful! File size:", arrayBuffer.byteLength, "bytes");
      
      if (postOrigin === 'http://127.0.0.1:5180') {
        console.log("   ✅ CORS headers correctly set to specific origin!");
      } else {
        console.log("   ⚠️  CORS origin not set to specific value");
      }
    } else {
      const errorText = await postResponse.text();
      console.log("   ❌ Export failed:", errorText);
    }

    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

finalCORSTest();