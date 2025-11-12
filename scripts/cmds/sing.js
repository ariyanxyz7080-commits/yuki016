const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: 'sing',
    author: 'Nyx',
    usePrefix: true,
    category: 'media'
  },
  onStart: async ({ event, api, args, message }) => {
    try {
      const query = args.join(' ');
      if (!query) return message.reply('Please provide a search query!');
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Common headers for all axios requests
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
        "Accept": "application/json"
        // যদি API key/Authorization লাগে তাহলে এখানে দাও:
        // "Authorization": "Bearer YOUR_API_KEY",
      };

      console.log('[sing] Searching for:', query);

      // 🔎 Search API
      const searchResponse = await axios.get(
        `https://www.x-noobs-apis.42web.io/mostakim/ytSearch?search=${encodeURIComponent(query)}`,
        { headers, validateStatus: null }
      );

      console.log('[sing] search status:', searchResponse.status);

      if (searchResponse.status === 403) {
        throw new Error('Search API returned 403 Forbidden — likely auth/headers/IP block.');
      }
      if (searchResponse.status >= 400) {
        throw new Error(`Search API error ${searchResponse.status}`);
      }

      const parseDuration = (timestamp) => {
        const parts = timestamp.split(':').map(part => parseInt(part));
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        return seconds;
      };

      const filteredVideos = (Array.isArray(searchResponse.data) ? searchResponse.data : []).filter(video => {
        try {
          const totalSeconds = parseDuration(video.timestamp);
          return totalSeconds < 600;
        } catch {
          return false;
        }
      });

      if (filteredVideos.length === 0) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply('No short videos found (under 10 minutes)!');
      }

      const selectedVideo = filteredVideos[0];
      const tempFilePath = path.join(__dirname, `${Date.now()}_${event.senderID}.m4a`);

      console.log('[sing] Selected video:', selectedVideo.title, selectedVideo.url);

      // 🎶 Download API
      const apiResponse = await axios.get(
        `https://www.x-noobs-apis.42web.io/m/sing?url=${encodeURIComponent(selectedVideo.url)}`,
        { headers, validateStatus: null }
      );

      console.log('[sing] m/sing status:', apiResponse.status);

      if (apiResponse.status === 403) {
        throw new Error('m/sing API returned 403 Forbidden — likely auth/headers/IP block.');
      }
      if (apiResponse.status >= 400) {
        throw new Error(`m/sing API error ${apiResponse.status}`);
      }

      if (!apiResponse.data.url) {
        throw new Error('No audio URL found in response');
      }

      console.log('[sing] Audio URL:', apiResponse.data.url);

      // 🔊 Download audio stream with extra headers
      const writer = fs.createWriteStream(tempFilePath);
      const audioResponse = await axios({
        url: apiResponse.data.url,
        method: 'GET',
        responseType: 'stream',
        headers: {
          ...headers,
          "Range": "bytes=0-",
          "Referer": "https://www.youtube.com/",
          "Origin": "https://www.youtube.com"
        },
        validateStatus: null
      });

      console.log('[sing] audio fetch status:', audioResponse.status);
      if (audioResponse.status === 403) throw new Error('Audio URL returned 403 Forbidden.');
      if (audioResponse.status >= 400) throw new Error(`Audio fetch error ${audioResponse.status}`);

      audioResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: `🎧 Now playing: ${selectedVideo.title}\nDuration: ${selectedVideo.timestamp}`,
        attachment: fs.createReadStream(tempFilePath)
      });

      fs.unlink(tempFilePath, (err) => {
        if (err) message.reply(`Error deleting temp file: ${err.message}`);
      });

    } catch (error) {
      console.error('[sing] Error:', error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Error: ${error.message}`);
    }
  }
};
