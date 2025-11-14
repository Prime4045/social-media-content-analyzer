function analyzeText(text) {
    const suggestions = [];
    const cleaned = text.replace(/\s+/g, ' ').trim();

    // 1) Length checks
    if (cleaned.length === 0) {
        suggestions.push({ type: 'empty', message: 'No text found. Upload a file or type a post.' });
        return suggestions;
    }

    if (cleaned.length < 30) {
        suggestions.push({ type: 'length', message: 'Post is short — consider adding more context (30+ characters).' });
    } else if (cleaned.length > 300) {
        suggestions.push({ type: 'length', message: 'Post is long — consider summarizing to keep readers engaged.' });
    } else {
        suggestions.push({ type: 'length', message: 'Post length looks good.' });
    }

    // 2) Hashtags
    const hashtags = (cleaned.match(/#\w+/g) || []);
    if (hashtags.length === 0) {
        suggestions.push({ type: 'hashtags', message: 'No hashtags found — add 2-4 relevant hashtags to increase reach.' });
    } else if (hashtags.length > 6) {
        suggestions.push({ type: 'hashtags', message: `Found ${hashtags.length} hashtags — try to limit to 2-4.` });
    } else {
        suggestions.push({ type: 'hashtags', message: `Hashtags found (${hashtags.length}) — looks fine.` });
    }


    // 3) CTA (call-to-action)
    const ctaPattern = /\b(comment|share|like|follow|tag|subscribe|dm|message)\b/i;
    if (!ctaPattern.test(cleaned)) {
        suggestions.push({ type: 'cta', message: 'No call-to-action detected — add a CTA like "Share your thoughts" or "Comment below".' });
    } else {
        suggestions.push({ type: 'cta', message: 'CTA detected — good job!' });
    }


    // 4) Emojis
    const emojiPattern = /([\u231A-\uD83E\uDDFF])/;
    if (!emojiPattern.test(cleaned)) {
        suggestions.push({ type: 'emoji', message: 'No emojis detected — add 1-2 emojis to increase engagement (where appropriate).' });
    } else {
        suggestions.push({ type: 'emoji', message: 'Emojis present — good for engagement.' });
    }


    // 5) Questions (engaging opener)
    const questionPattern = /\?/;
    if (!questionPattern.test(cleaned)) {
        suggestions.push({ type: 'question', message: 'No question found — asking a question can increase comments.' });
    } else {
        suggestions.push({ type: 'question', message: 'Question detected — good for engagement.' });
    }


    // 6) Sentiment (very naive)
    const positiveWords = ['good', 'great', 'awesome', 'love', 'excited', 'happy', 'best'];
    const negativeWords = ['bad', 'sad', 'hate', 'worst', 'angry', 'problem', 'issue'];
    const lc = cleaned.toLowerCase();
    const posCount = positiveWords.reduce((acc, w) => acc + (lc.includes(w) ? 1 : 0), 0);
    const negCount = negativeWords.reduce((acc, w) => acc + (lc.includes(w) ? 1 : 0), 0);
    if (posCount > negCount) {
        suggestions.push({ type: 'sentiment', message: 'Overall tone is positive — good for shares.' });
    } else if (negCount > posCount) {
        suggestions.push({ type: 'sentiment', message: 'Tone is negative — be careful, negative posts may reduce engagement.' });
    } else {
        suggestions.push({ type: 'sentiment', message: 'Neutral tone.' });
    }


    // 7) Readability: simple check for long words
    const longWords = cleaned.split(/\s+/).filter(w => w.length > 12);
    if (longWords.length > 3) {
        suggestions.push({ type: 'readability', message: 'Some long words detected — consider simplifying language.' });
    } else {
        suggestions.push({ type: 'readability', message: 'Language complexity looks OK.' });
    }


    return suggestions;
}


module.exports = { analyzeText };