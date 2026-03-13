let isCapturing = false;

chrome.action.onClicked.addListener(async (tab) => {
  if (isCapturing) {
    console.log("已在录制中，忽略重复点击");
    return;
  }

  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });

    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: '用于捕获标签页音频进行实时字幕识别'
      });
    }

    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      target: 'offscreen',
      data: { streamId, tabId: tab.id }
    });

    isCapturing = true;
    console.log("🚀 已通知 offscreen 开始捕获音频...");
  } catch (err) {
    console.error("启动失败:", err);
  }
});

// 转发字幕到 content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SUBTITLE_UPDATE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'UPDATE_SUBTITLES',
          text: message.text
        }).catch(() => {});
      }
    });
  }
});