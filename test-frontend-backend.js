// Test script to check frontend-backend connectivity
async function testConnectivity() {
  try {
    console.log('Testing frontend to backend connectivity...');
    
    // Test the health endpoint
    const healthResponse = await fetch('http://127.0.0.1:8787/api/health');
    console.log('Health endpoint status:', healthResponse.status);
    
    if (!healthResponse.ok) {
      console.error('Health endpoint failed:', healthResponse.status, await healthResponse.text());
      return;
    }
    
    const healthData = await healthResponse.json();
    console.log('Health endpoint response:', healthData);
    
    // Test the categories endpoint
    const categoriesResponse = await fetch('http://127.0.0.1:8787/api/categories');
    console.log('Categories endpoint status:', categoriesResponse.status);
    
    if (!categoriesResponse.ok) {
      console.error('Categories endpoint failed:', categoriesResponse.status, await categoriesResponse.text());
      return;
    }
    
    const categoriesData = await categoriesResponse.json();
    console.log('Categories endpoint response:', categoriesData);
    
    console.log('All tests passed! Frontend should be able to connect to backend.');
  } catch (error) {
    console.error('Connectivity test failed:', error.message);
    console.error('This might be due to CORS issues or network configuration.');
  }
}

testConnectivity();