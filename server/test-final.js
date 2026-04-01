import { parseIntent } from './utils/intentParser.js';

const queries = [
    "hi",
    "hello",
    "hot deals",
    "warm contacts",
    "how many cold companies",
    "details of Rahul"
];

queries.forEach(q => {
    console.log(`\nQuery: "${q}"`);
    console.log(JSON.stringify(parseIntent(q), null, 2));
});
