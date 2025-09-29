// Test API key storage functionality
function testApiKeys() {
  try {
    console.log("Testing API key storage...");
    
    // Test storing a Youware API key
    const testYouwareKey = "sk-test-youware-key-12345";
    localStorage.setItem("vocab-youware-api-key", testYouwareKey);
    
    // Test retrieving the Youware API key
    const retrievedYouwareKey = localStorage.getItem("vocab-youware-api-key");
    console.log("Stored Youware API key:", retrievedYouwareKey);
    
    // Test storing an OpenAI API key
    const testOpenAiKey = "sk-test-openai-key-67890";
    localStorage.setItem("vocab-openai-api-key", testOpenAiKey);
    
    // Test retrieving the OpenAI API key
    const retrievedOpenAiKey = localStorage.getItem("vocab-openai-api-key");
    console.log("Stored OpenAI API key:", retrievedOpenAiKey);
    
    // Test clearing keys
    localStorage.removeItem("vocab-youware-api-key");
    localStorage.removeItem("vocab-openai-api-key");
    
    console.log("✅ API key storage test completed successfully!");
    console.log("You can now enter your actual Youware API key in the UI at http://127.0.0.1:5178");
    
  } catch (error) {
    console.error("❌ API key storage test failed:", error.message);
  }
}

testApiKeys();