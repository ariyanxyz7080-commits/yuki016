const axios = require("axios");
 
const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json"
  );
  return base.data.mahmud + "/api/jan";
};
 
module.exports.config = {
  name: "jan",
  aliases: ["januu", "জান", "jan","yuki"],
  version: "1.7",
  author: "MahMUD",
  countDown: 0,
  role: 0,
  category: "ai",
  guide: {
    en:
      "{pn} [message] OR\n" +
      "teach [trigger] - [response1], [response2]... OR\n" +
      "remove [trigger] - [index] OR\n" +
      "list OR\n" +
      "list all OR\n" +
      "edit [trigger] - [newResponse] OR\n" +
      "msg [trigger]",
  },
};
 
module.exports.onStart = async ({ api, event, args, usersData }) => {
  try {
    const userMessage = args.join(" ").toLowerCase();
    const uid = event.senderID;
 
    if (!args[0]) {
      const responses = [
        "𝐛𝐨𝐥𝐨 𝐣𝐚𝐧😎",
        "𝐛𝐨𝐥𝐨 𝐛𝐚𝐛𝐲🐥",
        "𝐡𝐞𝐥𝐥𝐨 𝐛𝐚𝐛𝐲🐤",
        "𝐇𝐮𝐦𝐦 𝐛𝐨𝐥𝐨😗",
        "𝐌𝐢𝐥𝐚𝐬𝐡𝐤𝐚🥹",
      ];
      return api.sendMessage(
        responses[Math.floor(Math.random() * responses.length)],
        event.threadID,
        event.messageID
      );
    }
 
    const apiUrl = await baseApiUrl();
 
    if (args[0] === "teach") {
      const teachContent = userMessage.replace("teach ", "");
      const [trigger, responses] = teachContent.split(" - ");
 
      if (!trigger || !responses) {
        return api.sendMessage(
          "❌ | teach [trigger] - [response1, response2,...]",
          event.threadID,
          event.messageID
        );
      }
 
      const response = await axios.post(`${apiUrl}/teachxx`, {
        trigger,
        responses,
        userID: uid,
      });
 
      const userName = (await usersData.getName(uid)) || "Unknown User";
      return api.sendMessage(
        `✅ Replies added: "${responses}" to "${trigger}"\n• 𝐓𝐞𝐚𝐜𝐡𝐞𝐫: ${userName}\n• 𝐓𝐨𝐭𝐚𝐥: ${response.data.count || 0}`,
        event.threadID,
        event.messageID
      );
    }
 
    if (args[0] === "remove") {
      const removeContent = userMessage.replace("remove ", "");
      const [trigger, index] = removeContent.split(" - ");
 
      if (!trigger || !index || isNaN(index)) {
        return api.sendMessage(
          "❌ | remove [trigger] - [index]",
          event.threadID,
          event.messageID
        );
      }
 
      const response = await axios.delete(`${apiUrl}/remove`, {
        data: { trigger, index: parseInt(index, 10) },
      });
 
      return api.sendMessage(`"${response.data.message}"`, event.threadID, event.messageID);
    }
 
    if (args[0] === "list") {
      const endpoint = args[1] === "all" ? "/list/all" : "/list";
      const response = await axios.get(`${apiUrl}${endpoint}`);
 
      if (args[1] === "all") {
        let message = "👑 List of Hinata teachers:\n\n";
        const data = Object.entries(response.data.data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
 
        for (let i = 0; i < data.length; i++) {
          const [userID, count] = data[i];
          const name = (await usersData.getName(userID)) || "Unknown";
          message += `${i + 1}. ${name}: ${count}\n`;
        }
 
        return api.sendMessage(message, event.threadID, event.messageID);
      }
 
      return api.sendMessage(response.data.message, event.threadID, event.messageID);
    }
 
    if (args[0] === "edit") {
      const editContent = userMessage.replace("edit ", "");
      const [oldTrigger, newResponse] = editContent.split(" - ");
 
      if (!oldTrigger || !newResponse) {
        return api.sendMessage(
          "❌ | Format: edit [trigger] - [newResponse]",
          event.threadID,
          event.messageID
        );
      }
 
      await axios.put(`${apiUrl}/`, { oldTrigger, newResponse });
      return api.sendMessage(
        `✅ Edited "${oldTrigger}" to "${newResponse}"`,
        event.threadID,
        event.messageID
      );
    }
 
    if (args[0] === "msg") {
      const searchTrigger = args.slice(1).join(" ");
      if (!searchTrigger)
        return api.sendMessage("❌  | Please provide a message to search.", event.threadID, event.messageID);
 
      try {
        const response = await axios.get(`${apiUrl}/msg`, {
          params: { userMessage: `msg ${searchTrigger}` },
        });
        if (response.data.message)
          return api.sendMessage(response.data.message, event.threadID, event.messageID);
        return api.sendMessage("No message found.", event.threadID, event.messageID);
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || "An unknown error occurred";
        return api.sendMessage(errorMessage, event.threadID, event.messageID);
      }
    }
 
 
    const userText = args.join(" ");
    const botResponse = await getBotResponse(userText);
 
    return api.sendMessage(botResponse, event.threadID, (err, info) => {
      if (!err) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "jan",
          type: "reply",
          messageID: info.messageID,
          author: event.senderID,
          text: userText,
        });
      }
    }, event.messageID);
 
  } catch (error) {
    const errorMessage = error.response?.data || error.message || "Unknown error occurred";
    return api.sendMessage(errorMessage, event.threadID, event.messageID);
  }
};
 
module.exports.onReply = async ({ api, event, Reply, args }) => {
  if (event.senderID !== Reply.author) return;
 
  const userText = args.join(" ");
  const botResponse = await getBotResponse(userText);
 
  return api.sendMessage(botResponse, event.threadID, (err, info) => {
    if (!err) {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "jan",
        type: "reply",
        messageID: info.messageID,
        author: event.senderID,
        text: userText,
      });
    }
  }, event.messageID);
};
 
async function getBotResponse(message) {
  try {
    const response = await axios.get(
      `https://mahmud-global-apis.onrender.com/api/jan/font3/${encodeURIComponent(message)}`
    );
    return response.data?.message || "try Again";
  } catch (error) {
    console.error("API Error:", error.message || error);
    return "error janu 🥲";
  }
}
