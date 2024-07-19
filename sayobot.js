'use strict'

const querystring = require('querystring')
const https = require("https")
const axios = require('axios')
const axios_ru = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

class BeatmapInfo {
  constructor(data) {
    this.sid = data.sid;
    this.setLink = `https://osu.ppy.sh/beatmapsets/${this.sid}`;

    this.audioFileName = [];
    this.fullMp3 = [];

    data.bid_data.map((bdata) => {
      const audioFileName = bdata.audio;
      const fullMp3 = `https://dl.sayobot.cn/beatmaps/files/${this.sid}/${audioFileName}`;

      if (audioFileName && !this.audioFileName.includes(audioFileName)) {
        this.audioFileName.push(audioFileName);
        this.fullMp3.push(fullMp3);
      }
    })
  }
}

class SearchResult {
  constructor(result) {
    this.status = result.status
    if (this.status === 0) {
      this.beatmapInfo = new BeatmapInfo(result.data)
    }
  }

  success() {
    return (this.status === 0)
  }
}

class SayabotApi {
  static async apiRequestV2(options) {
    const contents = (options) ? querystring.stringify(options) : ''
    const url = 'https://api.sayobot.cn/v2/beatmapinfo?' + contents
    let result = await axios_ru.get(url);
    return result.data;
  }

  /**
     * sayabot搜索谱面信息
     * @param {Number} sid setId
     * @returns {BeatmapInfo} 返回BeatmapInfo
     */
  static async search(sid, diffName) {
    const params = { K: sid, T: 0 } // T=1 匹配bid
    try {
      const result = await this.apiRequestV2(params);
      if (!result) throw '获取谱面详情失败'
      const searchResult = new SearchResult(result)
      if (!searchResult.success()) throw '查不到该谱面信息（谱面setId：' + sid + '）'
      return searchResult.beatmapInfo
    } catch (ex) {
      console.log('[sayabot] ' + ex)
      throw '获取谱面详情出错'
    }
  }
}

module.exports = SayabotApi
