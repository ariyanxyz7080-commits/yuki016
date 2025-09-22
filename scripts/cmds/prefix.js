const fs = require("fs");
const utils = global.utils;

module.exports = {
    config: {
        name: "prefix",
        version: "1.8",
        author: "Arijit",
        countDown: 5,
        role: 0,
        description: "Change the bot's command prefix in your chat or globally (admin only)",
        category: "admin",
    },

    langs: {
        en: {
            reset: "Your prefix has been reset to default: %1",
            onlyAdmin: "Only admin can change the system bot prefix",
            confirmGlobal: "Please react to this message to confirm changing the system bot prefix",
            confirmThisThread: "Please react to this message to confirm changing the prefix in your chat",
            successGlobal: "Changed system bot prefix to: %1",
            successThisThread: "Changed prefix in your chat to: %1",
            myPrefix: "\n\n━━〔 ⋆˚🦋𝐘𝐮𝐤𝐢🎀⋆˚ 〕━━ \n\n 🖥 𝐒𝐲𝐬𝐭𝐞𝐦 𝐩𝐫𝐞𝐟𝐢𝐱: [ %1 ] \n 🌐 𝐘𝐨𝐮𝐫 𝐠𝐫𝐨𝐮𝐩 𝐩𝐫𝐞𝐟𝐢𝐱: [ %2 ]\n\n╭➢ 𝐎𝐰𝐧𝐞𝐫 👑\n╰➢ 𝐀 𝐑 𝐈 𝐉 𝐈 𝐓⚡\n\n╭➢ 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤 ⓕ\n╰➢ [ https://fb.com/arijit016 ] \n\n"
        }
    },

    onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
        if (!args[0]) return message.reply("Please provide a new prefix or use 'reset'.");

        if (args[0] === "reset") {
            await threadsData.set(event.threadID, null, "data.prefix");
            return message.reply(getLang("reset", global.GoatBot.config.prefix));
        }

        const newPrefix = args[0];
        if (newPrefix.length > 5 || newPrefix.length === 0)
            return message.reply("Prefix should be between 1 to 5 characters.");

        const formSet = {
            commandName,
            author: event.senderID,
            newPrefix
        };

        if (args[1] === "-g") {
            if (role < 2) return message.reply(getLang("onlyAdmin"));
            else formSet.setGlobal = true;
        } else {
            formSet.setGlobal = false;
        }

        return message.reply(args[1] === "-g" ? getLang("confirmGlobal") : getLang("confirmThisThread"), (err, info) => {
            formSet.messageID = info.messageID;
            global.GoatBot.onReaction.set(info.messageID, formSet);

            setTimeout(() => {
                global.GoatBot.onReaction.delete(info.messageID);
            }, 60000);
        });
    },

    onChat: async function ({ event, message, getLang }) {
        if (event.body && event.body.toLowerCase() === "prefix") {
            return message.reply(
                getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID))
            );
        }
    },

    onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
        const { author, newPrefix, setGlobal } = Reaction;
        if (event.userID !== author) return;

        if (setGlobal) {
            global.GoatBot.config.prefix = newPrefix;
            fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
            return message.reply(getLang("successGlobal", newPrefix));
        } else {
            await threadsData.set(event.threadID, newPrefix, "data.prefix");
            return message.reply(getLang("successThisThread", newPrefix));
        }
    }
};
