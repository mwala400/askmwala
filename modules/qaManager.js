import { Router } from 'express';
const router = Router();
import { getAllQuestionsAnswers, addQuestionAnswer } from '../models/qaModel';

router.get('/', (req, res) => {
    getAllQuestionsAnswers((qaList) => {
        res.render('qa', { qaList });
    });
});

router.post('/add', (req, res) => {
    const { question, answer } = req.body;
    addQuestionAnswer(question, answer, (success) => {
        if (success) {
            res.redirect('/qa');
        } else {
            res.status(500).send('Error adding question and answer.');
        }
    });
});

export default router;
