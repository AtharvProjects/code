import { ClueStyle, WordClue, Clues } from '../types';
import { getMarathiWordClue } from './marathiDictionary';
import { getGraphemes } from './crosswordService';

export interface ClueStyleOption {
    id: ClueStyle;
    name: string;
    englishLabel: string;
    icon: string;
    badge: string;
    description: string;
    exampleWord: string;
    exampleClue: string;
    difficulty: string;
}

export const CLUE_STYLE_OPTIONS: ClueStyleOption[] = [
    {
        id: 'cryptic',
        name: 'कोडी / सांकेतिक',
        englishLabel: 'Riddles & Cryptic Wordplay',
        icon: '🧩',
        badge: 'आव्हानात्मक व रंजक',
        description: 'थेट अर्थाऐवजी कूट प्रश्न, शब्दांची चलाखी, गूढ संकेत आणि विचार करायला लावणारी रंजक कोडी.',
        exampleWord: 'आरसा',
        exampleClue: 'समोर येणाऱ्या प्रत्येकाचे हुबेहूब रूप दाखवणारा निर्जीव मित्र',
        difficulty: 'मध्यम ते कठीण',
    },
    {
        id: 'direct',
        name: 'थेट अर्थ',
        englishLabel: 'Direct Meaning / Definitions',
        icon: '💡',
        badge: 'सोपे व स्पष्ट',
        description: 'सरळ शब्दार्थ, प्रचलित समानार्थी शब्द किंवा वस्तुनिष्ठ व्याख्या (सुलभ व थेट सोडवण्यासाठी).',
        exampleWord: 'आरसा',
        exampleClue: 'स्वतःचे प्रतिबिंब पाहण्याचे साधन; दर्पण, काच',
        difficulty: 'सोपे',
    },
    {
        id: 'proverbs',
        name: 'म्हणी व वाक्प्रचार',
        englishLabel: 'Proverbs & Literary Quotes',
        icon: '📜',
        badge: 'सांस्कृतिक व साहित्यिक',
        description: 'मराठी म्हणी, वाक्प्रचार, सुभाषिते व लोकगीतांमधील गाळलेले शब्द व संदर्भ.',
        exampleWord: 'आरसा',
        exampleClue: 'हाताच्या कंकणाला ... कशाला?',
        difficulty: 'मध्यम',
    },
    {
        id: 'mixed',
        name: 'मिश्र / वृत्तपत्र शैली',
        englishLabel: 'Balanced Newspaper Style',
        icon: '⚡',
        badge: 'दैनिक शब्दवेध मानक',
        description: 'लोकसत्ता/सकाळ शब्दवेध प्रमाणे कोडी, थेट अर्थ आणि म्हणींचे चतुर व संतुलित मिश्रण.',
        exampleWord: 'आरसा',
        exampleClue: 'प्रतिबिंब दाखवणारी काच किंवा "हाताच्या कंकणाला ... कशाला?"',
        difficulty: 'संतुलित',
    },
];

/**
 * Curated authentic Marathi Riddles & Cryptic Clues (कोडी व सांकेतिक सूचना)
 */
