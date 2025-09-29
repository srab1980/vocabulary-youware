// Test script to verify export functionality with long text
console.log("=== Testing Export with Long Text ===");

async function testExportWithLongText() {
  try {
    // 1. Test backend health endpoint
    console.log("1. Testing backend health endpoint...");
    const healthResponse = await fetch("http://127.0.0.1:8787/api/health");
    const healthData = await healthResponse.json();
    console.log(`   ✅ Backend health check: ${healthResponse.status} - ${healthData.message}`);

    // 2. Create a very long text that exceeds Excel's 32,767 character limit
    const longText = "A".repeat(35000); // This should trigger the error without our fix
    
    console.log("2. Testing export with long text...");
    const exportResponse = await fetch("http://127.0.0.1:8787/api/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://127.0.0.1:5173"
      },
      body: JSON.stringify({
        rows: [
          {
            word: "test",
            arabicTranslation: "اختبار",
            turkishSentence: longText, // This is the long text that would cause the error
            arabicSentence: "جملة اختبار قصيرة"
          }
        ],
        fileName: "test_export"
      })
    });

    if (exportResponse.ok) {
      const arrayBuffer = await exportResponse.arrayBuffer();
      console.log(`   ✅ Export successful! File size: ${arrayBuffer.byteLength} bytes`);
      console.log(`   📍 File type: ${exportResponse.headers.get("content-type")}`);
    } else {
      const errorText = await exportResponse.text();
      console.log(`   ❌ Export failed: ${exportResponse.status} - ${errorText}`);
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testExportWithLongText();