# AI-Powered Geography Quiz

An interactive geography quiz application that uses AI to dynamically generate topics and check answers based on class levels and selected countries.

## Features

- **Class Level Selection**: Choose from Class 3-7, 8-10, or 11-12 for age-appropriate content
- **AI Topic Generation**: Uses Gemini AI to generate relevant geography topics based on selected country and class level
- **Dynamic Quiz Creation**: AI generates specific locations with coordinates and explanations
- **Smart Answer Checking**: AI validates answers considering alternative names, abbreviations, and spelling variations
- **Interactive Map**: Click on map markers to answer questions
- **Timer-based Questions**: 30-second timer for each question
- **Comprehensive Summary**: Review incorrect answers with explanations

## Setup

1. **Get API Keys**:
   - Google Maps API Key: [Get it here](https://developers.google.com/maps/documentation/javascript/get-api-key)
   - Gemini API Key: [Get it here](https://makersuite.google.com/app/apikey)

2. **Run the Application**:
   ```bash
   # Using Python (recommended)
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:8000`

## Usage

1. Enter your Gemini API key and Google Maps API key
2. Select a class level (3-7, 8-10, or 11-12)
3. Choose a country from the dropdown
4. Click "Generate Topics with AI" to get AI-generated topics
5. Select a topic and click "Start Quiz"
6. Click on the blue circles on the map to answer questions
7. Type your answer and submit within 30 seconds
8. Complete the quiz to see your results and explanations

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Maps**: Google Maps JavaScript API
- **AI**: Google Gemini 2.0 Flash API
- **No backend required**: Runs entirely in the browser

## API Usage

The application makes calls to:
- Google Maps JavaScript API for map rendering
- Gemini API for topic generation and answer validation

Ensure you have sufficient API quotas for both services.

## Customization

You can modify the `countries` array in `script.js` to add or remove countries from the selection list.

## Troubleshooting

- **Topics not generating**: Check your Gemini API key and internet connection
- **Map not loading**: Verify your Google Maps API key is correct and has JavaScript API enabled
- **CORS errors**: Make sure you're running the app through a web server, not opening the HTML file directly