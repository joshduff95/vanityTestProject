const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-west-2" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "vanityNumbers";

async function generateVanityNumbers(phoneNumber) {
  // maps letters to digits
  const LETTER_TO_DIGIT = {
    A: "2", B: "2", C: "2",
    D: "3", E: "3", F: "3",
    G: "4", H: "4", I: "4",
    J: "5", K: "5", L: "5",
    M: "6", N: "6", O: "6",
    P: "7", Q: "7", R: "7", S: "7",
    T: "8", U: "8", V: "8",
    W: "9", X: "9", Y: "9", Z: "9"
  };

  function wordToDigits(word) {
    return word
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .split('')
      .map(letter => LETTER_TO_DIGIT[letter])
      .join('');
  }

  function checkPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    const digits = phoneNumber.toString().replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return true;
    if (digits.length === 10) return true;
    return false;
  }

  function normalizeNumber(phoneNumber) {
    const digits = phoneNumber.toString().replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
  }
  // dictionary of words that are looked at for possible vanity words
  const DICTIONARY = [
    "CALL", "FLOW", "HELP", "HOME", "DOG", "CAT", "FIX", "SHOP", "SALE", "AUTO", "CAR",
    "FOOD", "FAST", "FOODIE", "PIZZA", "COFFEE", "TAXI", "HOTEL", "CASH",
    "BANK", "LOAN", "CARPET", "CLEAN", "DRIVE", "DIY", "TRUCK", "RENT", "REPAIR", "FIXIT",
    "LAWN", "YARD", "TREE", "PLUMB", "HEAT", "COOL", "ICE", "FUN", "TOYS", "GAME",
    "PLAY", "FIT", "GYM", "RUN", "BIKE", "STORE", "BUY", "SELL", "CARDS",
    "GIFT", "LOVE", "JOY", "SAFE", "SECURE", "MED", "CARE", "PET", "DOGGY",
    "KITTY", "EATS", "SNACK", "MEAL", "COOK", "BAKE", "GRILL", "DRINK",
    "JUICE", "BEER", "WINE", "BAR", "SPA", "WIN", "HOT", "COLD", "SUN", "SEA",
    "SKY", "TECH", "WEB", "APP", "CODE", "DEV", "IT", "DATA", "SEC", "MALL",
    "TRADE", "DELIVERY", "SERVICE", "REPAIR", "PLUMBING", "ELECTRIC",
    "PAINT", "CLEANER", "GARDEN", "FURNITURE", "MUSIC", "MOVIE", "BOOK", "SHOPPER",
    "FASHION", "STYLE", "BEAUTY", "HEALTH", "FITNESS", "YOGA", "TRAIN", "LEARN",
    "SCHOOL", "CLASS", "TEACH", "TUTOR", "LEARNER", "FUNNY", "SMILE", "HAPPY",
    "FRIEND", "TRAVEL", "TOUR", "HOTELS", "BEACH", "RESORT", "COOKING",
    "CAFE", "BREW", "JUICY", "SNACKS", "SPORTS", "GAMES", "PLAYERS", "WINNER",
    "LUCKY", "PRIZE", "EVENT", "PARTY", "GIFTS", "CHEER", "JOYFUL", "FEST", "LORE"
  ];

  if (!checkPhoneNumber(phoneNumber)) {
    throw new Error("Invalid phone number");
  }

  const normalizedPhoneNumber = normalizeNumber(phoneNumber);
  const areaCode = normalizedPhoneNumber.slice(0, 3);
  const lineNumber = normalizedPhoneNumber.slice(3);

  // Build digit-to-word map
  const WORD_DIGIT_MAP = {};
  for (const word of DICTIONARY) {
    const digits = wordToDigits(word);
    if (!WORD_DIGIT_MAP[digits]) WORD_DIGIT_MAP[digits] = [];
    WORD_DIGIT_MAP[digits].push(word);
  }

  // Create vanity numbers
  const matches = [];
  for (let start = 0; start < lineNumber.length; start++) {
    for (let len = 3; len <= lineNumber.length - start; len++) {
      const chunk = lineNumber.slice(start, start + len);
      if (WORD_DIGIT_MAP[chunk]) {
        for (const word of WORD_DIGIT_MAP[chunk]) {
          matches.push({ word, start, end: start + len });
        }
      }
    }
  }

  function insertDigits(words) {
    let result = '';
    let index = 0;
    for (const w of words) {
      if (w.start > index) {
        result += lineNumber.slice(index, w.start);
      }
      result += w.word;
      index = w.end;
    }
    if (index < lineNumber.length) {
      result += lineNumber.slice(index);
    }
    return `${areaCode}-${result}`;
  }

  const vanityNumbers = [];
  for (let i = 0; i < matches.length; i++) {
    vanityNumbers.push(insertDigits([matches[i]]));
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[j].start >= matches[i].end) {
        vanityNumbers.push(insertDigits([matches[i], matches[j]]));
      }
    }
  }

  // Score vanity numbers
  const scored = vanityNumbers.map(v => {
    const lettersOnly = v.replace(/[^A-Z]/gi, '');
    return { vanity: v, score: lettersOnly.length };
  });

  scored.sort((a, b) => b.score - a.score);

  const topForDb = scored.slice(0, 5);
  const topForVoice = scored.slice(0, 3);

  // Store top 5 matches in dynamo
  try {
    console.log("Writing to DynamoDB", {
      table: TABLE_NAME,
      pk: `PHONE#${normalizedPhoneNumber}`
    });
    
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        phoneNumber: normalizedPhoneNumber, // <-- MATCHES TABLE PK
        createdAt: new Date().toISOString(),
        results: topForDb,
        resultCount: topForDb.length
      }
      
    }));
  } catch (err) {
    console.error("DynamoDB write failed", err);
  }

  return topForVoice;
}


exports.handler = async (event) => {

  const phoneNumber =
    event?.phoneNumber ||
    event?.Details?.ContactData?.Attributes?.activePhoneNumber ||
    event?.Details?.ContactData?.CustomerEndpoint?.Address;

  if (!phoneNumber) {
    throw new Error("No phone number provided");
  }

  const result = await generateVanityNumbers(phoneNumber);

  return {
    Vanity1: result[0]?.vanity || '',
    Vanity2: result[1]?.vanity || '',
    Vanity3: result[2]?.vanity || '',
    VanityCount: result.length
  };
};
