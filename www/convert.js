const fs = require('fs');

const content = fs.readFileSync('english.txt', 'utf8');

const lines = content.split('\n').map(l => l.trim()).filter(l => l);

let chapters = [];

let currentChapter = null;

let verses = [];

for (let line of lines) {
  if (line.startsWith('Cover')) {
    currentChapter = { title: "Cover", isCover: true, verses: [] };
    chapters.push(currentChapter);
    continue;
  }
  if (line.startsWith('Title:')) {
    continue;
  }
  if (line.match(/^Page \d+:/) || line.match(/^Page 11:/) || line.match(/^Page 12:/)) {
    if (currentChapter) chapters.push(currentChapter);
    const pageMatch = line.match(/Page (\d+|11|12): (.+)/);
    const pageNumStr = pageMatch[1];
    const pageNum = pageNumStr === 'End' ? 'End' : parseInt(pageNumStr);
    currentChapter = { title: line, pageNumber: pageNum, verses: [] };
    verses = currentChapter.verses;
    continue;
  }
  if (line.startsWith('Back Cover')) {
    if (currentChapter) chapters.push(currentChapter);
    currentChapter = { title: "Back Cover", pageNumber: "End", verses: [] };
    verses = currentChapter.verses;
    continue;
  }
  // Parse verse
  const match = line.match(/^(.+?): (.+)$/);
  if (match) {
    const id = match[1].trim();
    const text = match[2].trim();
    if (id === 'Header') {
      verses.push({ type: "header", text });
    } else {
      verses.push({ id, text });
    }
  } else {
    // Handle continuation or special cases, but assuming all lines match
  }
}

if (currentChapter) chapters.push(currentChapter);

const book = {
  title: "ETERNAL LIFE",
  chapters
};

fs.writeFileSync('english.json', JSON.stringify(book, null, 2));
console.log('Converted to english.json');