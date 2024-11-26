const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const axios = require('axios');
const math = require('mathjs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();

// Configure app to use EJS and body-parser
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Function to fetch data from Wikipedia
async function fetchFromWikipedia(query, lang) {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    try {
        const response = await axios.get(url);
        const image = response.data.thumbnail ? response.data.thumbnail.url : '';
        return {
            text: `Wikipedia: ${response.data.extract || 'No information found on Wikipedia.'}`,
            images: image ? [image] : []
        };
    } catch (err) {
        console.error('Error retrieving information from Wikipedia:', err.message);
        return null;
    }
}

// Function to fetch data from DuckDuckGo
async function fetchFromDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
    try {
        const response = await axios.get(url);
        const images = response.data.RelatedTopics.map(topic => topic.Icon && topic.Icon.URL).filter(Boolean);
        return {
            text: `DuckDuckGo: ${response.data.Abstract || 'No information found on DuckDuckGo.'}`,
            images: images.slice(0, 2) // Limit to 2 images
        };
    } catch (err) {
        console.error('Error retrieving information from DuckDuckGo:', err.message);
        return null;
    }
}

// Function to fetch data from Wolfram Alpha
async function fetchFromWolframAlpha(query) {
    const url = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&output=JSON&format=plaintext&appid=${process.env.WOLFRAM_APP_ID}`;
    try {
        const response = await axios.get(url);
        if (response.data.queryresult.success) {
            const pods = response.data.queryresult.pods;
            if (pods && pods[0].subpods) {
                const images = pods[0].subpods.map(subpod => subpod.img && subpod.img.src).filter(Boolean);
                return {
                    text: `Wolfram Alpha: ${pods[0].subpods[0].plaintext || 'No information found on Wolfram Alpha.'}`,
                    images: images.slice(0, 2) // Limit to 2 images
                };
            }
            return { text: 'Wolfram Alpha: No relevant information found for this query.', images: [] };
        }
        return { text: 'Wolfram Alpha: Query failed. Please check your input.', images: [] };
    } catch (err) {
        console.error('Error retrieving information from Wolfram Alpha:', err.message);
        return null;
    }
}

// Function to fetch news data
async function fetchFromNewsAPI(query) {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${process.env.NEWS_API_KEY}`;
    try {
        const response = await axios.get(url);
        const articles = response.data.articles;
        if (articles.length > 0) {
            const images = articles.map(article => article.urlToImage).filter(Boolean);
            return {
                text: `NewsAPI: ${articles.map(article => article.title).join(', ')}`,
                images: images.slice(0, 2) // Limit to 2 images
            };
        }
        return { text: 'NewsAPI: No news articles found.', images: [] };
    } catch (err) {
        console.error('Error retrieving information from NewsAPI:', err.message);
        return null;
    }
}

// Function to fetch weather data
async function fetchWeatherData(query) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${process.env.WEATHER_API_KEY}`;
    try {
        const response = await axios.get(url);
        const weatherIcon = `https://openweathermap.org/img/wn/${response.data.weather[0].icon}.png`;
        return {
            text: `Weather: Current weather in ${response.data.name}: ${response.data.weather[0].description}, temperature: ${response.data.main.temp}K`,
            images: [weatherIcon] // Only one weather icon
        };
    } catch (err) {
        console.error('Error retrieving weather data:', err.message);
        return null;
    }
}

// Function to fetch images from Pixabay
async function fetchFromPixabay(query) {
    const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo`;
    try {
        const response = await axios.get(url);
        const images = response.data.hits.map(hit => hit.webformatURL).filter(Boolean);
        return {
            text: `Pixabay: Found images for ${query}.`,
            images: images.length > 0 ? images.slice(0, 2) : [] // Limit to 2 images
        };
    } catch (err) {
        console.error('Error retrieving information from Pixabay:', err.message);
        return null;
    }
}

// Function to fetch random images from Pixabay
async function fetchRandomImages() {
    const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&image_type=photo&per_page=10`;
    try {
        const response = await axios.get(url);
        const randomImages = response.data.hits.map(hit => hit.webformatURL).filter(Boolean);
        return randomImages.length > 0 ? randomImages : [];
    } catch (err) {
        console.error('Error retrieving random images from Pixabay:', err.message);
        return [];
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('chat', { response: 'No response yet.', history: [], images: [] });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    const message = req.body.message.trim();
    const lang = req.body.lang || 'en';

    // Check if the message is too long
    if (message.length > 500) {
        return res.render('chat', { response: 'Your question is too long. Please shorten it and try again.', history: [], images: [] });
    }

    // Check if the message is a math expression
    let mathResult;
    try {
        mathResult = math.evaluate(message);
    } catch (error) {
        mathResult = null; // Not a math expression
    }

    // Check for predefined responses in the database
    const query = 'SELECT answer FROM qa WHERE question = ?';
    db.query(query, [message], async (error, results) => {
        if (error) {
            console.error('Error querying database:', error.message);
            return res.render('chat', { response: 'Error accessing database.', history: [], images: [] });
        }

        // If a predefined answer is found
        if (results.length > 0) {
            const randomImages = await fetchRandomImages(); // Get random images
            return res.render('chat', { response: results[0].answer, history: [], images: randomImages });
        }

        // If it's a math expression
        if (mathResult !== null) {
            // Store similar math questions in the database
            const similarQuery = 'SELECT question FROM qa WHERE question LIKE ?';
            db.query(similarQuery, [`%${mathResult}%`], async (err, similarResults) => {
                if (err) {
                    console.error('Error querying similar questions:', err.message);
                }
                const similarQuestions = similarResults.map(row => row.question).join(', ');
                const randomImages = await fetchRandomImages(); // Get random images
                return res.render('chat', {
                    response: `Result: ${mathResult}. Similar questions: ${similarQuestions}`,
                    images: randomImages,
                    history: []
                });
            });
        }

        // Fetch responses from all external sources
        const responses = await Promise.all([
            fetchFromWikipedia(message, lang),
            fetchFromDuckDuckGo(message),
            fetchFromWolframAlpha(message),
            fetchFromNewsAPI(message),
            fetchWeatherData(message),
            fetchFromPixabay(message) // Include Pixabay
        ]);

        // Filter out any null responses (indicating failed fetches)
        const validResponses = responses.filter(response => response !== null);

        // Check if all sources failed
        if (validResponses.length === 0) {
            return res.render('chat', { response: 'Sorry, I could not find any information.', history: [], images: [] });
        }

        // Combine responses and random images
        const combinedText = validResponses.map(response => response.text).join('<br>');
        const combinedImages = validResponses.flatMap(response => response.images);

        // Fetch additional random images
        const additionalImages = await fetchRandomImages();
        const allImages = [...combinedImages, ...additionalImages];

        return res.render('chat', {
            response: combinedText,
            history: [],
            images: allImages
        });
    });
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
