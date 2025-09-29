// Test script to verify the authentication fix
console.log("=== Testing Authentication Fix ===");

async function testAuthFix() {
  try {
    // 1. Test backend health endpoint
    console.log("1. Testing backend health endpoint...");
    const healthResponse = await fetch("http://127.0.0.1:8787/api/health");
    const healthData = await healthResponse.json();
    console.log(`   ✅ Backend health check: ${healthResponse.status} - ${healthData.message}`);

    // Generate a unique category name
    const uniqueName = `Test Category ${Date.now()}`;
    
    // 2. Test creating a category (should work without authentication now)
    console.log("2. Testing category creation without authentication...");
    const categoryResponse = await fetch("http://127.0.0.1:8787/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: uniqueName,
        categoryType: "test"
      })
    });

    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json();
      console.log(`   ✅ Category creation successful: ${categoryResponse.status}`);
      console.log(`   📍 Category ID: ${categoryData.data.id}`);
      
      // 3. Test updating the category (should work without authentication now)
      console.log("3. Testing category update without authentication...");
      const updateResponse = await fetch(`http://127.0.0.1:8787/api/categories/${categoryData.data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${uniqueName} - Updated`,
          categoryType: "test"
        })
      });

      if (updateResponse.ok) {
        console.log(`   ✅ Category update successful: ${updateResponse.status}`);
      } else {
        const errorText = await updateResponse.text();
        console.log(`   ❌ Category update failed: ${updateResponse.status} - ${errorText}`);
      }
      
      // 4. Test deleting the category (should work without authentication now)
      console.log("4. Testing category deletion without authentication...");
      const deleteResponse = await fetch(`http://127.0.0.1:8787/api/categories/${categoryData.data.id}`, {
        method: "DELETE"
      });

      if (deleteResponse.ok) {
        console.log(`   ✅ Category deletion successful: ${deleteResponse.status}`);
      } else {
        const errorText = await deleteResponse.text();
        console.log(`   ❌ Category deletion failed: ${deleteResponse.status} - ${errorText}`);
      }
    } else {
      const errorText = await categoryResponse.text();
      console.log(`   ❌ Category creation failed: ${categoryResponse.status} - ${errorText}`);
      
      // If it's a conflict, try to delete and recreate
      if (categoryResponse.status === 409) {
        console.log("   ℹ️  Category already exists, trying to find and delete it first...");
        
        // Get all categories
        const categoriesResponse = await fetch("http://127.0.0.1:8787/api/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const existingCategory = categoriesData.data.items.find(cat => cat.name === uniqueName);
          
          if (existingCategory) {
            console.log(`   📍 Found existing category with ID: ${existingCategory.id}`);
            
            // Delete it
            const deleteResponse = await fetch(`http://127.0.0.1:8787/api/categories/${existingCategory.id}`, {
              method: "DELETE"
            });
            
            if (deleteResponse.ok) {
              console.log("   ✅ Existing category deleted, retrying creation...");
              
              // Retry creation
              const retryResponse = await fetch("http://127.0.0.1:8787/api/categories", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  name: uniqueName,
                  categoryType: "test"
                })
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                console.log(`   ✅ Category creation successful on retry: ${retryResponse.status}`);
                console.log(`   📍 Category ID: ${retryData.data.id}`);
              } else {
                const retryError = await retryResponse.text();
                console.log(`   ❌ Category creation failed on retry: ${retryResponse.status} - ${retryError}`);
              }
            } else {
              const deleteError = await deleteResponse.text();
              console.log(`   ❌ Failed to delete existing category: ${deleteResponse.status} - ${deleteError}`);
            }
          }
        }
      }
    }

    console.log("\n🎉 Authentication fix test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testAuthFix();