export const MARATHI_CRYPTIC_CLUES: Record<string, string> = {
    // निसर्ग, वातावरण आणि प्राणी
    "आकाश": "दिवसा निळे आणि रात्री ताऱ्यांचे छत्र बनणारे अनंत अंगण",
    "पाऊस": "काळ्या ढगांतून मातीचा सुगंध दरवळवत बरसणारे अमृत",
    "चंद्र": "अंधाऱ्या रात्री आकाशात शीतल चांदणे शिंपडणारा शशी",
    "सूर्य": "रोज सकाळी उगवून संपूर्ण जगाला प्रकाश आणि जीवन देणारा दिनकर",
    "वारा": "दिसत नाही पण झाडांच्या पानांना नाचवणारा अदृश्य सोबती",
    "नदी": "डोंगरात जन्म घेऊन समुद्राला मिळण्यासाठी अविरत धावणारी सरिता",
    "समुद्र": "हजारो नद्यांचे पाणी पोटात सामावून घेणारा अथांग जलसागर",
    "झाड": "स्वतः उन्हात उभे राहून वाटसरूंना थंड सावली देणारा वृक्ष",
    "कमळ": "चिखलात जन्मूनही देवाच्या पूजेत शोभणारे पवित्र जलपुष्प",
    "गुलाब": "काट्यांच्या संरक्षणात फुलणारा, सुगंधाचा राजा",
    "फुलपाखरू": "रंगबेरंगी पंखांनी फुलाफुलांवर नाचणारा उडणारा सुंदर जीव",
    "काजवा": "अंधाऱ्या रात्री स्वतःच्या शरीरातून प्रकाश पाडणारा छोटा कीटक",
    "आरसा": "समोर उभे राहणाऱ्याचे खरे रूप क्षणात दाखवणारा निर्जीव सोबती",
    "स्वप्न": "डोळे मिटल्यावर रंगणारे आणि जागे होताच हवेत विरणारे चित्र",
    "छाया": "उन्हात सोबत चालणारी पण अंधारात गायब होणारी काळी मैत्रीण",
    "पाणी": "रंग नाही, रूप नाही, पण ज्याच्याशिवाय सजीव जगूच शकत नाही असे जीवन",
    "अग्नी": "जे खातो ते भस्म करतो, पण पाण्याला मात्र घाबरतो",
    "दिवा": "स्वतः जळून दुसऱ्यांच्या घराचा अंधार दूर करणारी वात",
    "मेघ": "आकाशात गडगडत पाणी घेऊन फिरणारा काळा ढग",
    "विहीर": "जमिनीच्या पोटातून गोड पाणी देणारे खोल पाण्याचे साधन",
    "डोंगर": "आकाशाला टेकू पाहणारा उंच अचल पाषाण",
    "माती": "ज्यात सर्व काही रुजते आणि ज्यातून नवे जीवन जन्माला येते अशी धरणी",
    "मुंगी": "अतिशय लहान असूनही स्वतःपेक्षा दुप्पट वजन वाहणारी शिस्तप्रिय कीटक",
    "मधमाशी": "फुलाफुलांतून गोड रस गोळा करून मध बनवणारी चतुर कारागीर",
    "कोकिळा": "वसंत ऋतूत आंब्याच्या बनातून 'कुहू-कुहू' साद घालणारी काळी पक्षीण",
    "पोपट": "हिरवे पंख आणि लाल चोच असलेला, माणसासारखे बोलणारा पक्षी",
    "मोर": "पाऊस येताच पिसारा फुलवून नाचणारा नयनरम्य राष्ट्रीय पक्षी",
    "वाघ": "अंगावर काळे पट्टे असलेला जंगलाचा रुबाबदार राजा",
    "सिंह": "आयाळ असलेला, गर्जनेने जंगल थरकाप उडवणारा वनराज",
    "हत्ती": "लांब सोंड आणि सुपासारखे कान असलेला सर्वात मोठा प्राणी",
    "घोडा": "टापांचा आवाज करत वाऱ्याच्या वेगाने धावणारा शूर वारू",
    "बैल": "शेतकऱ्याचा खरा मित्र; शेतात राबणारा कष्टाळू सर्जा-राजा",
    "गाय": "वात्सल्याची मूर्ती; अमृतासारखे गोड दूध देणारी कामधेनू",
    "मांजर": "घरात दबक्या पावलांनी फिरून उंदराची शिकार करणारी पाळीव प्राणी",
    "कुत्रा": "घराची राखण करणारा सर्वात इमानी व प्रामाणिक प्राणी",
    
    // मानवी जीवन, अवयव व भावना
    "लाळ": "तोंडातील चविष्ट पदार्थाचा सुगंध येताच जिभेवर सुटणारे पाणी; लाळ गळणे",
    "डोळे": "मनुष्य न बोलताही मनातील सर्व भाव प्रकट करणारी दोन खिडक्या; नयन",
    "कान": "आवाज आणि संगीताचा नाद टिपणारे शरीराचे श्रवणेंद्रिय; कर्ण",
    "नाक": "फुलांचा सुगंध आणि हवेचा श्वास घेणारा चेहऱ्यावरील मुख्य अवयव",
    "जीभ": "गोड, आंबट, तिखट अशा सर्व चवींची पारख करणारी रसाळ इंद्रिय",
    "दात": "अन्न चावून खाण्यासाठी तोंडात असणारे पांढरे हिरे",
    "हात": "कष्टाने नशीब घडवणारे आणि संकटात आधार देणारे दोन कर",
    "पाय": "जीवनाच्या वाटेवर ध्येयाकडे नेणारे दोन साथीदार; पावले",
    "मन": "एका क्षणात सातासमुद्रापार उड्डाण करणारा चंचल पाखरू",
    "हसणे": "कोणताही खर्च न करता चेहऱ्याचे सौंदर्य वाढवणारा निखळ आनंद",
    "अश्रू": "अति दुःखात वा अति आनंदात डोळ्यांतून ओघळणारा पाण्याचा थेंब",
    "आई": "जगातील सर्वात पवित्र शब्द; न मागता सर्वस्व देणारी माऊली",
    "वडील": "कुटुंबाला मायेचे छत्र आणि आधार देणारा भक्कम खांब",
    "मैत्री": "रक्ताचे नाते नसतानाही मनाला घट्ट जोडणारा रेशमी बंध",
    "पुस्तक": "न बोलता ज्ञानाचा खजिना उघडणारा खरा आणि निष्ठावंत मित्र",
    "कविता": "मनातील भावना शब्दांच्या तालावर नाचवणारी रसाळ रचना",
    "गाणे": "सुरांच्या हिंदोळ्यावर मनाला डोलवणारे सुरेल संगीत",
    "शब्द": "बोलातून निघाला की बाणासारखा, आणि जोडला तर प्रेमाचा पूल बनणारा",
    "घड्याळ": "काट्यांच्या टिक-टिक आवाजात वेळेची किंमत सांगणारे साधन",
    "कुलूप": "चावीशिवाय उघडत नसलेले घराचे सुरक्षा रक्षक",
    "चावी": "बंद दरवाजा क्षणात उघडणारी लोखंडी जादूगार",
    "दप्तर": "शाळकरी मुलांच्या पाठीवर पुस्तकांचे ओझे वाहणारा सोबती",
    "पेन": "तलवारीपेक्षाही जास्त ताकद असणारे विचारांचे शस्त्र; लेखणी",
    "कागद": "पांढराशुभ्र असून लेखकाच्या अक्षरांना स्वतःवर स्थान देणारा",
    "रंग": "जगातील प्रत्येक वस्तूला सुंदर आणि आकर्षक बनवणारी छटा",
    "सुगंध": "फुलातून हवेत पसरून मनाला प्रसन्न करणारा अदृश्य वास",
    "गोडवा": "साखरेत, गुळात आणि गोड शब्दांत असणारा जिभेचा आनंद",
    "ज्ञान": "वाचल्याने आणि शिकल्याने वाढणारा, कधीही न चोरीला जाणारा खजिना",
    
    // ऐतिहासिक व सांस्कृतिक
    "स्वराज्य": "छत्रपती शिवरायांनी रयतेसाठी उभे केलेले स्वतःचे स्वतंत्र राज्य",
    "किल्ला": "डोंगराच्या माथ्यावर शत्रूशी दोन हात करण्यासाठी बांधलेला अभेद्य गड",
    "भगवा": "शिवछत्रपतींच्या पराक्रमाचे आणि वारकऱ्यांच्या भक्तीचे प्रतीक असलेला ध्वज",
    "पालखी": "टाळ-मृदंगाच्या गजरात पंढरीकडे निघणारे संतांच्या पादुकांचे वाहन",
    "विठ्ठल": "पंढरपुरात विटेवर उभा राहून भक्तांची वाट पाहणारा सावळा हरी",
    "अभंग": "संतांच्या मुखातून निघालेली, कधीही भंग न पावणारी अमर काव्यरचना",
    "कीर्तन": "हरिनामाचा गजर करत समाजाला प्रबोधन करणारी भक्तिमय परंपरा",
    "मोदक": "बाप्पाच्या पूजेतील २१ आकड्याशी जोडलेला उकडीचा गोड प्रसाद",
    "गुढी": "चैत्र शुद्ध प्रतिपदेला विजयाचे प्रतीक म्हणून दारात उभारली जाणारी काठी",
    "पोळी": "सणाच्या दिवशी पुरण भरून तव्यावर भाजली जाणारी गोड मेजवानी",
    "रांगोळी": "दारासमोर बोटांच्या जादूने ठिपके जोडून काढलेली शुभ कला",
};

