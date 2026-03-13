(function () {
  // 防止重复注入
  if (document.getElementById('my-ai-subtitles')) return;

  // 创建字幕层
  const subtitleDiv = document.createElement('div');
  subtitleDiv.id = 'my-ai-subtitles';

  Object.assign(subtitleDiv.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#ffffff',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '22px',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.5',
    maxWidth: '80vw',
    textAlign: 'center',
    zIndex: '2147483647',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: 'none' // 默认隐藏，有字幕才显示
  });

  document.body.appendChild(subtitleDiv);

  // 自动隐藏定时器
  let hideTimer = null;

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'UPDATE_SUBTITLES' && request.text) {
      subtitleDiv.innerText = request.text;
      subtitleDiv.style.display = 'block';

      // 5 秒后自动隐藏
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        subtitleDiv.style.display = 'none';
      }, 5000);
    }
  });
})();