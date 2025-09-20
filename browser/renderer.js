
const webview = document.getElementById('webview')
const urlInput = document.getElementById('url-input')
const backBtn = document.getElementById('back-btn')
const forwardBtn = document.getElementById('forward-btn')
const reloadBtn = document.getElementById('reload-btn')
const goBtn = document.getElementById('go-btn')

// Navigation functions
backBtn.addEventListener('click', () => {
  if (webview.canGoBack()) {
    webview.goBack()
  }
})

forwardBtn.addEventListener('click', () => {
  if (webview.canGoForward()) {
    webview.goForward()
  }
})

reloadBtn.addEventListener('click', () => {
  webview.reload()
})

goBtn.addEventListener('click', () => {
  console.log("hello");
  let url = urlInput.value
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  webview.src = url
})

// Update URL bar when navigation occurs
webview.addEventListener('did-navigate', (event) => {
  urlInput.value = event.url
})

webview.addEventListener('did-navigate-in-page', (event) => {
  urlInput.value = event.url
})

// Handle Enter key in URL bar
urlInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    goBtn.click()
  }
})
