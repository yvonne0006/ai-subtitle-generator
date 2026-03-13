// 1. 必须引入库文件，否则 pipeline 无法识别
import { pipeline, env } from './transformers.js';

// 指向本地的 WASM 文件路径（如果加载失败请检查此项）
env.allowLocalModels = false; 

let transcriber;

/**
 * 音频预处理：降频至 16kHz
 */
async function prepareAudio(audioBlob) {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new OfflineAudioContext(1, 16000 * 10, 16000); 
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
}

// 2. 核心监听逻辑：接收音频块并返回文字
self.onmessage = async (event) => {
    const { audioBlob } = event.data;

    try {
        // 第一次运行加载模型（约 40MB-70MB）
        if (!transcriber) {
            transcriber = await pipeline('speech-recognition', 'Xenova/whisper-tiny');
        }

        const audioData = await prepareAudio(audioBlob);
        const output = await transcriber(audioData);

        self.postMessage({ text: output.text });
    } catch (error) {
        console.error("AI 推理出错:", error);
    }
};