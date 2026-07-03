document.addEventListener('DOMContentLoaded', () => {
    // State management
    let activeStep = 1;
    let chatHistory = [];
    const totalSteps = 4;

    // Cache elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const wizardStepElements = document.querySelectorAll('.wizard-step');
    const stepNumElements = document.querySelectorAll('.step-num');
    const wizardProgressBar = document.getElementById('wizardProgressBar');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitWizardBtn = document.getElementById('submitWizardBtn');
    const intakeForm = document.getElementById('intakeForm');
    const severityInput = document.getElementById('severity');
    const severityVal = document.getElementById('severityVal');
    
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const resetSessionBtn = document.getElementById('resetSessionBtn');
    
    const dashboardEmptyState = document.getElementById('dashboardEmptyState');
    const dashboardLoadingState = document.getElementById('dashboardLoadingState');
    const dashboardActiveState = document.getElementById('dashboardActiveState');
    
    // Dashboard fields
    const summaryDemographics = document.getElementById('summaryDemographics');
    const confidenceValue = document.getElementById('confidenceValue');
    const patientSummaryText = document.getElementById('patientSummaryText');
    const emergencyWarningBox = document.getElementById('emergencyWarningBox');
    const emergencyWarningText = document.getElementById('emergencyWarningText');
    const riskLevelValue = document.getElementById('riskLevelValue');
    const symptomTagContainer = document.getElementById('symptomTagContainer');
    const conditionsList = document.getElementById('conditionsList');
    const followUpQuestionsSection = document.getElementById('followUpQuestionsSection');
    const followUpList = document.getElementById('followUpList');
    const recommendedTestsList = document.getElementById('recommendedTestsList');
    const recommendationsList = document.getElementById('recommendationsList');

    // -------------------------------------------------------------
    // 1. Tab Switching Logic
    // -------------------------------------------------------------
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // -------------------------------------------------------------
    // 2. Wizard Intake Form Logic
    // -------------------------------------------------------------
    // Update severity slider text
    severityInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        let rating = "Moderate";
        if (val <= 3) rating = "Mild";
        else if (val >= 8) rating = "Severe";
        severityVal.textContent = `${val} - ${rating}`;
    });

    // Validate fields for current step
    function validateStep(step) {
        const activeStepElement = document.querySelector(`.wizard-step[data-step="${step}"]`);
        const requiredInputs = activeStepElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'var(--color-emergency)';
                // Reset border color on input
                input.addEventListener('input', function resetBorder() {
                    input.style.borderColor = 'var(--border-color)';
                    input.removeEventListener('input', resetBorder);
                });
            }
        });
        
        if (!isValid) {
            // Show alert or visual cue
            const firstInvalid = activeStepElement.querySelector('[required]:invalid');
            if (firstInvalid) firstInvalid.focus();
        }
        
        return isValid;
    }

    // Update wizard step view
    function updateWizard() {
        // Update Step visibility
        wizardStepElements.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.getAttribute('data-step')) === activeStep) {
                step.classList.add('active');
            }
        });

        // Update Step dots
        stepNumElements.forEach(num => {
            const stepVal = parseInt(num.getAttribute('data-step'));
            num.classList.remove('active', 'complete');
            if (stepVal === activeStep) {
                num.classList.add('active');
            } else if (stepVal < activeStep) {
                num.classList.add('complete');
                num.innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                num.textContent = stepVal;
            }
        });

        // Update progress bar width
        const progressPct = ((activeStep - 1) / (totalSteps - 1)) * 100;
        wizardProgressBar.style.width = `${progressPct}%`;

        // Update button actions
        prevBtn.disabled = (activeStep === 1);
        
        if (activeStep === totalSteps) {
            nextBtn.classList.add('hidden');
            submitWizardBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitWizardBtn.classList.add('hidden');
        }
    }

    // Wizard Next & Previous listeners
    nextBtn.addEventListener('click', () => {
        if (validateStep(activeStep)) {
            if (activeStep < totalSteps) {
                activeStep++;
                updateWizard();
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (activeStep > 1) {
            activeStep--;
            updateWizard();
        }
    });

    // Helper to get wizard data
    function getFormData() {
        const formData = new FormData(intakeForm);
        const data = {
            age: formData.get('age') || '',
            gender: formData.get('gender') || '',
            height: formData.get('height') || '',
            weight: formData.get('weight') || '',
            allergies: formData.get('allergies') || '',
            medicalHistory: formData.get('medicalHistory') || '',
            medications: formData.get('medications') || '',
            lifestyle: {
                smoking: formData.get('smoking') || 'Non-smoker',
                alcohol: formData.get('alcohol') || 'None',
                exercise: formData.get('exercise') || 'Sedentary',
                sleep: formData.get('sleep') || '7-8 hours'
            },
            complaint: formData.get('complaint') || '',
            onset: formData.get('onset') || '',
            duration: formData.get('duration') || '',
            severity: formData.get('severity') || '5',
            betterWorse: formData.get('betterWorse') || '',
            associatedSymptoms: formData.get('associatedSymptoms') || ''
        };
        return data;
    }

    // Submit wizard form
    submitWizardBtn.addEventListener('click', async () => {
        if (!validateStep(activeStep)) return;
        
        const payload = getFormData();
        // Since we are starting the analysis, let's reset chat history to match the wizard session
        chatHistory = [];
        await sendScreeningRequest(payload);
    });

    // -------------------------------------------------------------
    // 3. Conversational AI Chat Logic
    // -------------------------------------------------------------
    function addMessageToChat(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);
        
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.textContent = text;
        
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        const now = new Date();
        timeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(bubble);
        messageDiv.appendChild(timeSpan);
        chatBox.appendChild(messageDiv);
        
        // Auto scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function handleChatSubmit() {
        const text = chatInput.value.trim();
        if (!text) return;
        
        // Add user message to UI and history
        addMessageToChat('user', text);
        chatHistory.push({ role: 'user', content: text });
        chatInput.value = '';
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        
        // Add standard visual typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'assistant', 'typing-indicator-msg');
        typingIndicator.innerHTML = `
            <div class="message-bubble" style="display: flex; gap: 4px; padding: 12px 16px;">
                <span class="dot" style="width: 6px; height: 6px; background-color: var(--text-muted); border-radius: 50%; animation: pulse 1.2s infinite ease-in-out;"></span>
                <span class="dot" style="width: 6px; height: 6px; background-color: var(--text-muted); border-radius: 50%; animation: pulse 1.2s infinite 0.2s ease-in-out;"></span>
                <span class="dot" style="width: 6px; height: 6px; background-color: var(--text-muted); border-radius: 50%; animation: pulse 1.2s infinite 0.4s ease-in-out;"></span>
            </div>
        `;
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Compile payload. Merge any existing form inputs with chat history.
        const wizardData = getFormData();
        const payload = {
            ...wizardData,
            chatHistory: chatHistory
        };

        // Call screening backend
        const responseData = await sendScreeningRequest(payload, true);
        
        // Remove typing indicator
        const indicator = chatBox.querySelector('.typing-indicator-msg');
        if (indicator) indicator.remove();
        
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        chatInput.focus();

        if (responseData && responseData.assistantReply) {
            addMessageToChat('assistant', responseData.assistantReply);
            chatHistory.push({ role: 'model', content: responseData.assistantReply });
        }
    }

    sendChatBtn.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleChatSubmit();
        }
    });

    // -------------------------------------------------------------
    // 4. API Request Handler
    // -------------------------------------------------------------
    async function sendScreeningRequest(payload, isChatMode = false) {
        // Toggle dashboard layout state
        dashboardEmptyState.classList.add('hidden');
        dashboardLoadingState.classList.remove('hidden');
        dashboardActiveState.classList.add('hidden');
        
        try {
            const response = await fetch('/api/screen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error occurred');
            }
            
            const data = await response.json();
            
            dashboardLoadingState.classList.add('hidden');
            dashboardActiveState.classList.remove('hidden');
            
            renderDashboard(data);
            return data;
        } catch (error) {
            console.error('Screening API Error:', error);
            dashboardLoadingState.classList.add('hidden');
            
            if (isChatMode) {
                // If in chat mode, show error message inside chat bubble
                const indicator = chatBox.querySelector('.typing-indicator-msg');
                if (indicator) indicator.remove();
                addMessageToChat('assistant', `I encountered an issue analyzing your request: ${error.message}. Please check your Gemini API configurations.`);
            }
            
            // Show error in dashboard pane
            dashboardEmptyState.classList.remove('hidden');
            const placeholderHeader = dashboardEmptyState.querySelector('h2');
            const placeholderDesc = dashboardEmptyState.querySelector('p');
            placeholderHeader.textContent = "Screening Request Failed";
            placeholderHeader.style.color = "var(--color-emergency)";
            placeholderDesc.textContent = `Error details: ${error.message}. Please ensure the python server is running and your API key is correctly specified in .env`;
            
            return null;
        }
    }

    // -------------------------------------------------------------
    // 5. Dashboard Renderer
    // -------------------------------------------------------------
    function renderDashboard(data) {
        // 1. Core Summary Metrics
        const ageText = data.patientSummary.match(/\b\d{1,3}\b/) || "Age -";
        const genderVal = data.patientSummary.includes('female') || data.patientSummary.includes('Female') ? 'F' : 'M';
        
        summaryDemographics.textContent = `Patient Diagnostic File: ${genderVal} | ${data.confidenceScore}% Confidence`;
        confidenceValue.textContent = `${data.confidenceScore}%`;
        
        // Adjust confidence indicator color
        if (data.confidenceScore >= 75) {
            confidenceValue.className = 'gauge-val';
            confidenceValue.style.color = 'var(--color-low)';
        } else if (data.confidenceScore >= 45) {
            confidenceValue.style.color = 'var(--color-moderate)';
        } else {
            confidenceValue.style.color = 'var(--color-emergency)';
        }
        
        patientSummaryText.textContent = data.patientSummary;

        // 2. Risk Level Configuration
        const risk = (data.riskLevel || 'Low').trim();
        riskLevelValue.textContent = risk;
        
        // Reset classes
        riskLevelValue.className = '';
        emergencyWarningBox.classList.add('hidden');
        
        if (risk === 'Low') {
            riskLevelValue.classList.add('risk-low');
        } else if (risk === 'Moderate') {
            riskLevelValue.classList.add('risk-moderate');
        } else if (risk === 'High') {
            riskLevelValue.classList.add('risk-high');
        } else if (risk === 'Emergency') {
            riskLevelValue.classList.add('risk-emergency');
            emergencyWarningBox.classList.remove('hidden');
            emergencyWarningText.innerHTML = `<strong>CRITICAL DANGER:</strong> Immediate emergency symptoms detected in analysis. Please stop this chat and call emergency responders (911) or proceed directly to an emergency department. <em>Key triggers: ${data.symptoms.join(', ')}</em>`;
        }

        // 3. Symptoms tags mapping
        symptomTagContainer.innerHTML = '';
        if (data.symptoms && data.symptoms.length > 0) {
            data.symptoms.forEach(sym => {
                const tag = document.createElement('span');
                tag.classList.add('symptom-tag');
                tag.textContent = sym;
                symptomTagContainer.appendChild(tag);
            });
        } else {
            symptomTagContainer.innerHTML = '<em style="font-size: 0.75rem; color: var(--text-muted);">None parsed</em>';
        }

        // 4. Differential Diagnostics (Ranked Conditions)
        conditionsList.innerHTML = '';
        if (data.conditions && data.conditions.length > 0) {
            data.conditions.forEach((cond, index) => {
                const conditionCard = document.createElement('div');
                conditionCard.classList.add('condition-card');
                
                // Extract probability number
                const probNum = parseInt(cond.probability) || 0;
                
                conditionCard.innerHTML = `
                    <div class="condition-header">
                        <span class="condition-name">${index + 1}. ${cond.name}</span>
                        <span class="condition-probability">${cond.probability}</span>
                    </div>
                    <div class="probability-bar-track">
                        <div class="probability-bar-fill" style="width: ${probNum}%;"></div>
                    </div>
                    <button class="reasoning-toggle" data-index="${index}">
                        <i class="fa-solid fa-chevron-right"></i> Medical Reasoning
                    </button>
                    <div class="reasoning-content" id="reasoning-${index}">
                        ${cond.reasoning}
                    </div>
                `;
                conditionsList.appendChild(conditionCard);
            });
            
            // Add click events for medical reasoning collapsibles
            document.querySelectorAll('.reasoning-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = btn.getAttribute('data-index');
                    const content = document.getElementById(`reasoning-${idx}`);
                    const icon = btn.querySelector('i');
                    
                    if (content.classList.contains('active')) {
                        content.classList.remove('active');
                        icon.className = 'fa-solid fa-chevron-right';
                    } else {
                        content.classList.add('active');
                        icon.className = 'fa-solid fa-chevron-down';
                    }
                });
            });
        } else {
            conditionsList.innerHTML = '<div class="condition-card"><p style="font-size: 0.8rem; text-align: center;">No specific conditions estimated. Enter more details.</p></div>';
        }

        // 5. Follow Up Queries
        if (data.followUpQuestions && data.followUpQuestions.length > 0) {
            followUpQuestionsSection.classList.remove('hidden');
            followUpList.innerHTML = '';
            data.followUpQuestions.forEach(q => {
                const li = document.createElement('li');
                li.textContent = q;
                followUpList.appendChild(li);
            });
        } else {
            followUpQuestionsSection.classList.add('hidden');
        }

        // 6. Care Pathway Lists
        recommendedTestsList.innerHTML = '';
        if (data.recommendedTests && data.recommendedTests.length > 0) {
            data.recommendedTests.forEach(test => {
                const li = document.createElement('li');
                li.textContent = test;
                recommendedTestsList.appendChild(li);
            });
        } else {
            recommendedTestsList.innerHTML = '<li>No medical tests recommended.</li>';
        }

        recommendationsList.innerHTML = '';
        if (data.recommendations && data.recommendations.length > 0) {
            data.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsList.appendChild(li);
            });
        } else {
            recommendationsList.innerHTML = '<li>Standard home monitoring recommended.</li>';
        }
    }

    // -------------------------------------------------------------
    // 6. Reset & Reload Session
    // -------------------------------------------------------------
    resetSessionBtn.addEventListener('click', () => {
        // Reset state
        activeStep = 1;
        chatHistory = [];
        
        // Reset forms
        intakeForm.reset();
        severityVal.textContent = "5 - Moderate";
        
        // Reset wizard steps
        updateWizard();
        
        // Reset Chat UI
        chatBox.innerHTML = `
            <div class="message assistant">
                <div class="message-bubble">
                    Hello, I am MedSters AI. How can I help you today? Please tell me your age, gender, and the symptoms you are experiencing.
                </div>
                <span class="message-time">Just now</span>
            </div>
        `;
        chatInput.value = '';
        
        // Toggle dashboard layout state back to empty
        dashboardEmptyState.classList.remove('hidden');
        dashboardLoadingState.classList.add('hidden');
        dashboardActiveState.classList.add('hidden');
        
        // Reset header details
        const placeholderHeader = dashboardEmptyState.querySelector('h2');
        const placeholderDesc = dashboardEmptyState.querySelector('p');
        placeholderHeader.textContent = "Clinical Assessment Dashboard";
        placeholderHeader.style.color = "var(--text-light)";
        placeholderDesc.textContent = "Complete the guided intake form or chat with the AI assistant to populate patient metrics, estimated conditions, and clinical recommendations.";
    });

    // Run initial wizard setups
    updateWizard();
});