/**
 * Curated authentic Marathi Proverbs & Idioms Clues (म्हणी व वाक्प्रचार)
 */
export const MARATHI_PROVERB_CLUES: Record<string, string> = {
    "लाळ": "वाक्प्रचार: तोंडाला ... सुटणे (एखादी गोष्ट पाहून तीव्र हाव वा लोभ निर्माण होणे)",
    "आरसा": "म्हण: हाताच्या कंकणाला ... कशाला?",
    "गाढव": "म्हण: ... पुढे वाचली गीता, कालचा गोंधळ बरा होता!",
    "उंट": "म्हण: ... वरून शेळ्या हाकणे",
    "माकड": "म्हण: ... च्या हाती कोलीत",
    "हात": "म्हण: नाकापेक्षा ... जड किंवा ज्याचे करावे भले तो म्हणे माझेच खरे",
    "नाक": "वाक्प्रचार: ... कापणे (अपमान होणे) / म्हणीतील: ... दाबले की तोंड उघडते",
    "डोळे": "वाक्प्रचार: ... उघडणे (जाणीव होणे) / ... झाक करणे",
    "कान": "म्हण: एका कानाने ऐकावे आणि दुसऱ्या ... सोडून द्यावे",
    "घोडा": "म्हण: ... मैदान जवळ असणे / ... पेंड खाणे",
    "कावळा": "म्हण: ... बसला आणि फांदी तुटली!",
    "पाणी": "म्हण: उथळ पाण्याला खळखळाट फार / वाक्प्रचार: पाण्यासारखा पैसा खर्च करणे",
    "साखर": "म्हण: तोंडात ... आणि डोक्यावर बर्फ ठेवणे",
    "गूळ": "म्हण: ... गूळ बोलणे / ज्याचा गूळ त्यालाच गोड",
    "तेल": "म्हण: ... गेले, तूप गेले, हाती आले धुपाटणे!",
    "तूप": "म्हण: रूप पाहता लोचनी... किंवा तूप खाऊन रूप येत नाही!",
    "अंगार": "म्हण: अंगावर ... पडणे / धगधगता निखारा",
    "बैल": "म्हण: बैल गेला आणि झोपा केला!",
    "मांजर": "म्हण: डोळे मिटून ... दूध पिते",
    "कुत्रा": "म्हण: कुत्र्याचे शेपूट नळीत घातले तरी वाकडे ते वाकडे!",
    "दगडी": "म्हण: ... वरची रेघ (कधीही न बदलणारा शब्द)",
    "रान": "वाक्प्रचार: ... पेटणे किंवा ... उठवणे",
    "धूर": "म्हण: आग नाही तिथे ... कुठून निघणार?",
    "घर": "म्हण: घराचे झाले वासे, तरी संसाराचे फासे!",
    "गाव": "म्हण: ... करील ते राव काय करील?",
    "राजा": "म्हण: यथा ... तथा प्रजा!",
    "चोर": "म्हण: ... च्या मनात चांदणे!",
    "चांदणे": "म्हण: चोराच्या मनात ...!",
    "काठी": "म्हण: देवाच्या ... ला आवाज नसतो!",
    "दगड": "म्हण: उचलला ... आणि मारला पायावर!",
    "पाय": "म्हण: अंथरूण पाहून ... पसरावे!",
    "दांत": "म्हण: ... आहेत तर चणे नाहीत, चणे आहेत तर दात नाहीत!",
    "जीभ": "म्हण: जिभेला हाड नसते!",
    "उंटा": "म्हण: ... वरचा शहाणा",
    "पळस": "म्हण: ... ला पाने तीनच!",
    "बाप": "म्हण: ... तसा बेटा, कुंभार तसा घडा!",
};

