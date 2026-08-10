const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

// Define the Para 15 text restoration
const manualRestorations = {
    "hindi.json": "बाइबल इसलिए लिखी गई है ताकि पूरी मानवजाति यीशु मसीह में विश्वास के द्वारा पापों की क्षमा, उद्धार और अनन्त जीवन प्राप्त करे। पवित्र बाइबल केवल किसी विशेष देश, विशेष वर्ग, विशेष भाषा, विशेष रंग के लोगों के लिए नहीं लिखी गई है; लेकिन यह पृथ्वी की हर भाषा, हर जाति, हर रंग और हर राष्ट्र के लोगों के लिए लिखी गई है। आज, पवित्र बाइबल सबसे अधिक मुद्रित पुस्तक के रूप में जानी जाती है, और पवित्र बाइबल लगभग हर प्रमुख भाषा में उपलब्ध है।",
    "nepali.json": "बाइबल यसरी लेखिएको छ कि सम्पूर्ण मानवजातिले येशू ख्रीष्टमा विश्वास गरेर पापको क्षमा, मुक्ति र अनन्त जीवन पाउन सकोस्। पवित्र बाइबल कुनै विशेष देश, विशेष वर्ग, विशेष भाषा, विशेष रङका मानिसहरूका लागि मात्र लेखिएको होइन; तर यो पृथ्वीको हरेक भाषा, हरेक जाति, हरेक रङ र हरेक राष्ट्रका मानिसहरूका लागि लेखिएको हो। आज, पवित्र बाइबल सबैभन्दा बढी छापिएको पुस्तकको रूपमा चिनिन्छ, र पवित्र बाइबल लगभग हरेक प्रमुख भाषामा उपलब्ध छ।",
    "marathi.json": "बायबल यासाठी लिहिले गेले आहे की संपूर्ण मानवी जातीला येशू ख्रिस्तावर विश्वास ठेवून पापांची क्षमा, तारण आणि अनंत जीवन मिळावे. पवित्र बायबल फक्त एखाद्या विशिष्ट देशाला, विशिष्ट वर्गाला, विशिष्ट भाषेला, विशिष्ट रंगाच्या लोकांसाठी लिहिले गेले नाही; तर ते पृथ्वीवरील प्रत्येक भाषेच्या, प्रत्येक जातीच्या, प्रत्येक रंगाच्या आणि प्रत्येक राष्ट्राच्या लोकांसाठी लिहिले गेले आहे. आज, पवित्र बायबल सर्वात जास्त छापले जाणारे पुस्तक म्हणून ओळखले जाते, आणि पवित्र बायबल जवळजवळ प्रत्येक मुख्य भाषेत उपलब्ध आहे.",
    "konkani.json": "Povitr Pustok boroilam ki sorv monxa-kullak Jezu Kristacher visvas dovrun papanchi bogsonnem, taronn ani sasannachem jivon mellchem. Povitr Pustok fokot eka visex desak, visexvorgak, visex bhaxek, vo visex rongachea lokank boroilam oxem nhoi; punn tem prithvier aslolea dor eka bhaxechea, dor eka zatichea, dor eka rongachea ani dor eka raxttrachea lokank boroilam. Aiz, Povitr Pustok sobar bhaxenamni uplobdh asa.", // Best effort / Placeholder. User can correct.
    "sanskrit.json": "बाउबल् इति ग्रन्थः एतदर्थं लिखितः अस्ति यत् सम्पूर्णमानवजातिः येशुख्रिस्ते विश्वस्य पापानां क्षमां, मोक्षं तथा च अनन्तजीवनं प्राप्नुयात्। पवित्रबाउबल् केवलं कस्यचित् विशिष्टदेशस्य, विशिष्टवर्गस्य, विशिष्टभाषायाः, विशिष्टवर्णस्य जनानां कृते न लिखितम् अस्ति; अपि तु एतत् पृथिव्याः प्रत्येकस्याः भाषायाः, प्रत्येकस्याः जातेः, प्रत्येकस्य वर्णस्य तथा च प्रत्येकस्य राष्ट्रस्य जनानां कृते लिखितम् अस्ति। अद्य, पवित्रबाउबल् सर्वाधिकमुद्रितग्रन्थरूपेण ज्ञायते, तथा च पवित्रबाउबल् प्रायः प्रत्येकस्यां प्रमुखभाषायाम् उपलब्धम् अस्ति।" // Converted roughly to Sanskrit context or Placeholder.
};

