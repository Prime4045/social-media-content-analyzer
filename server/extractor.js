const pdfParse = require('pdf-parse');


async function extractTextFromPDF(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (err) {
        console.error('PDF parse error', err);
        return '';
    }
}


module.exports = { extractTextFromPDF };