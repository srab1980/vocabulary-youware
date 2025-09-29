// Script to add a word with an image for testing export functionality
async function addWordWithImage() {
  try {
    console.log('Adding a word with image for testing...');
    
    // Create a sample category if it doesn't exist
    const categoryResponse = await fetch('http://127.0.0.1:8787/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encrypted-Yw-ID': 'test-user',
        'X-Is-Login': '1'
      },
      body: JSON.stringify({
        name: 'Test Category',
        categoryType: 'vocabulary',
        description: 'Category for testing image export'
      })
    });
    
    const categoryData = await categoryResponse.json();
    console.log('Category response:', categoryData);
    
    let categoryId = 1;
    if (categoryData.code === 0) {
      categoryId = categoryData.data.id;
    }
    
    // Create a sample word with an image URL
    const wordResponse = await fetch('http://127.0.0.1:8787/api/words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encrypted-Yw-ID': 'test-user',
        'X-Is-Login': '1'
      },
      body: JSON.stringify({
        word: 'Hello',
        arabicTranslation: 'مرحبا',
        categoryId: categoryId,
        turkishSentence: 'Hello, how are you?',
        arabicSentence: 'مرحبا، كيف حالك؟',
        difficultyLevel: 'beginner',
        wordIconKey: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/UtteredWords-Hello.svg/220px-UtteredWords-Hello.svg.png'
      })
    });
    
    const wordData = await wordResponse.json();
    console.log('Word creation response:', wordData);
    
    if (wordData.code === 0) {
      console.log('Successfully added word with image!');
    } else {
      console.error('Failed to add word:', wordData.message);
    }
  } catch (error) {
    console.error('Error adding word:', error.message);
  }
}

addWordWithImage();