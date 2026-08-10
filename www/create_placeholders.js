const fs = require('fs');
const languages = ['bengali', 'kannada', 'kashmiri', 'konkani', 'malayalam', 'marathi', 'nepali', 'odia', 'punjabi', 'sanskrit', 'tamil', 'telugu'];

languages.forEach(lang => {
  const data = { title: "", chapters: [] };
  fs.writeFileSync(`${lang}.json`, JSON.stringify(data, null, 2));
  console.log(`Created ${lang}.json`);
});