const row = ',미디어아트센터,22.20%,15.41%,69%,31.15%,19.53%,62.71%,28.21%,15.51%,54.98%,24.47%,10.57%,43.20%,19.61%,16.27%,82.98%,20.78%,21.23%,102.16%,20.81%,10.05%,48.32%,14.78%,,,14.44%,,,21.46%,,,18.33%,,,28.46%,,,23.86%,,';

function parseCSVRow(row) {
  const result = [];
  let inQuotes = false;
  let currentWord = '';
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentWord.trim());
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord.trim());
  return result;
}

const cols = parseCSVRow(row);
console.log('Length:', cols.length);
