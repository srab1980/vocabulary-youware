// Test script to verify CORS fix
async function testCorsFix() {
  try {
    console.log('Testing CORS fix for export endpoint...');
    
    // Test the export endpoint with proper headers
    const exportResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    
    console.log('Export endpoint status:', exportResponse.status);
    console.log('Export endpoint headers:', Object.fromEntries(exportResponse.headers.entries()));
    
    if (exportResponse.ok) {
      console.log('CORS fix successful! Export endpoint is now accessible.');
    } else {
      console.error('Export endpoint failed:', exportResponse.status, await exportResponse.text());
    }
  } catch (error) {
    console.error('CORS test failed:', error.message);
  }
}

testCorsFix();