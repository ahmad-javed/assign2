const API_KEY = '486334d1cff60840e96658ce0818dfb7';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';
const GEMINI_API_KEY = 'AIzaSyAspEp35rYKfAQ03u12Nh2DxwQ6xxJ3lH8'; // Note: Storing API keys in client-side code is not secure for production

// DOM elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const currentWeatherSection = document.getElementById('current-weather');
const forecastTableSection = document.querySelector('.forecast-cards');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const chatMessages = document.querySelector('.chat-messages');

// Chart variables
let temperatureChart, weatherConditionsChart, temperatureLineChart;

// Fetch current weather data from OpenWeather API
async function getWeatherData(city) {
    try {
        const response = await fetch(`${BASE_URL}weather?q=${city}&units=metric&appid=${API_KEY}`);
        if (!response.ok) {
            throw new Error('City not found');
        }
        const data = await response.json();
        displayCurrentWeather(data);
        updateCharts(data);
    } catch (error) {
        displayError(error.message);
    }
}

// Fetch 5-day forecast data from OpenWeather API
async function getForecastData(city) {
    try {
        const response = await fetch(`${BASE_URL}forecast?q=${city}&units=metric&appid=${API_KEY}`);
        if (!response.ok) {
            throw new Error('City not found');
        }
        const data = await response.json();
        displayForecastTable(data);
        updateForecastCharts(data);
    } catch (error) {
        displayError(error.message);
    }
}

// Display current weather data (for dashboard page)
function displayCurrentWeather(data) {
    if (!currentWeatherSection) return;

    const { name, main, weather, wind } = data;
    const weatherIcon = `http://openweathermap.org/img/wn/${weather[0].icon}.png`;

    currentWeatherSection.innerHTML = `
        <h1>${name}</h1>
        <img src="${weatherIcon}" alt="${weather[0].description}">
        <p>Temperature: ${main.temp.toFixed(1)}°C</p>
        <p>Feels like: ${main.feels_like.toFixed(1)}°C</p>
        <p>Humidity: ${main.humidity}%</p>
        <p>Wind Speed: ${wind.speed} m/s</p>
        <p>Weather: ${weather[0].description}</p>
    `;
}

// Display 5-day forecast table (for tables page)
function displayForecastTable(data) {
    if (!forecastTableSection) {
        console.error('Forecast table section not found');
        return;
    }

    const forecastData = data.list.filter((item, index) => index % 8 === 0); // Get data for every 24 hours
    const cityName = data.city.name; // Get the city name from the forecast data
    
    let cardsHTML = '';

    forecastData.forEach(day => {
        const date = new Date(day.dt * 1000).toLocaleDateString();
        const icon = `http://openweathermap.org/img/wn/${day.weather[0].icon}.png`;
        cardsHTML += `
            <div class="forecast-card">
                <h3>${date}</h3>
                <img src="${icon}" alt="${day.weather[0].description}">
                <p>Temp: ${day.main.temp.toFixed(1)}°C</p>
                <p>Weather: ${day.weather[0].description}</p>
            </div>
        `;
    });

    forecastTableSection.innerHTML = `
        <h2>${cityName} 5-Day Forecast</h2>
        <div class="forecast-cards-container">
            ${cardsHTML}
        </div>
    `;
}

// Display error message
function displayError(message) {
    const errorSection = currentWeatherSection || forecastTableSection;
    if (errorSection) {
        errorSection.innerHTML = `<p class="error">${message}</p>`;
    } else {
        console.error('Error section not found');
    }
}

// Gemini API Integration
async function getChatbotResponse(message) {
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const payload = {
        contents: [{
            parts: [{
                text: message
            }]
        }]
    };

    try {
        const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

// Send chat message
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message) {
        displayChatMessage('User', message);
        try {
            const botResponse = await getChatbotResponse(message);
            displayChatMessage('Bot', botResponse);
        } catch (error) {
            displayChatMessage('Bot', `Error: ${error.message}. Please try again later.`);
        }
        chatInput.value = '';
    }
}

// Display chat message
function displayChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender.toLowerCase()}`;
    messageElement.textContent = `${sender}: ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update charts with current weather data
