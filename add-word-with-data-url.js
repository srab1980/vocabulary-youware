// Script to add a word with a data URL image for testing export functionality
async function addWordWithDataUrl() {
  try {
    console.log('Adding a word with data URL image for testing...');
    
    // Create a sample word with a data URL image
    // This is a small red square PNG image encoded as a data URL
    const redSquareDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    
    const wordResponse = await fetch('http://127.0.0.1:8787/api/words', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encrypted-Yw-ID': 'test-user',
        'X-Is-Login': '1'
      },
      body: JSON.stringify({
        word: 'Test',
        arabicTranslation: 'اختبار',
        categoryId: 2,
        turkishSentence: 'This is a test.',
        arabicSentence: 'هذا اختبار.',
        difficultyLevel: 'beginner',
        wordIconKey: redSquareDataUrl
      })
    });
    
    const wordData = await wordResponse.json();
    console.log('Word creation response:', wordData);
    
    if (wordData.code === 0) {
      console.log('Successfully added word with data URL image!');
    } else {
      console.error('Failed to add word:', wordData.message);
    }
  } catch (error) {
    console.error('Error adding word:', error.message);
  }
}

addWordWithDataUrl();