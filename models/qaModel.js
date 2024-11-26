const mysql = require('mysql2');

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Function to add a new question and answer
function addQuestionAnswer(question, answer, callback) {
    const query = "INSERT INTO qa (question, answer) VALUES (?, ?)";
    db.query(query, [question, answer], (error, results) => {
        if (error) {
            console.error('Error adding question and answer:', error);
            return callback(false);
        }
        callback(true);
    });
}

// Function to retrieve all questions and answers
function getAllQuestionsAnswers(callback) {
    const query = "SELECT * FROM qa";
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error retrieving questions and answers:', error);
            return callback([]);
        }
        callback(results);
    });
}

module.exports = {
    addQuestionAnswer,
    getAllQuestionsAnswers,
};
