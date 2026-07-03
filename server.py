from flask import Flask, request, jsonify, send_from_directory
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')

# Ensure API key is set
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY is not set in the environment or .env file!")

# Initialize Gemini Client
client = None
if api_key:
    try:
        client = genai.Client()
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/screen', methods=['POST'])
def screen():
    if not client:
        return jsonify({"error": "Gemini API client not initialized. Check your API key settings."}), 500
    
    data = request.json or {}
    
    # Constructing the patient details string
    age = data.get("age", "Not specified")
    gender = data.get("gender", "Not specified")
    height = data.get("height", "Not specified")
    weight = data.get("weight", "Not specified")
    medical_history = data.get("medicalHistory", "None reported")
    medications = data.get("medications", "None reported")
    allergies = data.get("allergies", "None reported")
    
    lifestyle = data.get("lifestyle", {})
    smoking = lifestyle.get("smoking", "Not specified")
    alcohol = lifestyle.get("alcohol", "Not specified")
    exercise = lifestyle.get("exercise", "Not specified")
    sleep = lifestyle.get("sleep", "Not specified")
    
    complaint = data.get("complaint", "")
    onset = data.get("onset", "Not specified")
    severity = data.get("severity", "Not specified")
    duration = data.get("duration", "Not specified")
    better_worse = data.get("betterWorse", "Not specified")
    associated_symptoms = data.get("associatedSymptoms", "None reported")
    additional_notes = data.get("additionalNotes", "")
    
    # Chat history if using the interactive chat agent
    chat_history = data.get("chatHistory", [])
    
    # Define system instruction based on core prompt
    system_instruction = (
        "You are MedSters AI, an AI-powered health screening assistant for the Google AI Capstone Project. "
        "Your purpose is to analyze a user's signs, symptoms, medical history, lifestyle, and available health data to estimate possible health conditions. "
        "You are not a replacement for a licensed doctor and should never provide a definitive diagnosis.\n\n"
        "GUIDELINES:\n"
        "- Be professional, compassionate, and evidence-based.\n"
        "- Explain your reasoning clearly.\n"
        "- Ask follow-up questions instead of making assumptions when information is missing.\n"
        "- Never claim certainty without sufficient information.\n"
        "- Clearly state that the assessment is informational and not a medical diagnosis.\n\n"
        "EMERGENCY DETECTION:\n"
        "Immediately set the risk level to 'Emergency' and provide warnings if the user reports symptoms such as: "
        "Chest pain, difficulty breathing, stroke symptoms (facial drooping, arm weakness, speech difficulty), severe allergic reaction (anaphylaxis), "
        "heavy bleeding, loss of consciousness, seizures, or suicidal thoughts.\n\n"
        "OUTPUT FORMAT:\n"
        "You must return a JSON response with the following keys:\n"
        "1. patientSummary: A concise professional summary of the patient's demographics, clinical history, and lifestyle.\n"
        "2. symptoms: An array of strings representing the key symptoms identified.\n"
        "3. conditions: An array of objects, ranked by likelihood, where each object has:\n"
        "   - name: Name of the possible condition\n"
        "   - probability: Estimated likelihood in percent (string, e.g. '70%')\n"
        "   - reasoning: Clinical explanation for this condition based on symptoms and history\n"
        "4. riskLevel: A string indicating severity. Must be exactly one of: 'Low', 'Moderate', 'High', 'Emergency'\n"
        "5. recommendedTests: An array of strings recommending appropriate medical tests (if needed)\n"
        "6. recommendations: An array of clinical recommendations (lifestyle improvements, home care advice, when to see a doctor/seek emergency care)\n"
        "7. confidenceScore: An integer from 0 to 100 representing your confidence in this assessment based on the completeness of information provided.\n"
        "8. followUpQuestions: An array of strings representing questions to ask the patient to clarify or gather missing information to increase assessment accuracy.\n"
        "9. assistantReply: A conversational, empathetic, and professional response to display directly in the chat bubble to the patient. It should respond to what they said, explain your current thoughts on the screening, and ask the next relevant question (e.g., if information is missing or you need clarification)."
    )
    
    # Constructing prompt text
    user_prompt = f"""
Please analyze the following patient screening data:

PATIENT INFORMATION:
- Age: {age}
- Gender: {gender}
- Height: {height}
- Weight: {weight}
- Medical History: {medical_history}
- Current Medications: {medications}
- Allergies: {allergies}
- Lifestyle:
  * Smoking: {smoking}
  * Alcohol: {alcohol}
  * Exercise: {exercise}
  * Sleep: {sleep}

MAIN COMPLAINT:
- Primary Complaint: {complaint}
- Onset (When did it start?): {onset}
- Severity (1-10): {severity}
- Duration: {duration}
- What makes it better or worse?: {better_worse}
- Associated Symptoms: {associated_symptoms}
- Additional Notes: {additional_notes}
"""

    if chat_history:
        user_prompt += "\nCHAT HISTORY SO FAR:\n"
        for msg in chat_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            user_prompt += f"{role.upper()}: {content}\n"
        
        user_prompt += "\nPlease incorporate this dialogue in your analysis and update the JSON output."

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction=system_instruction
            )
        )
        
        # Parse JSON response to ensure it's valid JSON
        result = json.loads(response.text)
        return jsonify(result)
    except json.JSONDecodeError as je:
        print(f"JSON Decode Error: {je}. Raw output was: {response.text}")
        return jsonify({
            "error": "Failed to parse API output as JSON",
            "raw_text": response.text if 'response' in locals() else ""
        }), 500
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(debug=True, port=5000)
