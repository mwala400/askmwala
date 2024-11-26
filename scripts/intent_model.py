# scripts/intent_model.py

import sys
import joblib

# Load the trained model
model = joblib.load('intent_model.pkl')

# Get the input message
input_message = sys.argv[1]

# Predict the intent
predicted_intent = model.predict([input_message])[0]

# Print the predicted intent
print(predicted_intent)
