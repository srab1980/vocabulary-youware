// Test the OPTIONS request for the export endpoint
async function testOptions() {
  try {
    console.log("Testing OPTIONS request for export endpoint...");
    
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:5178',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });

    console.log("OPTIONS Response status:", response.status);
    console.log("OPTIONS Response headers:", [...response.headers.entries()]);
    
    // Check for CORS headers
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowHeaders = response.headers.get('access-control-allow-headers');
    const allowMethods = response.headers.get('access-control-allow-methods');
    
    console.log("CORS headers in OPTIONS response:");
    console.log("  Access-Control-Allow-Origin:", allowOrigin);
    console.log("  Access-Control-Allow-Headers:", allowHeaders);
    console.log("  Access-Control-Allow-Methods:", allowMethods);

    if (response.ok && allowOrigin && allowHeaders && allowMethods) {
      console.log("✅ OPTIONS request successful with proper CORS headers!");
    } else {
      console.log("❌ OPTIONS request failed or missing CORS headers");
    }
  } catch (error) {
    console.error("❌ OPTIONS test failed with error:", error);
  }
}

testOptions();