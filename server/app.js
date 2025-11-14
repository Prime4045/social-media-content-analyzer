const express = require('express');
const cors = require('cors');
const { extractTextFromPDF } = require('./extractor');
const { analyzeText } = require('./analyzer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });


app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });


        const ext = path.extname(file.originalname).toLowerCase();


        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(file.path);
            const text = await extractTextFromPDF(dataBuffer);
            fs.unlinkSync(file.path);
            return res.json({ text });
        }


        
        if (ext === '.txt') {
            const text = fs.readFileSync(file.path, 'utf8');
            fs.unlinkSync(file.path);
            return res.json({ text });
        }


        
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Unsupported file type. Use PDF or TXT.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});



app.post('/api/analyze', (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });
        const suggestions = analyzeText(text);
        return res.json({ suggestions });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});


const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open: ${SERVER_URL}`);
});