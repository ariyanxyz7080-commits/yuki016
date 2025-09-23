const mongoose = require("mongoose");
const cron = require("node-cron");

// --- MONGOOSE MODEL ---
const birthdaySchema = new mongoose.Schema({
  name: String,
  date: String, // stored as DD-MM-YYYY
  wished: { type: Boolean, default: false }
});
const Birthday = mongoose.model("Birthday", birthdaySchema);

// --- BOLD UNICODE ---
function toBoldUnicode(text) {
  const boldAlphabet = {
    "a":"𝐚","b":"𝐛","c":"𝐜","d":"𝐝","e":"𝐞","f":"𝐟","g":"𝐠","h":"𝐡","i":"𝐢","j":"𝐣",
    "k":"𝐤","l":"𝐥","m":"𝐦","n":"𝐧","o":"𝐨","p":"𝐩","q":"𝐪","r":"𝐫","s":"𝐬","t":"𝐭",
    "u":"𝐮","v":"𝐯","w":"𝐰","x":"𝐱","y":"𝐲","z":"𝐳",
    "A":"𝐀","B":"𝐁","C":"𝐂","D":"𝐃","E":"𝐄","F":"𝐅","G":"𝐆","H":"𝐇","I":"𝐈","J":"𝐉",
    "K":"𝐊","L":"𝐋","M":"𝐌","N":"𝐍","O":"𝐎","P":"𝐏","Q":"𝐐","R":"𝐑","S":"𝐒","T":"𝐓",
    "U":"𝐔","V":"𝐕","W":"𝐖","X":"𝐗","Y":"𝐘","Z":"𝐙",
    "0":"𝟎","1":"𝟏","2":"𝟐","3":"𝟑","4":"𝟒","5":"𝟓","6":"𝟔","7":"𝟕","8":"𝟖","9":"𝟗",
    " ":" ","'":"'","-":"-",".":".",",":",","!":"!","?":"?"
  };
  return text.split('').map(c => boldAlphabet[c] || c).join('');
}

// --- DATE HELPERS ---
function parseDate(str) {
  const parts = str.split(/[-/]/).map(n=>parseInt(n));
  if(parts.length!==3) return null;
  return new Date(parts[2], parts[1]-1, parts[0]);
}
function formatDate(date) {
  return `${String(date.getDate()).padStart(2,"0")}-${String(date.getMonth()+1).padStart(2,"0")}-${date.getFullYear()}`;
}
function daysUntil(date) {
  const today = new Date();
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if(next < today) next.setFullYear(today.getFullYear()+1);
  return Math.ceil((next-today)/(1000*60*60*24));
}
function isBirthdayToday(date) {
  const today = new Date();
  return date.getDate()===today.getDate() && date.getMonth()===today.getMonth();
}

// --- AUTO WISH HELPER ---
async function autoWish(api, threadID) {
  const allBirthdays = await Birthday.find();
  for (let b of allBirthdays) {
    const date = parseDate(b.date);
    if (isBirthdayToday(date) && !b.wished) {
      await api.sendMessage(
        `🎉 @${b.name} 𝗛𝗮𝗽𝗽𝘆 𝗕𝗶𝗿𝘁𝗵𝗱𝗮𝘆🎂🥳\n` +
        `𝗠𝗮𝗻𝘆 𝗵𝗮𝗽𝗽𝘆 𝗿𝗲𝘁𝘂𝗿𝗻𝘀 𝗼𝗳 𝘁𝗵𝗲 𝗱𝗮𝘆🌸💫`,
        threadID,
        null,
        { mentions: [{ tag: b.name, id: b._id }] } // Replace _id with real user ID if needed
      );
      b.wished = true;
      await b.save();
    }
  }
}

// --- DAILY AUTO-WISH CRON ---
cron.schedule("0 0 * * *", async () => {
  try {
    if(global.api && global.defaultThread) {
      await autoWish(global.api, global.defaultThread);
    }
  } catch(e) {
    console.error("Birthday cron error:", e);
  }
});

