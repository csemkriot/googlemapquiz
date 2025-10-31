let map;
let activeItem = null;
let currentQuizItems = [];
let timerInterval = null;
let groqApiKey = '';
const QUESTION_TIME_LIMIT = 30;

// Basic country list for selection
const countries = [
    'USA', 'India', 'China', 'Brazil', 'Germany', 'France', 'Japan', 'Australia', 
    'Canada', 'United Kingdom', 'Russia', 'Italy', 'Spain', 'Mexico', 'South Africa',
    'Egypt', 'Nigeria', 'Kenya', 'Argentina', 'Chile', 'Thailand', 'Indonesia',
    'South Korea', 'Turkey', 'Greece', 'Norway', 'Sweden', 'Netherlands', 'Belgium'
];

// Color Configuration
const colors = {
  unanswered: '#1a73e8',
  correct: '#34a853',
  incorrect: '#ea4335'
};

// UI Elements
const setupModal = document.getElementById('setup-modal');
const setupIntroP = document.querySelector('#setup-modal .modal-content p');
const groqApiKeyInput = document.getElementById('groq-api-key');
const countrySelect = document.getElementById('country-select');
const topicSelect = document.getElementById('topic-select');
const generateTopicsBtn = document.getElementById('generate-topics');
const startQuizBtn = document.getElementById('start-quiz');

const mapElement = document.getElementById('map');
const quizHeader = document.getElementById('quiz-header');
const quizTitle = document.getElementById('quiz-title');
const scoreboard = document.getElementById('scoreboard');
const inputModal = document.getElementById('input-modal');
const itemNameInput = document.getElementById('item-name-input');
const timerDisplay = document.getElementById('timer-display');
const correctScoreEl = document.getElementById('correct-score');
const incorrectScoreEl = document.getElementById('incorrect-score');
const completeQuizBtn = document.getElementById('complete-quiz');
const summaryModal = document.getElementById('summary-modal');
const summaryList = document.getElementById('summary-list');
const closeSummaryBtn = document.getElementById('close-summary');
const restartQuizBtn = document.getElementById('restart-quiz');

// Groq AI Integration
async function callGroqAPI(prompt) {
    try {
        console.log('Making API call to Groq...');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('API Error Response:', errorData);
            throw new Error(`API request failed: ${response.status} - ${errorData}`);
        }

        const data = await response.json();

        return data.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
    }
}

async function generateTopics() {
    const selectedCountry = countrySelect.value;
    const selectedClassLevel = document.querySelector('input[name="class-level"]:checked').value;
    groqApiKey = groqApiKeyInput.value.trim();
    
    console.log('API Key:', groqApiKey ? 'Present' : 'Missing');
    console.log('Country:', selectedCountry);
    console.log('Class Level:', selectedClassLevel);
    
    if (!selectedCountry || !groqApiKey) {
        showError('Please select a country and enter Groq API key first.');
        return;
    }

    generateTopicsBtn.disabled = true;
    generateTopicsBtn.textContent = 'Generating...';
    
    try {
        const classLevelText = selectedClassLevel.replace('-', ' ').replace('class', 'Class');
        const prompt = `Give 5 topics for a Map based quiz application for ${classLevelText} on ${selectedCountry} Maps. The topics are related to some places to be spotted so that students can click on that spot and enter place name. Ensure you give only the topic names separated with commas and not a single extra line.`;

        console.log('Sending prompt:', prompt);
        const response = await callGroqAPI(prompt);

        
        // Parse comma-separated topics instead of JSON
        const topics = response.trim().split(',').map(topic => topic.trim());
        
        populateTopicsDropdown(topics);
        startQuizBtn.disabled = false;
        
    } catch (error) {
        showError('Failed to generate topics. Please check your API key and try again.');
        console.error('Topic generation error:', error);
    } finally {
        generateTopicsBtn.disabled = false;
        generateTopicsBtn.textContent = 'Generate Topics with AI';
    }
}

