// modules/chatbot.js
const axios = require('axios');

async function fetchWikiSummary(query) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    try {
        const response = await axios.get(url);
        if (response.data.extract) {
            return response.data.extract;
        } else {
            return "Sorry, I couldn't find any information on that topic.";
        }
    } catch (error) {
        console.error('Error fetching Wikipedia summary:', error);
        return "I'm sorry, there was an error retrieving information.";
    }
}

function evaluateMathExpression(expression) {
    try {
        const result = eval(expression);
        return `The result of ${expression} is ${result}`;
    } catch (error) {
        console.error('Math evaluation error:', error);
        return "I'm sorry, I couldn't evaluate that expression.";
    }
}

module.exports = {
    fetchWikiSummary,
    evaluateMathExpression
};
