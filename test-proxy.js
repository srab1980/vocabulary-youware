async function testProxy() {
  try {
    console.log("Testing proxy connection to Youware API...");
    
    // Test the proxy by making a request to the proxied endpoint
    const response = await fetch('http://127.0.0.1:5177/api/proxy/youware/public/v1/ai/images/generations', {
      method: 'OPTIONS'
    });
    
    console.log("Proxy test response status:", response.status);
    console.log("Proxy test response headers:", [...response.headers.entries()]);
    
    // Check if CORS headers are present
    const allowOrigin = response.headers.get('access-control-allow-origin');
    console.log("Access-Control-Allow-Origin:", allowOrigin);
    
    if (response.ok || response.status === 405) { // 405 is expected for OPTIONS
      console.log("✅ Proxy is working correctly!");
      return true;
    } else {
      console.log("❌ Proxy test failed with status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Proxy test failed with error:", error.message);
    return false;
  }
}

testProxy();