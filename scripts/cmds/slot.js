const cooldowns = new Map();

module.exports = {
  config: {
    name: "slot",
    version: "3.4",
    author: "Arijit",
    countDown: 10,
    shortDescription: { en: "slot game 🙂" },
    longDescription: { en: "Try your luck in a slot game" },
    category: "game",
  },

  langs: {
    en: {
      invalid_amount: "𝗣𝗹𝗲𝗮𝘀𝗲 𝗲𝗻𝘁𝗲𝗿 𝗮 𝘃𝗮𝗹𝗶𝗱 𝗮𝗺𝗼𝘂𝗻𝘁 😿💅",
      not_enough_money: "𝗣𝗹𝗲𝗮𝘀𝗲 𝗰𝗵𝗲𝗰𝗸 𝘆𝗼𝘂𝗿 𝗯𝗮𝗹𝗮𝗻𝗰𝗲 🤡",
      limit_reached: "❌ | 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐫𝐞𝐚𝐜𝐡𝐞𝐝 𝐲𝐨𝐮𝐫 𝐬𝐥𝐨𝐭 𝐥𝐢𝐦𝐢𝐭. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐢𝐧 %1.",
      jackpot_message: ">🎀\n𝐉𝐚𝐜𝐤𝐩𝐨𝐭! 𝐘𝐨𝐮 𝐰𝐨𝐧 $%1 𝐰𝐢𝐭𝐡 𝐭𝐡𝐫𝐞𝐞 ❤ 𝐬𝐲𝐦𝐛𝐨𝐥𝐬, 𝐁𝐚𝐛𝐲!\n• 𝐒𝐥𝐨𝐭 𝐑𝐞𝐬𝐮𝐥𝐭 [ %2 | %3 | %4 ]",
      win_message: ">🎀\n• 𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮 𝐰𝐨𝐧 $%1\n• 𝐒𝐥𝐨𝐭 𝐑𝐞𝐬𝐮𝐥𝐭 [ %2 | %3 | %4 ]",
      lose_message: ">🎀\n• 𝐁𝐚𝐛𝐲, 𝐘𝐨𝐮 𝐥𝐨𝐬𝐭 $%1\n• 𝐒𝐥𝐨𝐭 𝐑𝐞𝐬𝐮𝐥𝐭 [ %2 | %3 | %4 ]",
    },
  },

  onStart: async function ({ args, message, event, usersData, getLang }) {
    const { senderID } = event;

    // --- parse bet amount ---
    let betInput = args[0];
    if (!betInput) return message.reply(getLang("invalid_amount"));

    let amount = parseBet(betInput);
    if (!amount || amount <= 0) return message.reply(getLang("invalid_amount"));

    // --- cooldown system ---
    const now = Date.now();
    const limit = 20; // 20 plays
    const interval = 5 * 60 * 60 * 1000; // 5 hours

    if (!cooldowns.has(senderID)) cooldowns.set(senderID, []);
    const timestamps = cooldowns.get(senderID).filter(ts => now - ts < interval);
    if (timestamps.length >= limit) {
      const nextUse = new Date(Math.min(...timestamps) + interval);
      const diff = nextUse - now;
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      return message.reply(getLang("limit_reached", `${hours}𝐡 ${minutes}𝐦`));
    }

    // --- validations ---
    // 🔓 removed max limit (50M) restriction here

    const userData = await usersData.get(senderID);
    if (amount > userData.money) return message.reply(getLang("not_enough_money"));

    // --- slot result ---
    const result = generateResult();
    const winnings = calculateWinnings(result, amount);

    await usersData.set(senderID, {
      money: userData.money + winnings,
      data: userData.data,
    });

    cooldowns.set(senderID, [...timestamps, now]);
    return message.reply(formatResult(result, winnings, getLang));
  }
};

// --- Helpers ---

function parseBet(input) {
  input = input.toLowerCase();
  let multiplier = 1;
  if (input.endsWith("k")) {
    multiplier = 1e3;
    input = input.slice(0, -1);
  } else if (input.endsWith("m")) {
    multiplier = 1e6;
    input = input.slice(0, -1);
  } else if (input.endsWith("b")) {
    multiplier = 1e9;
    input = input.slice(0, -1);
  }

  let number = parseInt(input);
  if (isNaN(number)) return null;
  return number * multiplier;
}

function generateResult() {
  const slots = ["💚", "💛", "💙", "💜", "🤎", "🤍", "❤"];
  const r = Math.random() * 100;

  if (r < 1) return ["❤", "❤", "❤"]; // 1% Jackpot (10x)
  if (r < 9) { // Next 8% for 5x win
    const symbol = slots.filter(e => e !== "❤")[Math.floor(Math.random() * 6)];
    return [symbol, symbol, symbol];
  }
  if (r < 44) { // Next 35% for 3x win (two same)
    const s = slots[Math.floor(Math.random() * slots.length)];
    let r2;
    do { r2 = slots[Math.floor(Math.random() * slots.length)]; } while (r2 === s);
    return [s, s, r2];
  }

  // 56% Loss (all different)
  while (true) {
    const [a, b, c] = [randomEmoji(slots), randomEmoji(slots), randomEmoji(slots)];
    if (a !== b && b !== c && a !== c) return [a, b, c];
  }
}

function calculateWinnings([a, b, c], bet) {
  if (a === b && b === c) {
    if (a === "❤") return bet * 10;
    return bet * 5;
  }
  if (a === b || b === c || a === c) return bet * 3;
  return -bet;
}

function formatResult([a, b, c], winnings, getLang) {
  const formatted = formatMoney(Math.abs(winnings));
  if (a === b && b === c && a === "❤")
    return getLang("jackpot_message", formatted, a, b, c);
  if (winnings > 0)
    return getLang("win_message", formatted, a, b, c);
  return getLang("lose_message", formatted, a, b, c);
}

function randomEmoji(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatMoney(amount) {
  if (amount >= 1e12) return (amount / 1e12).toFixed(2) + "𝗧";
  if (amount >= 1e9) return (amount / 1e9).toFixed(2) + "𝗕";
  if (amount >= 1e6) return (amount / 1e6).toFixed(2) + "𝐌";
  if (amount >= 1e3) return (amount / 1e3).toFixed(2) + "𝗞";
  return amount.toString();
}