function populateTopicsDropdown(topics) {
    topicSelect.innerHTML = '<option value="">Select a Topic</option>';
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicSelect.appendChild(option);
    });
    topicSelect.disabled = false;
}

async function generateQuizItems() {
    const selectedCountry = countrySelect.value;
    const selectedTopic = topicSelect.value;
    const selectedClassLevel = document.querySelector('input[name="class-level"]:checked').value;
    
    const classLevelText = selectedClassLevel.replace('-', ' ').replace('class', 'Class');
    const prompt = `Generate 5 specific locations in ${selectedCountry} related to "${selectedTopic}" suitable for ${classLevelText} students. For each location provide name, latitude, longitude, and brief explanation. Return ONLY a valid JSON array without any markdown formatting or extra text:`;

    try {
        const response = await callGroqAPI(prompt);

        
        // Clean the response by removing markdown code blocks
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        
        const items = JSON.parse(cleanResponse.trim());
        // Validate and transform items
        const validItems = items.filter(item => {
            const hasName = item.name || item.Name;
            const hasLat = item.latitude || item.Latitude || item.coords?.lat;
            const hasLng = item.longitude || item.Longitude || item.coords?.lng;
            
            if (!hasName || (!hasLat && hasLat !== 0) || (!hasLng && hasLng !== 0)) {
                console.warn('Invalid item:', item);
                return false;
            }
            return true;
        });
        
        if (validItems.length === 0) {
            throw new Error('No valid items found in response');
        }
        
        // Add required properties and obfuscate answers
        return validItems.map((item, index) => {
            const latStr = item.latitude || item.Latitude || item.coords?.lat;
            const lngStr = item.longitude || item.Longitude || item.coords?.lng;
            const lat = +latStr; // Convert to number using unary plus
            const lng = +lngStr; // Convert to number using unary plus
            
            return {
                id: `item_${index}`,
                n: btoa(item.name || item.Name), // Obfuscated name
                coords: { lat, lng },
                e: btoa(item.description || item.Description || item.explanation || item.Explanation || 'No description available'), // Obfuscated explanation
                status: 'unanswered',
                circle: null
            };
        });
    } catch (error) {
        console.error('Quiz items generation error:', error);
        throw error;
    }
}

async function checkAnswerWithAI(userAnswer, correctAnswer, locationInfo) {
    const prompt = `Check if this geography quiz answer is correct:

Correct answer: "${correctAnswer}"
User answer: "${userAnswer}"
Context: ${locationInfo}

Consider correct if user answer:
- Matches exactly
- Uses common abbreviations (like "Mumbai" for "Mumbai, Maharashtra")
- Has minor spelling errors
- Refers to the same location (like "Narmada" for "Narmada River")
- Uses alternative names

Respond with only: CORRECT or INCORRECT`;

    try {
        console.log('AI prompt:', prompt);
        const response = await callGroqAPI(prompt);
        console.log('AI response:', response);
        const cleanResponse = response.trim().toUpperCase();
        const result = cleanResponse === 'CORRECT' || cleanResponse.startsWith('CORRECT');
        return result;
    } catch (error) {
        console.error('Answer checking error:', error);
        throw error;
    }
}

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    await google.maps.importLibrary("core");

    map = new Map(mapElement, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapId: 'DEMO_MAP_ID',
        gestureHandling: 'greedy',
        streetViewControl: false,
        mapTypeControl: false
    });

    setupEventListeners();
    populateCountries();
}

function setupEventListeners() {
    countrySelect.addEventListener('change', onCountryChange);
    topicSelect.addEventListener('change', onTopicChange);
    generateTopicsBtn.addEventListener('click', generateTopics);
    startQuizBtn.addEventListener('click', startQuiz);
    
    document.getElementById('submit-answer').addEventListener('click', checkAnswer);
    document.getElementById('cancel-answer').addEventListener('click', hideInputModal);
    completeQuizBtn.addEventListener('click', showSummary);
    closeSummaryBtn.addEventListener('click', () => summaryModal.classList.add('hidden'));
    restartQuizBtn.addEventListener('click', restartQuiz);
}

