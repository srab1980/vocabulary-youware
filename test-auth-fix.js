// Test script to verify the authentication fix
console.log("=== Testing Authentication Fix ===");

async function testAuthFix() {
  try {
    // 1. Test backend health endpoint
    console.log("1. Testing backend health endpoint...");
    const healthResponse = await fetch("http://127.0.0.1:8787/api/health");
    const healthData = await healthResponse.json();
    console.log(`   ✅ Backend health check: ${healthResponse.status} - ${healthData.message}`);

    // 2. Test creating a category (should work without authentication now)
    console.log("2. Testing category creation without authentication...");
    const categoryResponse = await fetch("http://127.0.0.1:8787/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Test Category",
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
          name: "Updated Test Category",
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
    }

    console.log("\n🎉 Authentication fix test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testAuthFix();