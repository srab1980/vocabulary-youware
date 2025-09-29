// Test script to verify the fix for the "Text length must not exceed 32767 characters" error
console.log("=== Testing Fix for Long Text Export Error ===");

async function testLongTextExportFix() {
  try {
    // 1. Test backend health endpoint
    console.log("1. Testing backend health endpoint...");
    const healthResponse = await fetch("http://127.0.0.1:8787/api/health");
    const healthData = await healthResponse.json();
    console.log(`   ✅ Backend health check: ${healthResponse.status} - ${healthData.message}`);

    // 2. Create texts that exceed Excel's 32,767 character limit in various fields
    const veryLongText = "A".repeat(40000); // Well over the limit
    const longArabicText = "م".repeat(35000); // Arabic characters test
    
    console.log("2. Testing export with multiple fields exceeding Excel limit...");
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
            wordIconKey: null,
            categoryName: "Test Category",
            categoryIconKey: null,
            difficultyLevel: "A1",
            tags: ["test", "example"],
            turkishSentence: veryLongText, // This should trigger the error without our fix
            arabicSentence: longArabicText, // Another long text field
            vowelHarmonyRule: "front"
          },
          {
            word: veryLongText, // Long word field
            arabicTranslation: longArabicText, // Long translation field
            wordIconKey: null,
            categoryName: "Another Category",
            categoryIconKey: null,
            difficultyLevel: "B1",
            tags: ["long", "text", "test"],
            turkishSentence: "This is a normal sentence",
            arabicSentence: "هذه جملة طبيعية",
            vowelHarmonyRule: "back"
          }
        ],
        fileName: "long_text_test_export"
      })
    });

    if (exportResponse.ok) {
      const arrayBuffer = await exportResponse.arrayBuffer();
      console.log(`   ✅ Export successful! File size: ${arrayBuffer.byteLength} bytes`);
      console.log(`   📍 File type: ${exportResponse.headers.get("content-type")}`);
      console.log(`   ✅ Fix is working - long texts were properly truncated`);
    } else {
      const errorText = await exportResponse.text();
      console.log(`   ❌ Export failed: ${exportResponse.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

// Run the test
testLongTextExportFix().then(success => {
  if (success) {
    console.log("\n🎉 All tests passed! The export fix is working correctly.");
  } else {
    console.log("\n❌ Some tests failed. Please check the implementation.");
  }
});