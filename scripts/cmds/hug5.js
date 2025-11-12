const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");

module.exports = {
  config: {
    name: "hug5",
    aliases: ["embrace5"],
    version: "1.0",
    author: "Fahad Islam",
    countDown: 5,
    role: 0,
    shortDescription: "Give someone a warm hug! 💕",
    longDescription: "A refreshed hug command with reconnection handling and beautiful design",
    category: "love",
    guide: "{pn} @mention or reply to a message",
  },

  onStart: async function ({ event, api, usersData, args }) {
    try {
      // Send a processing message
      const processingMsg = await api.sendMessage("🔄 Preparing a warm hug for you...", event.threadID);

      let mention = Object.keys(event.mentions)[0];
      let targetID = mention || event.messageReply?.senderID;

      if (!targetID) {
        await api.sendMessage("💝 Who would you like to hug? Please tag someone or reply to their message!", event.threadID, event.messageID);
        await api.unsendMessage(processingMsg.messageID);
        return;
      }

      // Don't allow self-hug
      if (targetID === event.senderID) {
        await api.sendMessage("🤗 You can't hug yourself! But here's a virtual hug from me! 💕", event.threadID, event.messageID);
        await api.unsendMessage(processingMsg.messageID);
        return;
      }

      const huggerID = event.senderID;

      // Get user names with fallback
      const huggerName = await usersData.getName(huggerID) || "Someone";
      const targetName = event.mentions[mention] || (await usersData.getName(targetID)) || "Friend";

      const getAvatar = async (uid, retryCount = 0) => {
        try {
          const url = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
          const avatarPath = path.join(__dirname, `tmp/${uid}_avatar.png`);

          // Create tmp directory if it doesn't exist
          if (!fs.existsSync(path.join(__dirname, "tmp"))) {
            fs.mkdirSync(path.join(__dirname, "tmp"));
          }

          const res = await axios.get(url, { 
            responseType: "arraybuffer",
            timeout: 10000 // 10 second timeout
          });

          fs.writeFileSync(avatarPath, res.data);
          return avatarPath;
        } catch (err) {
          if (retryCount < 2) {
            console.log(`Retrying avatar fetch for ${uid}... Attempt ${retryCount + 1}`);
            return await getAvatar(uid, retryCount + 1);
          }
          console.error(`Error fetching avatar for user ${uid}: ${err.message}`);
          return "";
        }
      };

      // Update processing message
      await api.sendMessage("📸 Getting avatars and creating your hug...", event.threadID, processingMsg.messageID);

      // Load background image with retry logic
      let bg;
      let bgLoaded = false;
      let retryCount = 0;

      while (!bgLoaded && retryCount < 3) {
        try {
          bg = await loadImage("https://files.catbox.moe/n7x1vy.jpg");
          bgLoaded = true;
        } catch (bgError) {
          retryCount++;
          console.log(`Background load failed, retrying... (${retryCount}/3)`);
          if (retryCount === 3) {
            // Fallback to a solid color background
            await api.sendMessage("🎨 Using fallback background...", event.threadID, processingMsg.messageID);
            bg = {
              width: 800,
              height: 600
            };
          }
        }
      }

      const canvas = createCanvas(bg.width || 800, bg.height || 600);
      const ctx = canvas.getContext("2d");

      // Draw background or fallback
      if (bgLoaded) {
        ctx.drawImage(bg, 0, 0);
      } else {
        // Create a fallback gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FFB6C1');
        gradient.addColorStop(1, '#FF69B4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Get avatars with retry
      const huggerAvatarPath = await getAvatar(huggerID);
      const targetAvatarPath = await getAvatar(targetID);

      if (!huggerAvatarPath || !targetAvatarPath) {
        await api.sendMessage("❌ Failed to load user avatars. Please try again!", event.threadID, event.messageID);
        await api.unsendMessage(processingMsg.messageID);
        return;
      }

      const huggerAvatar = await loadImage(huggerAvatarPath);
      const targetAvatar = await loadImage(targetAvatarPath);

      // Draw hugger avatar (circular)
      ctx.save();
      ctx.beginPath();
      ctx.arc(285, 160, 50, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(huggerAvatar, 235, 110, 110, 100);
      ctx.restore();

      // Draw target avatar (circular)
      ctx.save();
      ctx.beginPath();
      ctx.arc(390, 200, 50, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(targetAvatar, 340, 150, 100, 100);
      ctx.restore();

      // Add profile-style text with shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#FF1493";
      ctx.textAlign = "center";
      ctx.fillText("💕 Virtual Hug 💕", canvas.width / 2, 50);

      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${huggerName}`, 210, 400);
      ctx.fillText(`${targetName}`, 490, 400);

      ctx.font = "20px Arial";
      ctx.fillStyle = "#FFD700";
      ctx.fillText("", canvas.width / 2, 250);

      // Remove shadow for the rest
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Add a cute border
      ctx.strokeStyle = "#FF69B4";
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Save the final image
      const output = path.join(__dirname, "tmp/hug_output.png");
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(output, buffer);

      // Final processing message
      await api.sendMessage("✨ Finalizing your special hug moment...", event.threadID, processingMsg.messageID);

      // Send message with the image
      const hugMessages = [
        `💝 ${huggerName} just gave ${targetName} a warm, comforting hug! 🥰\n\n"May this hug bring you comfort and joy! 🌸"`,
        `🤗 ${huggerName} embraces ${targetName} with a heartfelt hug! 💕\n\n"Sending positive vibes and warm wishes! ✨"`,
        `💞 ${huggerName} shares a special hug with ${targetName}! 🌟\n\n"Sometimes a hug is all you need to feel better! 🫂"`
      ];

      const randomMessage = hugMessages[Math.floor(Math.random() * hugMessages.length)];

      const message = {
        body: randomMessage,
        attachment: fs.createReadStream(output),
        mentions: [
          { tag: targetName, id: targetID },
          { tag: huggerName, id: huggerID }
        ]
      };

      await api.sendMessage(message, event.threadID, async (err) => {
        // Clean up temporary files
        try {
          if (fs.existsSync(output)) fs.unlinkSync(output);
          if (fs.existsSync(huggerAvatarPath)) fs.unlinkSync(huggerAvatarPath);
          if (fs.existsSync(targetAvatarPath)) fs.unlinkSync(targetAvatarPath);
          await api.unsendMessage(processingMsg.messageID);
        } catch (cleanupErr) {
          console.error("Error cleaning up files:", cleanupErr);
        }

        if (err) {
          console.error("Error sending hug message:", err);
          await api.sendMessage("❌ Failed to send the hug image, but the hug was sent with love! 💕", event.threadID);
        }
      });

    } catch (error) {
      console.error("Error in hug command:", error);
      await api.sendMessage("❌ I encountered an issue while preparing your hug! 😔 Please try again in a moment.", event.threadID, event.messageID);

      // Try to clean up processing message
      try {
        await api.unsendMessage(processingMsg?.messageID);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  },

  // Additional event handler for reconnection
  onReconnect: function({ api }) {
    console.log('🔄 Hug command reconnected and ready to use!');
  }
};
