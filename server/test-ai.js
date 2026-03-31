import { getAIIntent } from "./services/aiService.js";
import 'dotenv/config';

(async () => {
    try {
        const intent = await getAIIntent("how many hot contacts do I have");
        console.log("Intent:", JSON.stringify(intent, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