function populateCountries() {
    countrySelect.innerHTML = '<option value="">Select a Country</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

function onCountryChange() {
    const selectedCountry = countrySelect.value;
    const hasApiKey = groqApiKeyInput.value.trim();
    if (selectedCountry && hasApiKey) {
        generateTopicsBtn.disabled = false;
    } else {
        generateTopicsBtn.disabled = true;
    }
    
    // Reset topic selection
    topicSelect.innerHTML = '<option value="">Select country first to generate topics</option>';
    topicSelect.disabled = true;
    startQuizBtn.disabled = true;
}

function onTopicChange() {
    const selectedTopic = topicSelect.value;
    startQuizBtn.disabled = !selectedTopic;
}

async function startQuiz() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    groqApiKey = groqApiKeyInput.value.trim();
    const selectedCountry = countrySelect.value;
    const selectedTopic = topicSelect.value;

    if (!apiKey || !groqApiKey) {
        showError('Please enter both Google Maps API key and Groq API key.');
        return;
    }

    if (!selectedCountry || !selectedTopic) {
        showError('Please select a country and generate/select a topic.');
        return;
    }

    startQuizBtn.disabled = true;
    startQuizBtn.textContent = 'Generating Quiz...';

    try {
        // Initialize Google Maps if needed
        if (!window.google || !window.google.maps) {
            window.initGoogleMaps(apiKey);
            await waitForGoogleMaps();
        }

        // Generate quiz items using AI
        currentQuizItems = await generateQuizItems();
        console.log('Generated quiz items count:', currentQuizItems.length);
        
        if (!currentQuizItems || currentQuizItems.length === 0) {
            throw new Error('No quiz items generated');
        }
        
        // Set quiz header
        quizTitle.textContent = `${selectedTopic} - ${selectedCountry}`;
        
        setupModal.classList.add('hidden');
        mapElement.classList.remove('hidden');
        quizHeader.classList.remove('hidden');
        scoreboard.classList.remove('hidden');

        if (!map) {
            await initMap();
        }
        
        setupNewQuiz();
        
    } catch (error) {
        showError('Failed to generate quiz items. Please try selecting a different topic.');
        console.error('Quiz generation error:', error);
        
        // Keep modal open on error
        setupModal.classList.remove('hidden');
        mapElement.classList.add('hidden');
        scoreboard.classList.add('hidden');
    } finally {
        startQuizBtn.disabled = false;
        startQuizBtn.textContent = 'Start Quiz';
    }
}

function waitForGoogleMaps() {
    return new Promise((resolve) => {
        const checkGoogleMaps = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(checkGoogleMaps);
                resolve();
            }
        }, 100);
    });
}

function setupNewQuiz() {
    resetScores();
    clearQuiz();

    const bounds = new google.maps.LatLngBounds();

    currentQuizItems.forEach(item => {
        item.circle = new google.maps.Circle({
            strokeColor: colors.unanswered,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: colors.unanswered,
            fillOpacity: 0.35,
            map: map,
            center: item.coords,
            radius: 50000,
            clickable: true
        });

        bounds.extend(item.coords);

        item.circle.addListener('click', () => {
            if (item.status === 'unanswered') {
                handleItemClick(item);
            }
        });
    });

    if (currentQuizItems.length > 0) {
        if (currentQuizItems.length === 1) {
            map.setCenter(currentQuizItems[0].coords);
            map.setZoom(8);
        } else {
            map.fitBounds(bounds);
        }
    }
}

function handleItemClick(item) {
    activeItem = item;
    startQuestionTimer();
    showInputModal();
}

function startQuestionTimer() {
    clearInterval(timerInterval);
    let timeLeft = QUESTION_TIME_LIMIT;
    timerDisplay.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft < 0) {
            clearInterval(timerInterval);
            activeItem.status = 'incorrect';
            updateCircleAndScore();
            hideInputModal();
        }
    }, 1000);
}

