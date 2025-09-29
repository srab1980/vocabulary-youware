// Test script to check CORS headers on export endpoint
async function checkCorsHeaders() {
  try {
    console.log('Checking CORS headers for export endpoint...');
    
    // Test the export endpoint with proper headers
    const response = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5173'
      },
      body: JSON.stringify({
        rows: [
          {
            word: 'Test',
            arabicTranslation: 'اختبار'
          }
        ],
        fileName: 'test',
        embedImages: true
      })
    });
    
    console.log('Export endpoint status:', response.status);
    console.log('Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (response.ok) {
      console.log('Export endpoint is working correctly.');
    } else {
      console.error('Export endpoint failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

checkCorsHeaders();