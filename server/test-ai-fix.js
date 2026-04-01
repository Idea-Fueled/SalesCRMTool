import { parseIntent } from './utils/intentParser.js';

const queries = [
    "how many deals do i have in total?",
    "how many hot deals do i have",
    "show me deals for anirudh"
];

queries.forEach(q => {
    console.log(`\nQuery: "${q}"`);
    console.log(JSON.stringify(parseIntent(q), null, 2));
});
