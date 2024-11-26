# scripts/train_model.py

import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
import joblib

# Sample data
data = {
    'question': [
        'What is your name?',
        'How are you?',
        'What can you do?',
        'Tell me a joke',
        'What is the weather today?'
    ],
    'answer': [
        'I am a chatbot.',
        'I am doing well, thank you!',
        'I can answer your questions.',
        'Why did the scarecrow win an award? Because he was outstanding in his field!',
        'I am not sure, but you can check the weather app.'
    ]
}

# Create DataFrame
df = pd.DataFrame(data)

# Create model
model = make_pipeline(CountVectorizer(), MultinomialNB())
model.fit(df['question'], df['answer'])

# Save model
joblib.dump(model, 'intent_model.pkl')
