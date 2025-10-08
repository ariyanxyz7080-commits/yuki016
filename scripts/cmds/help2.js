const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "help2",
    version: "1.3",
    author: "Arijit",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Show commands by category" },
    longDescription: { en: "Displays commands under a specific category in Alya Chan styled box format" },
    category: "group",
    guide: { en: "{p}help2 | {p}help2 <category name>" }
  },

  onStart: async function ({ message, args, prefix }) {
    const commandsPath = path.join(__dirname, "..");
    const categories = {};

    // Scan all commands
    fs.readdirSync(commandsPath).forEach(folder => {
      const folderPath = path.join(commandsPath, folder);
      if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
        for (const file of commandFiles) {
          try {
            delete require.cache[require.resolve(path.join(folderPath, file))];
            const cmd = require(path.join(folderPath, file));
            if (cmd.config?.name) {
              const category = cmd.config.category || "Uncategorized";
              if (!categories[category]) categories[category] = [];
              categories[category].push(cmd.config.name);
            }
          } catch {
            continue;
          }
        }
      }
    });

    const sortedCategories = Object.keys(categories).sort();
    sortedCategories.forEach(cat => categories[cat].sort());

    // Case 1: No argument → show category list only
    if (!args[0]) {
      let out = "╭──⭓[ 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐲 𝐋𝐢𝐬𝐭🎖]\n";
      sortedCategories.forEach(c => {
        out += `│ ✧ ${toBoldUnicode(c)}\n`;
      });
      out += "╰──────────⭓\n";
      out += `⭔ Type ${prefix}help2 <category> to see commands.`;
      return message.reply(out);
    }

    // Case 2: Specific category requested
    const searchCat = args[0].toLowerCase();
    let foundCat = null;
    for (const category of sortedCategories) {
      if (category.toLowerCase() === searchCat) {
        foundCat = category;
        break;
      }
    }

    if (!foundCat) {
      return message.reply(`❌ Category "${args[0]}" not found.\n⭔ Try: ${sortedCategories.join(", ")}`);
    }

    // Build category commands box, 2 commands per line
    const cmds = categories[foundCat];
    const groupedLines = [];
    let line = [];
    for (const cmd of cmds) {
      line.push(cmd);
      if (line.length === 2) { // 2 commands per line
        groupedLines.push(line.join(" ✧ "));
        line = [];
      }
    }
    if (line.length > 0) groupedLines.push(line.join(" ✧ "));

    let output = `╭──⭓[ ${toBoldUnicode(foundCat.toUpperCase())} ]\n`;
    groupedLines.forEach(l => {
      output += `│ ✧ ${l}\n`;
    });
    output += "╰──────────⭓\n";
    output += `⭔ Type ${prefix}<command> to use it.`;

    message.reply(output);
  }
};

// Convert text to bold Unicode
function toBoldUnicode(text) {
  const map = {
    a:"𝐀",b:"𝐁",c:"𝐂",d:"𝐃",e:"𝐄",f:"𝐅",g:"𝐆",h:"𝐇",i:"𝐈",j:"𝐉",
    k:"𝐊",l:"𝐋",m:"𝐌",n:"𝐍",o:"𝐎",p:"𝐏",q:"𝐐",r:"𝐑",s:"𝐒",t:"𝐓",
    u:"𝐔",v:"𝐕",w:"𝐖",x:"𝐗",y:"𝐘",z:"𝐙",
    A:"𝐀",B:"𝐁",C:"𝐂",D:"𝐃",E:"𝐄",F:"𝐅",G:"𝐆",H:"𝐇",I:"𝐈",J:"𝐉",
    K:"𝐊",L:"𝐋",M:"𝐌",N:"𝐍",O:"𝐎",P:"𝐏",Q:"𝐐",R:"𝐑",S:"𝐒",T:"𝐓",
    U:"𝐔",V:"𝐕",W:"𝐖",X:"𝐗",Y:"𝐘",Z:"𝐙", " ":" ", "_":"_", "-":"-"
  };
  return text.split("").map(c => map[c] || c).join("");
}
