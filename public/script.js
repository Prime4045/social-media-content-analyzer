
const fileInput = document.getElementById('fileInput');
const fileDrop = document.getElementById('fileDrop');
const uploadBtn = document.getElementById('uploadBtn');
const ocrBtn = document.getElementById('ocrBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyTxt');
const downloadBtn = document.getElementById('downloadTxt');
const insertSample = document.getElementById('insertSample');
const textInput = document.getElementById('textInput');
const resultsWrap = document.getElementById('results');
const insightsWrap = document.getElementById('insights');
const statusBox = document.getElementById('status');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');

let currentFile = null;
let ocrWorker = null;

function setStatus(text) { statusBox.textContent = text; }
function setBusy(b) {
    [uploadBtn, ocrBtn, analyzeBtn, clearBtn, copyBtn, downloadBtn].forEach(el => el.disabled = b);
    if (b) setStatus('Working...');
    else setStatus('Idle');
}

function showProgress(p) {
    progressWrap.style.display = p >= 0 ? 'block' : 'none';
    progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(p)))}%`;
}

fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('drag'); });
fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag'));
fileDrop.addEventListener('drop', (e) => {
    e.preventDefault(); fileDrop.classList.remove('drag');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) selectFile(f);
});

fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) selectFile(f);
});

function selectFile(file) {
    currentFile = file;
    setStatus(`Selected: ${file.name}`);
}

async function uploadFileToServer(file) {
    setBusy(true);
    showProgress(5);
    const form = new FormData();
    form.append('file', file);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        showProgress(60);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        showProgress(100);
        textInput.value = (data.text || '').trim();
        setStatus('Extraction complete.');
        renderResultsEmptyHint('Extraction complete. Edit text then Analyze.');
    } catch (err) {
        console.error(err);
        alert('Upload failed: ' + (err.message || err));
        setStatus('Error during upload.');
    } finally {
        showProgress(-1);
        setBusy(false);
    }
}

async function runOCROnImage(file) {
    setBusy(true);
    showProgress(2);
    setStatus('Initializing OCR (Tesseract)...');

    try {
        ocrWorker = Tesseract.createWorker({
            logger: m => {
                if (m && typeof m.progress === 'number') {
                    showProgress(m.progress * 80);
                    setStatus(`${m.status} — ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        await ocrWorker.load();
        await ocrWorker.loadLanguage('eng');
        await ocrWorker.initialize('eng');

        
        const result = await ocrWorker.recognize(file);
        const text = result?.data?.text || '';
        textInput.value = text.trim();
        setStatus('OCR complete.');
        renderResultsEmptyHint('OCR complete. Edit text then Analyze.');
    } catch (err) {
        console.error('OCR error', err);
        alert('OCR failed — try a clearer image or use a PDF/TXT upload.');
        setStatus('OCR failed.');
    } finally {
        if (ocrWorker) {
            try { await ocrWorker.terminate(); } catch (_) { }
            ocrWorker = null;
        }
        showProgress(-1);
        setBusy(false);
    }
}

async function analyzeTextOnServer(text) {
    setBusy(true);
    setStatus('Sending text for analysis...');
    showProgress(3);
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        showProgress(40);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        showProgress(100);
        renderSuggestions(data.suggestions || []);
        setStatus('Analysis finished.');
    } catch (err) {
        console.error(err);
        alert('Analysis error: ' + (err.message || err));
        setStatus('Error analyzing text.');
    } finally {
        showProgress(-1);
        setBusy(false);
    }
}

function renderResultsEmptyHint(msg) {
    resultsWrap.className = 'results';
    resultsWrap.innerHTML = `<div class="empty-state">
    <span class="material-icons">insights</span>
    <p>${escapeHtml(msg || 'No analysis yet — upload or paste text and click Analyze.')}</p>
    <button id="insertSampleBtn" class="btn tiny">Insert sample post</button>
  </div>`;
    const btn = document.getElementById('insertSampleBtn');
    if (btn) btn.addEventListener('click', insertSampleText);
    insightsWrap.innerHTML = '';
}

function renderSuggestions(items) {
    if (!items || items.length === 0) {
        renderResultsEmptyHint('No suggestions returned.');
        return;
    }
    resultsWrap.innerHTML = '';
    insightsWrap.innerHTML = '';
    items.forEach((it, idx) => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        const ico = document.createElement('div');
        ico.className = 'ico';
        ico.textContent = iconForType(it.type);
        const meta = document.createElement('div');
        meta.className = 'meta';
        const title = document.createElement('h4');
        title.textContent = `${idx + 1}. ${capitalize(it.type || 'Tip')}`;
        const p = document.createElement('p');
        p.textContent = it.message || '';
        meta.appendChild(title); meta.appendChild(p);

        const actions = document.createElement('div');
        actions.className = 'suggestion-actions';
        const copy = document.createElement('button'); copy.className = 'btn tiny'; copy.textContent = 'Copy tip';
        copy.addEventListener('click', () => navigator.clipboard.writeText(it.message || ''));
        actions.appendChild(copy);

        card.appendChild(ico);
        card.appendChild(meta);
        card.appendChild(actions);
        insightsWrap.appendChild(card);
    });
}

function capitalize(s) { return (s || '').toString().replace(/^\w/, c => c.toUpperCase()); }
function iconForType(t) {
    if (!t) return '💡';
    const map = {
        hashtags: '#', cta: '➡️', length: '🔤', emoji: '😊', sentiment: '💬', question: '❓', readability: '✍️', empty: '⚠️'
    };
    return map[t] || '💡';
}
function escapeHtml(s) { return s?.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || ''; }

uploadBtn.addEventListener('click', async () => {
    if (!currentFile) return alert('Choose a file first.');
    const name = (currentFile.name || '').toLowerCase();
    if (name.endsWith('.pdf') || name.endsWith('.txt')) {
        await uploadFileToServer(currentFile);
    } else {
        alert('The Extract button is for PDF/TXT. For images, use OCR button.');
    }
});

ocrBtn.addEventListener('click', async () => {
    if (!currentFile) return alert('Choose an image file first (PNG/JPG).');
    const mime = currentFile.type || '';
    if (!mime.startsWith('image/') && !currentFile.name.match(/\.(png|jpe?g|bmp|gif)$/i)) {
        return alert('Please select an image for OCR.');
    }
    await runOCROnImage(currentFile);
});

analyzeBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) return alert('Please paste or extract text before analyzing.');
    await analyzeTextOnServer(text);
});

clearBtn.addEventListener('click', () => {
    textInput.value = '';
    renderResultsEmptyHint('Text cleared. Paste or upload new text to analyze.');
});

copyBtn.addEventListener('click', async () => {
    const txt = textInput.value || '';
    if (!txt) return alert('No text to copy.');
    await navigator.clipboard.writeText(txt);
    alert('Text copied to clipboard.');
});

downloadBtn.addEventListener('click', () => {
    const txt = textInput.value || '';
    if (!txt) return alert('No text to download.');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'extracted-post.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
});

function insertSampleText() {
    const sample = `Excited to share our new labelling tool for creators! 🚀\nHave you tried it yet? Comment below with your thoughts. #creators #tool #socialmedia`;
    textInput.value = sample;
    setStatus('Sample text inserted.');
}

(function init() {
    renderResultsEmptyHint();
    setStatus('Idle');
    showProgress(-1);
    if (insertSample) insertSample.addEventListener('click', insertSampleText);
})();
