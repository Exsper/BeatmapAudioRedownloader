const fs = require('fs');
const path = require('path');
const sayobot = require('./sayobot');
const axios = require('axios');

const directoryPath = './Songs';

async function searchBeatmap(beatmapSetId) {
    // 用sayobot获取谱面信息
    const beatmapInfo = await sayobot.search(beatmapSetId);
    return beatmapInfo;
}

async function downloadSong(url, path) {
    const response = await axios({
        url: url,
        method: "GET",
        responseType: "stream",
    });

    response.data.pipe(fs.createWriteStream(path));

    return new Promise((resolve, reject) => {
        response.data.on("end", () => {
            resolve();
        });
        response.data.on("error", (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log("正在读取Songs列表...");
    let files;
    try {
        files = fs.readdirSync(directoryPath, { withFileTypes: true });
    }
    catch (ex) {
        console.error("读取目录出错: \r\n", ex);
        return;
    }

    const directories = files.filter(file => file.isDirectory()).map(file => file.name);
    const setIds = [];
    const beatmapDirs = [];
    directories.map((dir) => {
        const sid = dir.split(" ")[0];
        if (/^[0-9]+$/.test(sid)) {
            setIds.push(sid);
            beatmapDirs.push(path.join(directoryPath, dir));
        }
        else console.warn("文件夹 " + dir + " 名称不包含sid，跳过");
    });
    console.log("共有 "+ setIds.length + " 个SetId待检查");
    for (let i = 0; i < setIds.length; i++) {
        let indexText = "[" + (i+1) + "/"+ setIds.length + "] ";
        console.log(indexText + setIds[i] + ": 获取谱面集信息...");
        let beatmapInfo;
        try {
            beatmapInfo = await searchBeatmap(setIds[i]);
        }
        catch(ex) {
            console.log(indexText + setIds[i] + ": 获取谱面集信息失败，移入“失败的谱面集ID.txt”");
            fs.appendFileSync('./失败的谱面集ID.txt', setIds[i] + '\r\n');
            continue;
        }
        let audioFileName = beatmapInfo.audioFileName;
        let fullMp3 = beatmapInfo.fullMp3;
        let beatmapPath = beatmapDirs[i];
        for (let audioIndex = 0; audioIndex < audioFileName.length; audioIndex++) {
            let songPath = path.join(beatmapPath, audioFileName[audioIndex]);
            let fileExist = false;
            try {
                fileExist = await fs.promises.access(songPath, fs.constants.F_OK);
                console.log(indexText + setIds[i] + ": 已存在 "+ audioFileName[audioIndex] + " ，跳过");
                continue;
            }
            catch(ex) {
                console.log(indexText + setIds[i] + ": "+ audioFileName[audioIndex] + " 不存在，正在下载...");
                try {
                    await downloadSong(fullMp3[audioIndex], songPath);
                    console.log(indexText + setIds[i] + ": "+ audioFileName[audioIndex] + " 下载成功");
                }
                catch(ex) {
                    console.log(indexText + setIds[i] + ": "+ audioFileName[audioIndex] + " 下载失败，移入“失败的谱面集ID.txt”");
                    fs.appendFileSync('./失败的谱面集ID.txt', setIds[i] + '\r\n');
                }
            }
        }
    }

    console.log("检查完成，如有下载失败情况，请检查“失败的谱面集ID.txt”");
}

main();