module.exports = {
  config: {
    name: "birthday",
    aliases: [],
    version: "6.1",
    author: "Arijit + Nafiz + Kuze",
    countDown: 5,
    role: 0,
    shortDescription: "Manage birthdays in MongoDB",
    longDescription: "Add, remove, edit, view, leaderboard, and auto-wish birthdays",
    category: "utility",
    guide: {
      en: `{p}birthday add <DD-MM-YYYY> <name>
{p}birthday list
{p}birthday next
{p}birthday countdown
{p}birthday remove <name>
{p}birthday edit <name> <new-date>
{p}birthday lb`
    }
  },

  onStart: async function({ message, args, api }) {
    const sub = args[0];
    const allBirthdays = await Birthday.find();

    // --- AUTO WISH TODAY ---
    await autoWish(api, message.threadID);

    if(!sub) return api.sendMessage("❌ | Please provide an action: add, list, next, countdown, remove, edit, lb", message.threadID);

    // --- ADD ---
    if(sub==="add") {
      const dateStr = args[1];
      const name = args.slice(2).join(" ");
      if(!dateStr || !name) return api.sendMessage("❌ | Usage: birthday add <DD-MM-YYYY> <name>", message.threadID);
      const date = parseDate(dateStr);
      if(!date) return api.sendMessage("❌ | Invalid date format.", message.threadID);
      const b = new Birthday({name,date:formatDate(date),wished:false});
      await b.save();
      return api.sendMessage(`✅ | Birthday added for ${name} (${formatDate(date)})`, message.threadID);
    }

    // --- LIST ---
    if(sub==="list") {
      if(allBirthdays.length===0) return api.sendMessage("📭 | No birthdays saved.", message.threadID);
      let list = "🎂 𝐇𝐚𝐩𝐩𝐲 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 𝐋𝐢𝐬𝐭 🎂\n\n";
      allBirthdays.forEach(b=>{
        const boldName = toBoldUnicode(b.name);
        const boldDays = toBoldUnicode(`${daysUntil(parseDate(b.date))} days left`);
        list+=`╭─‣ ${boldName}: [${b.date}]\n╰──‣ (${boldDays})\n`;
      });
      return api.sendMessage(list, message.threadID);
    }

    // --- NEXT ---
    if(sub==="next") {
      if(allBirthdays.length===0) return api.sendMessage("📭 | No birthdays saved.", message.threadID);
      const sorted = allBirthdays.sort((a,b)=>daysUntil(parseDate(a.date))-daysUntil(parseDate(b.date)));
      const next = sorted[0];
      const boldName = toBoldUnicode(next.name);
      const boldDays = toBoldUnicode(`${daysUntil(parseDate(next.date))} days left`);
      return api.sendMessage(`🎉 𝐍𝐞𝐱𝐭 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 🎉\n\n╭─‣ ${boldName}: [${next.date}]\n╰──‣ (${boldDays})`, message.threadID);
    }

    // --- COUNTDOWN ---
    if(sub==="countdown") {
      if(allBirthdays.length===0) return api.sendMessage("📭 | No birthdays saved.", message.threadID);
      const sorted = allBirthdays.sort((a,b)=>daysUntil(parseDate(a.date))-daysUntil(parseDate(b.date)));
      let countdown = "⏳ 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲 𝐂𝐨𝐮𝐧𝐭𝐝𝐨𝐰𝐧 ⏳\n\n";
      sorted.forEach(b=>{
        const boldName = toBoldUnicode(b.name);
        const boldDays = toBoldUnicode(`${daysUntil(parseDate(b.date))} days left`);
        countdown+=`╭─‣ ${boldName}: [${b.date}]\n╰──‣ (${boldDays})\n`;
      });
      return api.sendMessage(countdown, message.threadID);
    }

    // --- REMOVE ---
    if(sub==="remove") {
      const name = args.slice(1).join(" ");
      if(!name) return api.sendMessage("❌ | Usage: birthday remove <name>", message.threadID);
      const b = await Birthday.findOne({name: new RegExp(`^${name}$`, "i")});
      if(!b) return api.sendMessage(`❌ | No birthday found for ${name}`, message.threadID);
      await b.deleteOne();
      return api.sendMessage(`✅ | Birthday removed for ${name}`, message.threadID);
    }

    // --- EDIT ---
    if(sub==="edit") {
      const name = args[1];
      const newDateStr = args[2];
      if(!name || !newDateStr) return api.sendMessage("❌ | Usage: birthday edit <name> <DD-MM-YYYY>", message.threadID);
      const date = parseDate(newDateStr);
      if(!date) return api.sendMessage("❌ | Invalid date format.", message.threadID);
      const b = await Birthday.findOne({name: new RegExp(`^${name}$`, "i")});
      if(!b) return api.sendMessage(`❌ | No birthday found for ${name}`, message.threadID);
      b.date = formatDate(date);
      b.wished = false;
      await b.save();
      return api.sendMessage(`✅ | Birthday updated for ${name} → ${formatDate(date)}`, message.threadID);
    }

    // --- LEADERBOARD TOP 5 ---
    if(sub==="lb" || sub==="leaderboard") {
      if(allBirthdays.length===0) return api.sendMessage("📭 | No birthdays saved.", message.threadID);
      const sorted = allBirthdays.sort((a,b)=>daysUntil(parseDate(a.date))-daysUntil(parseDate(b.date)));
      const top5 = sorted.slice(0,5);
      let lbText = "🏆 𝐓𝐨𝐩 5 𝐔𝐩𝐜𝐨𝐦𝐢𝐧𝐠 𝐁𝐢𝐫𝐭𝐡𝐝𝐚𝐲𝐬 🏆\n\n";
      top5.forEach((b,i)=>{
        const boldName = toBoldUnicode(b.name);
        const boldDays = toBoldUnicode(`${daysUntil(parseDate(b.date))} days left`);
        lbText+=`╭─‣ ${boldName}: [${b.date}]\n╰──‣ (${boldDays})\n\n`;
      });
      return api.sendMessage(lbText, message.threadID);
    }
  }
};
