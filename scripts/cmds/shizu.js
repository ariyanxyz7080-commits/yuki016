 const axios = require('axios');
const validUrl = require('valid-url');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const TMP_DIR = path.join(__dirname, 'tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const downloadFile = async (url, ext) => {
  const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, Buffer.from(response.data));
  return filePath;
};

const resetConversation = async (api, event, message) => {
  api.setMessageReaction("♻️", event.messageID, () => {}, true);
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${event.senderID}`);
    return message.reply(`✅ Conversation reset for UID: ${event.senderID}`);
  } catch (error) {
    console.error('❌ Reset Error:', error.message);
    return message.reply("❌ Reset failed. Try again.");
  }
};

const handleAIRequest = async (api, event, userInput, message, isReply = false) => {
  const userId = event.senderID;
  let messageContent = userInput;
  let imageUrl = null;

  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  if (event.messageReply) {
    const replyData = event.messageReply;
    if (replyData.senderID !== global.GoatBot?.botID && replyData.body) {
      const trimmedReply = replyData.body.length > 300
        ? replyData.body.slice(0, 300) + "..."
        : replyData.body;
      messageContent += `\n\n📌 Reply:\n"${trimmedReply}"`;
    }
    const attachment = replyData.attachments?.[0];
    if (attachment?.type === 'photo') imageUrl = attachment.url;
  }

  const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/)?.[0];
  if (urlMatch && validUrl.isWebUri(urlMatch)) {
    imageUrl = urlMatch;
    messageContent = messageContent.replace(urlMatch, '').trim();
  }

  if (!messageContent && !imageUrl) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return message.reply("💬 Provide a message or image.");
  }

  try {
    const response = await axios.post(
      API_ENDPOINT,
      { uid: userId, message: messageContent, image_url: imageUrl },
      { timeout: 60000 }
    );

    const {
      reply: textReply,
      image_url: genImageUrl,
      music_data: musicData,
      video_data: videoData,
      shotti_data: shotiData,
      lyrics_data: lyricsData
    } = response.data;

    let finalReply = textReply || '✅ Shizu Response:';
    const attachments = [];

    if (genImageUrl) {
      try {
        attachments.push(fs.createReadStream(await downloadFile(genImageUrl, 'jpg')));
      } catch {
        finalReply += '\n🖼️ Image download failed.';
      }
    }

    if (musicData?.downloadUrl) {
      try {
        attachments.push(fs.createReadStream(await downloadFile(musicData.downloadUrl, 'mp3')));
      } catch {
        finalReply += '\n🎵 Music download failed.';
      }
    }

    if (videoData?.downloadUrl) {
      try {
        attachments.push(fs.createReadStream(await downloadFile(videoData.downloadUrl, 'mp4')));
      } catch {
        finalReply += '\n🎬 Video download failed.';
      }
    }

    if (shotiData?.videoUrl) {
      try {
        attachments.push(fs.createReadStream(await downloadFile(shotiData.videoUrl, 'mp4')));
      } catch {
        finalReply += '\n🎬 Shoti video download failed.';
      }
    }

    if (lyricsData) {
      try {
        const maxLength = 1500;
        let lyricsText = lyricsData.lyrics;
        if (lyricsText.length > maxLength) {
          lyricsText = lyricsText.substring(0, maxLength) + '... [truncated]';
        }
        finalReply += `\n\n🎵 Lyrics for "${lyricsData.track_name}":\n${lyricsText}`;
      } catch {
        finalReply += '\n📝 Lyrics processing failed.';
      }
    }

    const sentMessage = await message.reply({
      body: finalReply,
      attachment: attachments.length > 0 ? attachments : undefined
    });

    if (sentMessage && sentMessage.messageID) {
      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: 'shizu',
        messageID: sentMessage.messageID,
        author: userId
      });
    }

    api.setMessageReaction("✅", event.messageID, () => {}, true);

  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
    api.setMessageReaction("❌", event.messageID, () => {}, true);

    let errorMessage = "⚠️ Shizu Error:\n\n";
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage += "⏱️ Timeout. Try again.";
    } else if (error.response?.status === 429) {
      errorMessage += "🚦 Too many requests. Slow down.";
    } else {
      errorMessage += "❌ Unexpected error: " + (error.message || 'No details');
    }

    return message.reply(errorMessage);
  }
};

module.exports = {
  config: {
    name: 'shizu',
    aliases: [],
    version: '2.1.0',
    author: 'Aryan Chauhan & Raihan Edit',
    role: 0,
    category: 'ai',
    longDescription: {
      en: 'Shizu AI – Chat, image, music, video, lyrics & Shoti with name-based trigger'
    },
    guide: {
      en: `.shizu [your message]  
or simply say: "Shizu [your message]"  
• 🤖 Chat, 🎨 Image, 🎵 Music, 🎬 Video  
• 🎵 Lyrics: "lyrics [song name]"  
• 🎬 Shoti: "shoti" for random TikTok  
• 🔄 Reply "clear" to reset conversation`
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const userInput = args.join(' ').trim();
    if (!userInput) return message.reply("❗ Please enter a message.");

    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }

    return await handleAIRequest(api, event, userInput, message);
  },

  onReply: async function ({ api, event, Reply, message }) {
    if (event.senderID !== Reply.author) return;

    const userInput = event.body?.trim();
    if (!userInput) return;

    if (['clear', 'reset'].includes(userInput.toLowerCase())) {
      return await resetConversation(api, event, message);
    }

    return await handleAIRequest(api, event, userInput, message, true);
  },

  onChat: async function ({ api, event, message }) {
    const body = event.body?.trim();
    if (!body) return;

    // ✅ Works with prefix (.shizu) and without prefix (Shizu ...)
    const prefixTrigger = /^(\.shizu|shizu)\b/i;
    if (!prefixTrigger.test(body)) return;

    const userInput = body.replace(prefixTrigger, '').trim();
    if (!userInput) return message.reply("❗ Please enter a message.");

    return await handleAIRequest(api, event, userInput, message);
  }
};
