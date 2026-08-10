const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/GRESON/myapp/www/helloao_available_translations.json', 'utf8'));

for (let trans of data.translations || []) {
    let lang = (trans.language && trans.language.englishId) ? trans.language.englishId.toLowerCase() : '';
    if (lang.includes('swedish') || lang.includes('arabic')) {
        let license = trans.license ? trans.license.name : 'Unknown';
        console.log(`${lang}: ${trans.id} - ${trans.name} - ${license}`);
    }
}
