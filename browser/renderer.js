
const webview = document.getElementById('webview')
const urlInput = document.getElementById('url-input')

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
    console.log("hello");
    let url = urlInput.value
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    webview.src = url
  }
})
