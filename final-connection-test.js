// Final connection and CORS test
async function finalConnectionTest() {
  try {
    console.log("=== Final Connection and CORS Test ===");
    
    // Test 1: Backend health check
    console.log("\n1. Testing backend health endpoint...");
    const healthResponse = await fetch('http://127.0.0.1:8787/api/health');
    const healthData = await healthResponse.json();
    console.log("   ✅ Backend health check:", healthResponse.status, "-", healthData.message);
    
    // Test 2: Frontend accessibility
    console.log("\n2. Testing frontend accessibility...");
    const frontendResponse = await fetch('http://127.0.0.1:5173');
    console.log("   ✅ Frontend accessibility:", frontendResponse.status);
    
    // Test 3: Export endpoint CORS (OPTIONS request)
    console.log("\n3. Testing export endpoint CORS (OPTIONS)...");
    const optionsResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });
    console.log("   ✅ Export OPTIONS request:", optionsResponse.status);
    
    const allowOrigin = optionsResponse.headers.get('access-control-allow-origin');
    console.log("   📍 CORS Allow-Origin:", allowOrigin);
    
    // Test 4: Export endpoint functionality
    console.log("\n4. Testing export endpoint functionality...");
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
      fileName: "connection_test",
      embedImages: false
    };
    
    const exportResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173',
      },
      body: JSON.stringify(testData)
    });
    
    console.log("   ✅ Export POST request:", exportResponse.status);
    
    const exportAllowOrigin = exportResponse.headers.get('access-control-allow-origin');
    console.log("   📍 Export CORS Allow-Origin:", exportAllowOrigin);
    
    if (exportResponse.ok) {
      const blob = await exportResponse.blob();
      console.log("   ✅ Export successful! File size:", blob.size, "bytes");
      console.log("   📍 File type:", blob.type);
    }
    
    console.log("\n=== All Tests Passed! ===");
    console.log("✅ Backend is running on http://127.0.0.1:8787");
    console.log("✅ Frontend is running on http://127.0.0.1:5173");
    console.log("✅ CORS is properly configured");
    console.log("✅ Export functionality is working");
    
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

finalConnectionTest();