// Title corrections map (Removing " and Author" equivalent)
const fileTitleFixes = {
    "arabic.json": "الصفحة 12: الخاتمة",
    "assamese.json": "পৃষ্ঠা 12: সিদ্ধান্ত",
    "bengali.json": "পৃষ্ঠা ১২: উপসংহার",
    "bhutanese.json": "ཤོག་གྲངས་ ༡༢: མཇུག་བསྡུ་",
    "burmese.json": "စာမျက်နှာ ၁၂ - နိဂုံး",
    "chinese.json": "第十二页：结论",
    "gujarati.json": "પૃષ્ઠ 12: નિષ્કર્ષ",
    "hindi.json": "पृष्ठ 12: निष्कर्ष",
    "japanese.json": "12ページ：結論",
    "kannada.json": "ಪುಟ 12: ತೀರ್ಮಾನ",
    "kashmiri.json": "पान १२: निश्कर्ष",
    "konkani.json": "पान १२: निश्कर्ष",
    "korean.json": "12페이지: 결론",
    "malayalam.json": "പേജ് 12: ഉപസംഹാരവും",
    "marathi.json": "पान १२: निष्कर्ष",
    "mongolian.json": "12-р хуудас: Дүгнэлт",
    "nepali.json": "पृष्ठ १२: निष्कर्ष",
    "odia.json": "ପୃଷ୍ଠା 12: ସିଦ୍ଧାନ୍ତ",
    "oromo.json": "Fuula 12: Xumura",
    "punjabi.json": "ਪੰਨਾ 12: ਸਿੱਟਾ",
    "romanian.json": "Pagina 12: Concluzie",
    "sanskrit.json": "पृष्ठम् १२: निष्कर्षः",
    "tamil.json": "பக்கம் 12: முடிவுரை",
    "telugu.json": "పేజీ 12: ముగింపు",
    "tibetan.json": "ཤོག་ལྷེ་ ༡༢: མཇུག་བསྡོམས་",
    "urdu.json": "صفحہ 12: نتیجہ",
    "english.json": "Page 12: Conclusion",
    "hebrew.json": "עמוד 12: מסקנה",
    "czech.json": "Strana 12: Závěr",
    "dutch.json": "Pagina 12: Conclusie",
    "french.json": "Page 12 : Conclusion",
    "german.json": "Seite 12: Fazit",
    "greek.json": "Σελίδα 12: Συμπέρασμα",
    "hungarian.json": "12. oldal: Következtetés",
    "igbo.json": "Peeji 12: Mmechi",
    "indonesian.json": "Halaman 12: Kesimpulan",
    "italian.json": "Pagina 12: Conclusione",
    "malay.json": "Halaman 12: Kesimpulan",
    "norwegian.json": "Side 12: Konklusjon",
    "polish.json": "Strona 12: Wnioski",
    "portuguese.json": "Página 12: Conclusão",
    "romanian.json": "Pagina 12: Concluzie",
    "russian.json": "Страница 12: Заключение",
    "somali.json": "Bogga 12: Gunaanad",
    "spanish.json": "Página 12: Conclusión",
    "swahili.json": "Ukurasa 12: Hitimisho",
    "swedish.json": "Sida 12: Slutsats",
    "tagalog.json": "Pahina 12: Konklusyon",
    "thai.json": "หน้า 12: บทสรุป",
    "turkish.json": "Sayfa 12: Sonuç",
    "vietnamese.json": "Trang 12: Kết luận",
    "yoruba.json": "Oju-iwe 12: Ipari"
};

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // 1. Restore Content (Para 15) if broken
        if (manualRestorations[file] && data.chapters[11].verses[0].id === 'AuthorInfo') {
            data.chapters[11].verses = [{
                "id": "Para 15",
                "text": manualRestorations[file]
            }];
            modified = true;
            console.log(`Content RESTORED for ${file}`);
        } else if (file === 'konkani.json' && data.chapters[11].verses[0].id === 'AuthorInfo') {
            // Use placeholder
            data.chapters[11].verses = [{
                "id": "Para 15",
                "text": manualRestorations['konkani.json']
            }];
            modified = true;
            console.log(`Content RESTORED (Placeholder) for ${file}`);
        } else if (file === 'sanskrit.json' && data.chapters[11].verses[0].id === 'AuthorInfo') {
            // Use placeholder
            data.chapters[11].verses = [{
                "id": "Para 15",
                "text": manualRestorations['sanskrit.json']
            }];
            modified = true;
            console.log(`Content RESTORED (Placeholder) for ${file}`);
        }

        // 2. Fix Title
        if (fileTitleFixes[file] && data.chapters[11].title !== fileTitleFixes[file]) {
            data.chapters[11].title = fileTitleFixes[file];
            modified = true;
        }

        // General fallback for others not in map?
        // Most are in map now.

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});
