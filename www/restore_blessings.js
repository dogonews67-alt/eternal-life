const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

// Translations for "May the Lord bless you abundantly, be blessed with the eternal life and be a citizen of the kingdom of HEAVEN."
const translations = {
    "arabic.json": "ليباركك الرب بغزارة، ولتتبارك بالحياة الأبدية وتكن مواطناً في ملكوت السماوات.",
    "assamese.json": "প্ৰભুৱে আপোনাক প্ৰচুৰ আশীৰ্বাদ কৰক, অনন্ত জীৱনৰ সৈতে ধন্য হওক আৰু স্বৰ্গৰ ৰাজ্যৰ নাগৰিক হওক।",
    "bengali.json": "প্রভু আপনাকে প্রচুর আশীর্বাদ করুন, অনন্ত জীবনের আশীর্বাদ পান এবং স্বর্গরাজ্যের নাগরিক হন।",
    "bhutanese.json": "གཙོ་བོས་ཁྱེད་ལ་བྱིན་གྱིས་རློབས་པར་ཤོག །དུས་གཏན་གྱི་ཚེ་སྲོག་གིས་བྱིན་གྱིས་རློབས་པ་དང་། ནམ་མཁའི་རྒྱལ་ཁམས་ཀྱི་མི་སེར་ཞིག་ཏུ་འགྱུར་བར་ཤོག",
    "burmese.json": "သခင်ဘုရားသည် သင့်ကို ကြွယ်ဝစွာ ကောင်းချီးပေးပါစေသော။ ထာဝရအသက်နှင့် ပြည့်စုံ၍ ကောင်းကင်နိုင်ငံတော်၏ နိုင်ငံသားဖြစ်ပါစေသော။",
    "chinese.json": "愿主大大赐福给你，愿你得着永生，成为天国的子民。",
    "czech.json": "Kéž vám Pán hojně žehná, buďte požehnáni věčným životem a staňte se občanem království NEBESKÉHO.",
    "dutch.json": "Moge de Heer u rijkelijk zegenen, gezegend zijn met het eeuwige leven en een burger zijn van het koninkrijk der HEMELEN.",
    "french.json": "Que le Seigneur vous bénisse abondamment, soyez béni par la vie éternelle et soyez un citoyen du royaume des CIEUX.",
    "german.json": "Möge der Herr Sie reichlich segnen, gesegnet sein mit dem ewigen Leben und ein Bürger des HIMMELREICHS sein.",
    "greek.json": "Είθε ο Κύριος να σας ευλογεί πλούσια, να είστε ευλογημένοι με την αιώνια ζωή και να γίνετε πολίτης της βασιλείας των ΟΥΡΑΝΩΝ.",
    "gujarati.json": "પ્રભુ તમને પુષ્કળ આશીર્વાદ આપે, અનંત જીવનથી આશીર્વાદિત થાઓ અને સ્વર્ગના રાજ્યના નાગરિક બનો.",
    "hebrew.json": "יהי רצון שהאדון יברך אותך בשפע, תבורך בחיי נצח ותהיה אזרח מלכות השמיים.",
    "hungarian.json": "Az Úr áldjon meg téged bőségesen, légy megáldva az örök élettel, és légy a MENNYEK országának polgára.",
    "igbo.json": "Ka Onye-nwe gozie gị nke ukwuu, ka e jiri ndụ ebighị ebi gozie gị, bụrụkwa nwa amaala nke alaeze ELIGWE.",
    "indonesian.json": "Semoga Tuhan memberkati Anda dengan berlimpah, diberkati dengan hidup yang kekal dan menjadi warga kerajaan SURGA.",
    "italian.json": "Che il Signore ti benedica abbondantemente, sii benedetto con la vita eterna e sii cittadino del regno dei CIELI.",
    "japanese.json": "主があなたを豊かに祝福し、永遠の命に恵まれ、天の御国の国民となりますように。",
    "kannada.json": "ಕರ್ತನು ನಿಮ್ಮನ್ನು ಸಮೃದ್ಧವಾಗಿ ಆಶೀರ್ವದಿಸಲಿ, ಶಾಶ್ವತ ಜೀವನದೊಂದಿಗೆ ಆಶೀರ್ವದಿಸಲ್ಪಡಲಿ ಮತ್ತು ಸ್ವರ್ಗದ ಸಾಮ್ರಾಜ್ಯದ ಪ್ರಜೆಯಾಗಿರಿ.",
    "kashmiri.json": "खॊदावंद करिन चॖ स्यठाह बरकत, हमेशाकिस ज़िंदगी सूत्य आस बरकतवार तॖ जन्नतुक शहरी बन।",
    "korean.json": "주님께서 당신에게 풍성히 복을 주시고, 영생의 복을 누리며 천국의 시민이 되시기를 빕니다.",
    "malay.json": "Semoga Tuhan memberkati anda dengan limpahnya, diberkati dengan kehidupan kekal dan menjadi warganegara kerajaan SYURGA.",
    "malayalam.json": "കർത്താവ് നിങ്ങളെ സമൃദ്ധമായി അനുഗ്രഹിക്കട്ടെ, നിത്യജീവൻ പ്രാപിക്കാനും സ്വർഗ്ഗരാജ്യത്തിലെ പൗരനാകാനും ഇടയാകട്ടെ.",
    "mongolian.json": "Эзэн таныг rүнээр ивээх болтугай, мөнх амьдралаар ерөөгдөж, ТЭНГЭРИЙН хаант улсын иргэн болох болтугай.",
    "norwegian.json": "Må Herren velsigne deg rikelig, bli velsignet med det evige liv og være en borger av HIMMELENS rike.",
    "odia.json": "ପ୍ରଭୁ ଆପଣଙ୍କୁ ପ୍ରଚୁର ଆଶୀର୍ବାଦ କରନ୍ତୁ, ଅନନ୍ତ ଜୀବନ ସହିତ ଆଶୀର୍ବାଦ ପ୍ରାପ୍ତ ହୁଅନ୍ତୁ ଏବଂ ସ୍ୱର୍ଗ ରାଜ୍ୟର ନାଗରିକ ହୁଅନ୍ତୁ |",
    "oromo.json": "Gooftaan baay'isee si haa eebbisu, jireenya barabaraan haa eebbifamtu, lammii mootummaa SAMIIS haa taatu.",
    "polish.json": "Niech Pan ci błogosławi obficie, bądź błogosławiony życiem wiecznym i bądź obywatelem królestwa NIEBIOS.",
    "portuguese.json": "Que o Senhor te abençoe abundantemente, sejas abençoado com a vida eterna e sejas um cidadão do reino dos CÉUS.",
    "punjabi.json": "ਪ੍ਰਭੂ ਤੁਹਾਨੂੰ ਭਰਪੂਰ ਅਸੀਸ ਦੇਵੇ, ਸਦੀਪਕ ਜੀਵਨ ਦੀ ਬਖਸ਼ਿਸ਼ ਹੋਵੇ ਅਤੇ ਸਵਰਗ ਦੇ ਰਾਜ ਦੇ ਨਾਗਰਿਕ ਬਣੋ।",
    "romanian.json": "Domnul să te binecuvânteze din belșug, să fii binecuvântat cu viața veșnică și să fii cetățean al împărăției CERURILOR.",
    "russian.json": "Да благословит вас Господь обильно, да будете благословенны жизнью вечной и станете гражданином Царства НЕБЕСНОГО.",
    "somali.json": "Rabbigu aad ha kuugu barakeeyo,ana laguugu barakeeyo nolosha weligeed ah, oo aad noqoto muwaadin boqortooyada JANADA.",
    "spanish.json": "Que el Señor te bendiga abundantemente, seas bendecido con la vida eterna y seas ciudadano del reino de los CIELOS.",
    "swahili.json": "Bwana akubariki sana, ubarikiwe na uzima wa milele na uwe raia wa ufalme wa MBINGUNI.",
    "swedish.json": "Må Herren välsigna dig rikligt, bli välsignad med det eviga livet och vara en medborgare i HIMMELENS rike.",
    "tagalog.json": "Pagpalain ka nawa ng Panginoon nang sagana, pagpalain ng buhay na walang hanggan at maging mamamayan ng kaharian ng LANGIT.",
    "tamil.json": "கர்த்தர் உங்களை abundantly ஆசீர்வதிப்பாராக, நித்திய ஜீவனைப் பெற்று, பரலோகராஜ்யத்தின் குடிமகനായി இருப்பீராக.",
    "telugu.json": "ప్రభువు మిమ్మల్ని സമృద్ధిగా ఆశీర్వదించుగాక, నిత్యజీవంతో ఆశీర్వదించబడండి మరియు పరలోక రాజ్య పౌరుడిగా ఉండండి.",
    "thai.json": "ขอพระเจ้าอวยพรท่านอย่างล้นเหลือ ขอให้ท่านได้รับพรด้วยชีวิตนิรันดร์ และเป็นพลเมืองของอาณาจักรแห่งสวรรค์",
    "tibetan.json": "གཙོ་བོས་ཁྱེད་ལ་བྱིན་གྱིས་རློབས་པར་ཤོག ཚེ་མཐའ་མེད་པའི་བྱིན་རླབས་ཐོབ་པ་དང་། ནམ་མཁའི་རྒྱལ་ཁམས་ཀྱི་མི་སེར་དུ་གྱུར་ཅིག",
    "turkish.json": "Rab sizi bol bol kutsasın, sonsuz yaşamla kutsanın ve GÖKLERİN krallığının bir vatandaşı olun.",
    "urdu.json": "خداوند آپ کو کثرت سے برکت دے، ہمیشہ کی زندگی سے نوازا جائے اور آسمان کی بادشاہی کا شہری بنے۔",
    "vietnamese.json": "Nguyện xin Chúa ban phước dồi dào cho bạn, được ban phước với sự sống đời đời và trở thành công dân của vương quốc THIÊN ĐÀNG.",
    "yoruba.json": "Ki Oluwa bukun fun o ni opolopo, ki o si ni ibukun pẹlu iye ainipẹkun ki o si jẹ ara ilu ti ijọba ỌRUN."
};

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json') && translations[file]) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Find Chapter 13 (index 12 usually, but identified by "AuthorInfo")
        // No, we know specifically where it is from previous step (Chapter 12, index 12).
        // Or search for title containing "Author" / "लेखक" etc?
        // Let's rely on finding AuthorInfo.

        let authorChapter = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorChapter) {
            // Check if Blessing already exists
            const existingBlessing = authorChapter.verses.find(v => v.id === 'Blessing');

            if (!existingBlessing) {
                // Insert Blessing at the beginning of verses
                const blessingVerse = {
                    "id": "Blessing",
                    "text": translations[file]
                };

                // Add to start
                authorChapter.verses.unshift(blessingVerse);
                modified = true;
            }
        } else {
            console.log(`Could not find AuthorInfo in ${file}`);
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Restored Blessing in ${file}`);
        }
    }
});
