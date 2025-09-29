// Script to initialize sample data in the database
// Run with: node init-data.js

async function initSampleData() {
  try {
    // Create a sample category
    const categoryResponse = await fetch('http://127.0.0.1:8787/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encrypted-Yw-ID': 'sample-user-id',
        'X-Is-Login': '1'
      },
      body: JSON.stringify({
        name: 'Sample Category',
        categoryType: 'vocabulary',
        description: 'A sample category for testing'
      })
    });

    const categoryData = await categoryResponse.json();
    console.log('Category created:', categoryData);

    if (categoryData.code === 0) {
      const categoryId = categoryData.data.id;
      
      // Create a sample word
      const wordResponse = await fetch('http://127.0.0.1:8787/api/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Encrypted-Yw-ID': 'sample-user-id',
          'X-Is-Login': '1'
        },
        body: JSON.stringify({
          word: 'Merhaba',
          arabicTranslation: 'مرحبا',
          categoryId: categoryId,
          turkishSentence: 'Merhaba, nasılsın?',
          arabicSentence: 'مرحبا، كيف حالك؟',
          difficultyLevel: 'beginner'
        })
      });

      const wordData = await wordResponse.json();
      console.log('Word created:', wordData);
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}

initSampleData();