const mysql = require('mysql2');
const axios = require('axios');
const math = require('mathjs');

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Simple translation dictionary (for demonstration)
const translations = {
    en: { greeting: "Hello!", sorry: "I'm sorry, I couldn't find anything on that topic." },
    sw: { greeting: "Habari!", sorry: "Samahani, siwezi kupata chochote kuhusu mada hiyo." },
    // Add more translations for other languages...
};

// Function to fetch from Wikipedia
async function fetchFromWikipedia(query) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&utf8=&formatversion=2`;
    try {
        const response = await axios.get(url);
        if (response.data.query.search.length > 0) {
            return response.data.query.search[0].snippet.replace(/<[^>]+>/g, ''); // Remove HTML tags
        } else {
            return translations['en'].sorry; // Default message in English
        }
    } catch (error) {
        console.error('Error fetching data from Wikipedia:', error);
        return translations['en'].sorry; // Default message in English
    }
}

// Function to evaluate math expressions
function evaluateMathExpression(expression) {
    try {
        const result = math.evaluate(expression);
        return `The answer is: ${result}`;
    } catch (error) {
        return "Sorry, I couldn't evaluate that expression.";
    }
}

// Function to translate responses
function translateResponse(response, lang) {
    return translations[lang] ? translations[lang][response] || response : response;
}

// Function to save chat history to the database
function saveChatHistory(userMessage, responseMessage, lang) {
    const query = "INSERT INTO chat_history (user_message, bot_response, language) VALUES (?, ?, ?)";
    db.query(query, [userMessage, responseMessage, lang], (error, results) => {
        if (error) {
            console.error('Error saving chat history:', error);
        }
    });
}

// Function to retrieve chat history
function getChatHistory(callback) {
    const query = "SELECT * FROM chat_history ORDER BY created_at DESC LIMIT 10";
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error retrieving chat history:', error);
            return callback([]);
        }
        callback(results);
    });
}

// Function to get custom answer from the database
function getCustomAnswer(userMessage, callback) {
    const query = "SELECT answer FROM qa WHERE question = ?";
    db.query(query, [userMessage], (error, results) => {
        if (error) {
            console.error('Error fetching custom answer:', error);
            return callback(null);
        }
        callback(results.length > 0 ? results[0].answer : null);
    });
}

module.exports = {
    fetchFromWikipedia,
    evaluateMathExpression,
    translateResponse,
    saveChatHistory,
    getChatHistory,
    getCustomAnswer, // Export new function
};
