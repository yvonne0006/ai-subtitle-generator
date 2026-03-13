import { pipeline, env } from './transformers.js';

env.allowLocalModels = false;

let transcriber = null;
let isModelLoading = false;
let isRecording = false;

async function loadModel() {
  if (transcriber || isModelLoading) return;
  isModelLoading = true;
  console.log("⏳ 正在加载模型...");
  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      { revision: 'main' }
    );
    console.log("✅ 模型加载完成！");
  } catch (err) {
    console.error("❌ 模型加载失败:", err);
    isModelLoading = false;
  }
}

function getRMS(audioData) {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
  return Math.sqrt(sum / audioData.length);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;
  if (message.type === 'START_RECORDING') {
    if (isRecording) return;
    loadModel().then(() => startRecording(message.data.streamId));
  }
});

async function startRecording(streamId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    isRecording = true;

    const SAMPLE_RATE = 16000;
    const CHUNK_SIZE = SAMPLE_RATE * 2; // 每 2 秒处理一次，不重叠
    const SILENCE_THRESHOLD = 0.02;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = ctx.createMediaStreamSource(stream);
    source.connect(ctx.destination);

    const processor = ctx.createScriptProcessor(4096, 1, 1);
    let pcmBuffer = [];
    let isProcessing = false;

    processor.onaudioprocess = (e) => {
      const chunk = e.inputBuffer.getChannelData(0);
      pcmBuffer.push(...chunk);

      // 攒够 2 秒
      if (pcmBuffer.length < CHUNK_SIZE) return;

      // 取出 2 秒，清空缓冲区（不重叠）
      const audioData = new Float32Array(pcmBuffer.splice(0, CHUNK_SIZE));

      if (getRMS(audioData) < SILENCE_THRESHOLD) return;

      // 如果上一段还在处理，丢弃这段（避免积压）
      if (isProcessing) {
        console.log("⏳ 上一段处理中，跳过");
        return;
      }

      isProcessing = true;
      (async () => {
        try {
          const output = await transcriber(audioData, {
            language: 'english',
            task: 'transcribe',
            no_repeat_ngram_size: 3,
            repetition_penalty: 1.3
          });
          const text = output?.text?.trim();
          const isGarbage = !text
            || /^\[.*\]$/.test(text)
            || /^\(.*\)$/.test(text)
            || text.length < 2;
          if (!isGarbage) {
            chrome.runtime.sendMessage({ type: 'SUBTITLE_UPDATE', text });
          }
        } catch (err) {
          console.error("识别出错:", err);
        } finally {
          isProcessing = false;
        }
      })();
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    console.log("🎙️ 开始录制（2秒切片）...");

  } catch (err) {
    console.error("录制失败:", err);
    isRecording = false;
  }
}