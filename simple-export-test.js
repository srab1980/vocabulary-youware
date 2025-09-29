// Simple test to make an export request
const payload = {
  rows: [
    {
      word: "Test",
      arabicTranslation: "اختبار"
    }
  ],
  fileName: "test",
  embedImages: true
};

fetch('http://127.0.0.1:8787/api/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Headers:', [...response.headers.entries()]);
  return response.blob();
})
.then(blob => {
  console.log('Received blob with size:', blob.size);
})
.catch(error => {
  console.error('Error:', error);
});