function showInputModal() {
    inputModal.classList.remove('hidden');
    itemNameInput.focus();
}

function hideInputModal() {
    clearInterval(timerInterval);
    inputModal.classList.add('hidden');
    itemNameInput.value = '';
    activeItem = null;
}

async function checkAnswer() {
    clearInterval(timerInterval);
    if (!activeItem) return;

    const userAnswer = itemNameInput.value.trim();
    const correctAnswer = atob(activeItem.n); // Decode obfuscated name

    document.getElementById('submit-answer').disabled = true;
    document.getElementById('submit-answer').textContent = 'Checking...';

    try {
        console.log('Checking answer:', userAnswer, 'vs', correctAnswer);
        const isCorrect = await checkAnswerWithAI(userAnswer, correctAnswer, atob(activeItem.e));
        console.log('AI result:', isCorrect);
        activeItem.status = isCorrect ? 'correct' : 'incorrect';
    } catch (error) {
        console.error('Answer checking failed, using fallback:', error);
        activeItem.status = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ? 'correct' : 'incorrect';
    }

    updateCircleAndScore();
    hideInputModal();
    
    document.getElementById('submit-answer').disabled = false;
    document.getElementById('submit-answer').textContent = 'Submit';
}

function updateCircleAndScore() {
    if (!activeItem) return;

    const newColor = colors[activeItem.status];
    activeItem.circle.setOptions({
        strokeColor: newColor,
        fillColor: newColor
    });

    const correctCount = currentQuizItems.filter(d => d.status === 'correct').length;
    const incorrectCount = currentQuizItems.filter(d => d.status === 'incorrect').length;

    correctScoreEl.textContent = correctCount;
    incorrectScoreEl.textContent = incorrectCount;
}

function showSummary() {
    completeQuizBtn.disabled = true;
    clearInterval(timerInterval);
    currentQuizItems.forEach(item => {
        if(item.circle) item.circle.setOptions({ clickable: false });
    });

    summaryList.innerHTML = '';
    const incorrectItems = currentQuizItems.filter(d => d.status === 'incorrect');

    if (incorrectItems.length === 0 && currentQuizItems.length > 0) {
        const li = document.createElement('li');
        li.textContent = 'Great job! No incorrect answers.';
        summaryList.appendChild(li);
    } else {
        incorrectItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${atob(item.n)}</strong> - ${atob(item.e)}`;
            summaryList.appendChild(li);
        });
    }

    summaryModal.classList.remove('hidden');
}

function clearQuiz() {
    currentQuizItems.forEach(item => {
        if (item.circle) {
            item.circle.setMap(null);
        }
    });
}

function resetScores() {
    correctScoreEl.textContent = '0';
    incorrectScoreEl.textContent = '0';
}

function restartQuiz() {
    clearInterval(timerInterval);
    summaryModal.classList.add('hidden');
    quizHeader.classList.add('hidden');
    scoreboard.classList.add('hidden');
    setupModal.classList.remove('hidden');
    
    clearQuiz();
    currentQuizItems = [];
    resetScores();
    completeQuizBtn.disabled = false;
}

function showError(message) {
    setupIntroP.textContent = message;
    setupIntroP.style.color = '#ea4335';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateCountries();
    
    // Enable generate topics button when both country and API key are provided
    groqApiKeyInput.addEventListener('input', () => {
        const hasApiKey = groqApiKeyInput.value.trim();
        const hasCountry = countrySelect.value;
        generateTopicsBtn.disabled = !(hasApiKey && hasCountry);
    });
    
    // Also listen for class level changes to update button state
    document.querySelectorAll('input[name="class-level"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const hasApiKey = groqApiKeyInput.value.trim();
            const hasCountry = countrySelect.value;
            generateTopicsBtn.disabled = !(hasApiKey && hasCountry);
        });
    });
});