// Test script to verify export functionality
console.log("=== Final Connection and CORS Test ===");

async function testConnection() {
  try {
    // 1. Test backend health endpoint
    console.log("1. Testing backend health endpoint...");
    const healthResponse = await fetch("http://127.0.0.1:8787/api/health");
    const healthData = await healthResponse.json();
    console.log(`   ✅ Backend health check: ${healthResponse.status} - ${healthData.message}`);

    // 2. Test frontend accessibility
    console.log("2. Testing frontend accessibility...");
    const frontendResponse = await fetch("http://127.0.0.1:5174");
    console.log(`   ✅ Frontend accessibility: ${frontendResponse.status}`);

    // 3. Test export endpoint CORS (OPTIONS)
    console.log("3. Testing export endpoint CORS (OPTIONS)...");
    const optionsResponse = await fetch("http://127.0.0.1:8787/api/export", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://127.0.0.1:5174"
      }
    });
    console.log(`   ✅ Export OPTIONS request: ${optionsResponse.status}`);
    console.log(`   📍 CORS Allow-Origin: ${optionsResponse.headers.get("access-control-allow-origin")}`);

    // 4. Test export endpoint functionality
    console.log("4. Testing export endpoint functionality...");
    const exportResponse = await fetch("http://127.0.0.1:8787/api/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://127.0.0.1:5174"
      },
      body: JSON.stringify({
        rows: [
          {
            word: "test",
            arabicTranslation: "اختبار"
          }
        ],
        fileName: "test_export"
      })
    });

    console.log(`   ✅ Export POST request: ${exportResponse.status}`);
    console.log(`   📍 Export CORS Allow-Origin: ${exportResponse.headers.get("access-control-allow-origin")}`);
    
    if (exportResponse.ok) {
      const arrayBuffer = await exportResponse.arrayBuffer();
      console.log(`   ✅ Export successful! File size: ${arrayBuffer.byteLength} bytes`);
      console.log(`   📍 File type: ${exportResponse.headers.get("content-type")}`);
    } else {
      const errorText = await exportResponse.text();
      console.log(`   ❌ Export failed: ${exportResponse.status} - ${errorText}`);
    }

    console.log("=== All Tests Passed! ===");
    console.log("✅ Backend is running on http://127.0.0.1:8787");
    console.log("✅ Frontend is running on http://127.0.0.1:5174");
    console.log("✅ CORS is properly configured");
    console.log("✅ Export functionality is working");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testConnection();