/**
 * Dynamic fallback generator that creates a creative riddle/cryptic clue for any Marathi word!
 */
export function generateSmartCrypticClue(word: string, fallbackClue?: string): string {
    const cleanWord = word.trim();
    const graphemes = getGraphemes(cleanWord);
    const len = graphemes.length;

    // 1. Direct match in curated cryptic database
    if (MARATHI_CRYPTIC_CLUES[cleanWord]) {
        return MARATHI_CRYPTIC_CLUES[cleanWord];
    }

    // 2. Check if word contains a known proverb
    if (MARATHI_PROVERB_CLUES[cleanWord]) {
        return MARATHI_PROVERB_CLUES[cleanWord];
    }

    // 3. Fallback smart riddle phrasing based on graphemes and word characteristics
    const firstChar = graphemes[0] || '';
    const lastChar = graphemes[len - 1] || '';

    if (fallbackClue && fallbackClue.length > 2 && !fallbackClue.includes('मराठी शब्द') && !fallbackClue.includes('प्रमाणित')) {
        // Transform direct clue into a cryptic riddle phrasing
        const cleanBase = fallbackClue.replace(/^[–\-:\s]+/, '').replace(/[.;]+$/, '');
        
        // Templates to give it a newspaper crossword clue feel
        const templates = [
            `ओळखा पाहू: ${cleanBase}?`,
            `ज्याला म्हणतात "${cleanBase}"`,
            `गूढ संकेत: ${cleanBase}`,
            `संकेतावरून ओळखा: ${cleanBase}`,
            `सांकेतिक कोडे: ${cleanBase}`,
        ];
        return templates[cleanWord.length % templates.length];
    }

    // 4. Meaningful semantic hint
    const dictClue = fallbackClue || getMarathiWordClue(cleanWord);
    if (dictClue && !dictClue.includes('मराठी शब्द') && !dictClue.includes('संकल्पना')) {
        return `संकेतावरून ओळखा: ${dictClue}`;
    }
    return `संकेतावरून ओळखा`;
}

