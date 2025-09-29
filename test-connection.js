// Simple test to verify frontend can communicate with backend
async function testConnection() {
  try {
    console.log('Testing connection to backend...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://127.0.0.1:8787/api/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData.message);
    
    // Test categories endpoint
    const categoriesResponse = await fetch('http://127.0.0.1:8787/api/categories');
    const categoriesData = await categoriesResponse.json();
    console.log('Categories count:', categoriesData.data.items.length);
    
    // Test words endpoint
    const wordsResponse = await fetch('http://127.0.0.1:8787/api/words');
    const wordsData = await wordsResponse.json();
    console.log('Words count:', wordsData.data.items.length);
    
    console.log('All tests passed! Backend is working correctly.');
  } catch (error) {
    console.error('Connection test failed:', error.message);
  }
}

testConnection();