function updateCharts(data) {
    const { main, weather } = data;
    const temperatureData = [main.temp, main.feels_like];
    const weatherLabels = [weather[0].main, weather[0].description];
    
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    const tempChartCanvas = document.getElementById('temperature-bar-chart');
    if (tempChartCanvas) {
        temperatureChart = new Chart(tempChartCanvas, {
            type: 'bar',
            data: {
                labels: ['Current Temp', 'Feels Like'],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temperatureData,
                    backgroundColor: ['#ff6384', '#36a2eb'],
                    borderColor: ['#ff6384', '#36a2eb'],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    if (weatherConditionsChart) {
        weatherConditionsChart.destroy();
    }
    const weatherChartCanvas = document.getElementById('weather-conditions-doughnut-chart');
    if (weatherChartCanvas) {
        weatherConditionsChart = new Chart(weatherChartCanvas, {
            type: 'doughnut',
            data: {
                labels: weatherLabels,
                datasets: [{
                    data: [1, 1], // Dummy data
                    backgroundColor: ['#ff6384', '#36a2eb']
                }]
            }
        });
    }
}

// Update forecast charts
function updateForecastCharts(data) {
    const forecastData = data.list.filter((item, index) => index % 8 === 0);
    const temperatures = forecastData.map(day => day.main.temp);
    const labels = forecastData.map(day => new Date(day.dt * 1000).toLocaleDateString());

    if (temperatureLineChart) {
        temperatureLineChart.destroy();
    }
    const lineChartCanvas = document.getElementById('temperature-line-chart');
    if (lineChartCanvas) {
        temperatureLineChart = new Chart(lineChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '5-Day Forecast Temp (°C)',
                    data: temperatures,
                    fill: false,
                    borderColor: '#4bc0c0',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const forecastTableSection = document.querySelector('.forecast-cards');

    if (searchBtn && cityInput) {
        searchBtn.addEventListener('click', () => {
            const city = cityInput.value.trim();
            if (city) {
                getWeatherData(city);
                getForecastData(city);
            }
        });
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
    }

    // Initialize with default city
    getWeatherData('Islamabad');
    getForecastData('Islamabad');
});

// Global variable to store forecast data for filtering and sorting
let forecastData = [];

// Ensure that the DOM is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners for filters and sorting buttons
    const sortAscButton = document.getElementById('sort-asc');
    const sortDescButton = document.getElementById('sort-desc');
    const filterRainButton = document.getElementById('filter-rain');
    const highestTempButton = document.getElementById('highest-temp');

    // Only add event listeners if the buttons exist
    if (sortAscButton) {
        sortAscButton.addEventListener('click', sortTemperaturesAscending);
    }
    if (sortDescButton) {
        sortDescButton.addEventListener('click', sortTemperaturesDescending);
    }
    if (filterRainButton) {
        filterRainButton.addEventListener('click', filterRainDays);
    }
    if (highestTempButton) {
        highestTempButton.addEventListener('click', findHighestTemperatureDay);
    }
});

// Fetch 5-day forecast data from OpenWeather API
async function getForecastData(city) {
    try {
        const response = await fetch(`${BASE_URL}forecast?q=${city}&units=metric&appid=${API_KEY}`);
        if (!response.ok) throw new Error('City not found');

        const data = await response.json();
        forecastData = data.list.filter((_, index) => index % 8 === 0); // Filter 24-hour intervals
        displayForecastTable(data.city.name, forecastData);
        updateForecastCharts(data); // Existing functionality to update charts
    } catch (error) {
        displayError(error.message);
    }
}

// Sort temperatures in ascending order
function sortTemperaturesAscending() {
    const sortedData = [...forecastData].sort((a, b) => a.main.temp - b.main.temp);
    displayForecastTable('Sorted (Ascending)', sortedData);
}

// Sort temperatures in descending order
function sortTemperaturesDescending() {
    const sortedData = [...forecastData].sort((a, b) => b.main.temp - a.main.temp);
    displayForecastTable('Sorted (Descending)', sortedData);
}

// Filter out days without rain
function filterRainDays() {
    const rainDays = forecastData.filter(day => 
        day.weather[0].main.toLowerCase().includes('rain')
    );
    displayForecastTable('Rainy Days', rainDays);
}

// Find and display the day with the highest temperature
function findHighestTemperatureDay() {
    const highestTempDay = forecastData.reduce((max, day) => 
        day.main.temp > max.main.temp ? day : max
    );
    displayForecastTable('Hottest Day', [highestTempDay]);
}

// Display filtered or sorted forecast data
function displayForecastTable(title, data) {
    const cardsHTML = data.map(day => {
        const date = new Date(day.dt * 1000).toLocaleDateString();
        const icon = `http://openweathermap.org/img/wn/${day.weather[0].icon}.png`;

        return `
            <div class="forecast-card">
                <h3>${date}</h3>
                <img src="${icon}" alt="${day.weather[0].description}">
                <p>Temp: ${day.main.temp.toFixed(1)}°C</p>
                <p>Weather: ${day.weather[0].description}</p>
            </div>
        `;
    }).join('');

    const forecastTableSection = document.querySelector('.forecast-cards'); // Ensure this selects the right section
    if (forecastTableSection) {
        forecastTableSection.innerHTML = `
            <h2>${title}</h2>
            <div class="forecast-cards-container">${cardsHTML}</div>
        `;
    }
}