/**
 * Dynamic fallback generator that creates a proverb/idiom clue for any Marathi word!
 */
export function generateSmartProverbClue(word: string, fallbackClue?: string): string {
    const cleanWord = word.trim();
    
    // 1. Direct match in proverb database
    if (MARATHI_PROVERB_CLUES[cleanWord]) {
        return MARATHI_PROVERB_CLUES[cleanWord];
    }

    // 2. Fallback to cryptic or styled definition
    if (MARATHI_CRYPTIC_CLUES[cleanWord]) {
        return `साहित्यिक संदर्भ: ${MARATHI_CRYPTIC_CLUES[cleanWord]}`;
    }

    const dictClue = fallbackClue || getMarathiWordClue(cleanWord);
    if (dictClue && dictClue.length > 2 && !dictClue.includes('मराठी शब्द') && !dictClue.includes('संकल्पना')) {
        return `वाक्प्रचार किंवा म्हणीशी निगडित भावार्थ: ${dictClue}`;
    }

    return `साहित्यिक व व्यावहारिक संदर्भ`;
}

/**
 * Formats or fetches a clue for a specific word tailored to the requested ClueStyle.
 */
export function getStyledClue(word: string, style: ClueStyle = 'cryptic', baseClue?: string): string {
    const cleanWord = word.trim();
    const dictionaryClue = baseClue || getMarathiWordClue(cleanWord);

    switch (style) {
        case 'direct':
            // Direct definitions / synonyms
            return dictionaryClue || 'संकेतावरून ओळखा';

        case 'cryptic':
            // Riddles, wordplay, cryptic clues
            return generateSmartCrypticClue(cleanWord, dictionaryClue);

        case 'proverbs':
            // Proverbs, idioms, literary quotes
            return generateSmartProverbClue(cleanWord, dictionaryClue);

        case 'mixed':
        default: {
            // Balanced mix: use cryptic for 45% of words, proverbs for 25%, and direct for 30%
            const hash = cleanWord.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const mod = hash % 10;
            if (mod < 4) {
                return generateSmartCrypticClue(cleanWord, dictionaryClue);
            } else if (mod < 7) {
                return MARATHI_PROVERB_CLUES[cleanWord] || generateSmartCrypticClue(cleanWord, dictionaryClue);
            } else {
                return dictionaryClue || generateSmartCrypticClue(cleanWord, dictionaryClue);
            }
        }
    }
}

/**
 * Transforms an entire existing Clues object (across & down) into a new target ClueStyle
 */
export function transformCluesStyle(
    currentClues: Clues, 
    targetStyle: ClueStyle,
    aiClueMap?: Map<string, string>
): Clues {
    const transformClue = (c: { number: number; clue: string; word: string }) => {
        let newClueText = '';
        if (aiClueMap && aiClueMap.has(c.word)) {
            newClueText = aiClueMap.get(c.word)!;
        } else {
            newClueText = getStyledClue(c.word, targetStyle, c.clue);
        }
        return {
            ...c,
            clue: newClueText
        };
    };

    return {
        across: currentClues.across.map(transformClue),
        down: currentClues.down.map(transformClue)
    };
}
