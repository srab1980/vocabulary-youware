// Script to export vocabulary to an Excel file
import fs from 'fs';
import { pipeline } from 'stream/promises';

async function exportToFile() {
  try {
    console.log('Exporting vocabulary to Excel file...');
    
    // Get words from the API
    const wordsResponse = await fetch('http://127.0.0.1:8787/api/words');
    const wordsData = await wordsResponse.json();
    
    if (wordsData.code !== 0) {
      console.error('Failed to fetch words:', wordsData.message);
      return;
    }
    
    console.log(`Found ${wordsData.data.items.length} words`);
    
    // Prepare export payload with image embedding enabled
    const exportPayload = {
      rows: wordsData.data.items.map(word => ({
        wordId: word.id,
        word: word.word,
        arabicTranslation: word.arabicTranslation,
        wordIconKey: word.wordIconKey || '',
        categoryName: word.categoryName || '',
        categoryIconKey: word.categoryIconKey || '',
        difficultyLevel: word.difficultyLevel || '',
        tags: word.tags || [],
        turkishSentence: word.turkishSentence || '',
        arabicSentence: word.arabicSentence || '',
        vowelHarmonyRule: word.vowelHarmonyRule || ''
      })),
      fileName: 'vocabulary_export',
      embedImages: true
    };
    
    // Call export endpoint
    const exportResponse = await fetch('http://127.0.0.1:8787/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(exportPayload)
    });
    
    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error('Export failed:', exportResponse.status, errorText);
      return;
    }
    
    console.log('Export successful!');
    
    // Save the file
    const arrayBuffer = await exportResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write to file
    fs.writeFileSync('vocabulary-export.xlsx', buffer);
    console.log('Exported file saved as vocabulary-export.xlsx');
    
  } catch (error) {
    console.error('Export failed:', error.message);
  }
}

exportToFile();