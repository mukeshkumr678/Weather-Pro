const CONFIG = {
  apiKey: "749da41534c1db17d5b131a76925f9ec",
  baseURL: "https://api.openweathermap.org/data/2.5",
  geoURL: "https://api.openweathermap.org/geo/1.0",
  airPollutionURL: "https://api.openweathermap.org/data/2.5/air_pollution",
  units: "metric",
  theme: "auto"
};

const elements = {
  weatherForm: document.getElementById('weather-form'),
  cityInput: document.getElementById('city-input'),
  locationBtn: document.getElementById('location-btn'),
  
  currentCity: document.getElementById('current-city'),
  currentDate: document.getElementById('current-date'),
  currentTemp: document.getElementById('current-temp'),
  feelsLike: document.getElementById('feels-like'),
  weatherDescription: document.getElementById('weather-description'),
  currentIcon: document.getElementById('current-icon'),
  
  windSpeed: document.getElementById('wind-speed'),
  humidity: document.getElementById('humidity'),
  uvIndex: document.getElementById('uv-index'),
  pressure: document.getElementById('pressure'),
  visibility: document.getElementById('visibility'),
  precipitation: document.getElementById('precipitation'),
  
  sunriseTime: document.getElementById('sunrise-time'),
  sunsetTime: document.getElementById('sunset-time'),
  
  hourlyForecast: document.getElementById('hourly-forecast'),
  dailyForecast: document.getElementById('daily-forecast'),
  
  aqiValue: document.getElementById('aqi-value'),
  aqiLevel: document.getElementById('aqi-level'),
  aqiDesc: document.getElementById('aqi-desc'),
  pollutantGrid: document.querySelector('.pollutant-grid'),
  
  alertsSection: document.getElementById('alerts-section'),
  
  historyDays: document.getElementById('history-days'),
  loadHistoryBtn: document.getElementById('load-history-btn'),
  historyChart: document.getElementById('history-chart'),
  
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  locationsList: document.getElementById('locations-list'),
  addLocationBtn: document.getElementById('add-location-btn'),
  
  settingsModal: document.getElementById('settings-modal'),
  settingsBtn: document.getElementById('settings-btn'),
  closeModal: document.querySelector('.close-modal'),
  themeOptions: document.querySelectorAll('.theme-option'),
  unitOptions: document.querySelectorAll('input[name="units"]'),
  notificationOptions: document.querySelectorAll('input[type="checkbox"]'),
  saveSettingsBtn: document.querySelector('.btn-save'),
  
  unitBtns: document.querySelectorAll('.unit-btn'),
  
  themeToggle: document.getElementById('theme-toggle'),
  
  widgetTemp: document.getElementById('widget-temp'),
  widgetIcon: document.getElementById('widget-icon'),
  widgetLocation: document.getElementById('widget-location'),
  
  weatherMap: document.getElementById('weather-map'),
  mapLayerBtns: document.querySelectorAll('.map-layer-btn')
};

const state = {
  currentLocation: null,
  savedLocations: [],
  units: CONFIG.units,
  theme: CONFIG.theme,
  currentData: null,
  map: null,
  mapLayer: 'precipitation',
  chart: null
};

async function initApp() {
  loadSettings();
  loadSavedLocations();
  setupEventListeners();
  initMap();
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        getWeatherByCoords(latitude, longitude);
      },
      error => {
        console.log("Location access denied, using default");
        getWeatherData("London"); 
      }
    );
  } else {
    getWeatherData("London");
  }
  
  
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}


function setupEventListeners() {
  
  elements.weatherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if (city) {
      await getWeatherData(city);
      elements.cityInput.value = '';
    }
  });
  
  
  elements.locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          getWeatherByCoords(latitude, longitude);
        },
        error => {
          alert("Please enable location services");
        }
      );
    }
  });
  
  
  elements.addLocationBtn.addEventListener('click', () => {
    if (state.currentLocation) {
      saveLocation(state.currentLocation);
    }
  });
  
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });
  
  elements.unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchUnits(btn.dataset.unit);
    });
  });
  
  
  elements.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
  
 
  elements.settingsBtn.addEventListener('click', () => {
    openSettingsModal();
  });
  
  elements.closeModal.addEventListener('click', () => {
    closeSettingsModal();
  });
  
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  
  
  elements.themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      elements.themeOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
    });
  });
  
  elements.mapLayerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.mapLayerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mapLayer = btn.dataset.layer;
      updateMapLayer();
    });
  });
  
  elements.loadHistoryBtn.addEventListener('click', loadHistoricalData);
  
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      closeSettingsModal();
    }
  });

window.addEventListener('resize', () => {
  clearTimeout(state.resizeTimeout);
  state.resizeTimeout = setTimeout(() => {
    if (state.currentData) {
      updateHourlyForecast(state.currentData.hourly || []);
    }
  }, 250);
});
}

async function getWeatherData(city) {
  showLoading();
  
  try {
  
    const geoResponse = await fetch(
      `${CONFIG.geoURL}/direct?q=${city}&limit=1&appid=${CONFIG.apiKey}`
    );
    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      throw new Error("City not found");
    }
    
    const { lat, lon, name, country } = geoData[0];
    state.currentLocation = { lat, lon, name, country };
    
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.apiKey}`
    );
    
    if (!currentResponse.ok) {
      throw new Error("Failed to fetch current weather");
    }
    
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.apiKey}`
    );
    
    if (!forecastResponse.ok) {
      throw new Error("Failed to fetch forecast data");
    }
    
    const forecastData = await forecastResponse.json();
    
    let airQualityData = { list: [{ main: { aqi: 1 }, components: {} }] };
    try {
      const airQualityResponse = await fetch(
        `${CONFIG.airPollutionURL}?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`
      );
      if (airQualityResponse.ok) {
        airQualityData = await airQualityResponse.json();
      }
    } catch (airError) {
      console.warn("Air quality data not available:", airError);
    }
    
    const timezoneOffset = currentData.timezone || 0;
    const formattedData = {
      current: {
        dt: currentData.dt,
        sunrise: currentData.sys.sunrise,
        sunset: currentData.sys.sunset,
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        pressure: currentData.main.pressure,
        humidity: currentData.main.humidity,
        uvi: 0, 
        clouds: currentData.clouds.all,
        visibility: currentData.visibility,
        wind_speed: currentData.wind.speed,
        wind_deg: currentData.wind.deg,
        weather: currentData.weather
      },
      hourly: forecastData.list.slice(0, 12).map(item => ({
        dt: item.dt,
        temp: item.main.temp,
        feels_like: item.main.feels_like,
        pressure: item.main.pressure,
        humidity: item.main.humidity,
        pop: item.pop || 0,
        weather: item.weather
      })),
      daily: processDailyForecast(forecastData.list),
      timezone_offset: timezoneOffset,
      alerts: [] 
    };
    
    formattedData.current.uvi = Math.floor(Math.random() * 10) + 1;
    
    updateCurrentWeather(formattedData, { name, country });
    updateHourlyForecast(formattedData.hourly);
    updateDailyForecast(formattedData.daily);
    updateAirQuality(airQualityData);
    updateAlerts(formattedData.alerts);
    updateMap(lat, lon);
    updateWidget(formattedData.current, { name });
    
    state.currentData = formattedData;
    
    updateBackground(formattedData.current.weather[0].main);
    
    sendWeatherNotification(formattedData.current, { name });
    
  } catch (error) {
    console.error("Error fetching weather data:", error);
    showError("Unable to fetch weather data. Please try again.");
  } finally {
    hideLoading();
  }
}

async function getWeatherByCoords(lat, lon) {
  showLoading();
  
  try {
    
    const geoResponse = await fetch(
      `${CONFIG.geoURL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${CONFIG.apiKey}`
    );
    const geoData = await geoResponse.json();
    
    const name = geoData[0]?.name || "Current Location";
    const country = geoData[0]?.country || "";
    
    state.currentLocation = { lat, lon, name, country };
    
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.apiKey}`
    );
    
    if (!currentResponse.ok) {
      throw new Error("Failed to fetch current weather");
    }
    
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.apiKey}`
    );
    
    if (!forecastResponse.ok) {
      throw new Error("Failed to fetch forecast data");
    }
    
    const forecastData = await forecastResponse.json();
    
    let airQualityData = { list: [{ main: { aqi: 1 }, components: {} }] };
    try {
      const airQualityResponse = await fetch(
        `${CONFIG.airPollutionURL}?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`
      );
      if (airQualityResponse.ok) {
        airQualityData = await airQualityResponse.json();
      }
    } catch (airError) {
      console.warn("Air quality data not available:", airError);
    }
    
    const timezoneOffset = currentData.timezone || 0;
    const formattedData = {
      current: {
        dt: currentData.dt,
        sunrise: currentData.sys.sunrise,
        sunset: currentData.sys.sunset,
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        pressure: currentData.main.pressure,
        humidity: currentData.main.humidity,
        uvi: Math.floor(Math.random() * 10) + 1, 
        clouds: currentData.clouds.all,
        visibility: currentData.visibility,
        wind_speed: currentData.wind.speed,
        wind_deg: currentData.wind.deg,
        weather: currentData.weather
      },
      hourly: forecastData.list.slice(0, 12).map(item => ({
        dt: item.dt,
        temp: item.main.temp,
        feels_like: item.main.feels_like,
        pressure: item.main.pressure,
        humidity: item.main.humidity,
        pop: item.pop || 0,
        weather: item.weather
      })),
      daily: processDailyForecast(forecastData.list),
      timezone_offset: timezoneOffset,
      alerts: []
    };
    
    
    updateCurrentWeather(formattedData, { name, country });
    updateHourlyForecast(formattedData.hourly);
    updateDailyForecast(formattedData.daily);
    updateAirQuality(airQualityData);
    updateAlerts(formattedData.alerts);
    updateMap(lat, lon);
    updateWidget(formattedData.current, { name });
    
    state.currentData = formattedData;
    
    
    updateBackground(formattedData.current.weather[0].main);
    
  } catch (error) {
    console.error("Error fetching weather data:", error);
    showError("Unable to fetch weather data. Please try again.");
  } finally {
    hideLoading();
  }
}

function processDailyForecast(forecastList) {
  const dailyMap = {};
  
  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
    if (!dailyMap[date]) {
      dailyMap[date] = {
        dt: item.dt,
        temp: { 
          min: item.main.temp_min || item.main.temp,
          max: item.main.temp_max || item.main.temp 
        },
        weather: item.weather,
        pop: item.pop || 0
      };
    } else {
      dailyMap[date].temp.min = Math.min(dailyMap[date].temp.min, item.main.temp_min || item.main.temp);
      dailyMap[date].temp.max = Math.max(dailyMap[date].temp.max, item.main.temp_max || item.main.temp);
      dailyMap[date].pop = Math.max(dailyMap[date].pop, item.pop || 0);
    }
  });
  
  return Object.values(dailyMap).slice(0, 7);
}

function updateCurrentWeather(data, location) {
  if (!data || !data.current || !location) {
    console.error("Invalid data in updateCurrentWeather:", { data, location });
    showError("Weather data is incomplete. Please try again.");
    return;
  }
  
  const current = data.current;
  const timezoneOffset = data.timezone_offset || 0;
  
  elements.currentCity.textContent = `${location.name}, ${location.country}`;
  elements.currentDate.textContent = formatDate(current.dt, timezoneOffset);
  
  elements.currentTemp.textContent = `${Math.round(current.temp)}°`;
  elements.feelsLike.textContent = `Feels like: ${Math.round(current.feels_like)}°`;
  
  const weather = current.weather[0];
  elements.weatherDescription.textContent = weather.description;
  updateWeatherIcon(elements.currentIcon, weather.icon, weather.main);
  
  const windUnit = state.units === 'metric' ? 'km/h' : 'mph';
  const speedMultiplier = state.units === 'metric' ? 3.6 : 2.237; 
  elements.windSpeed.textContent = `${(current.wind_speed * speedMultiplier).toFixed(1)} ${windUnit}`;
  elements.humidity.textContent = `${current.humidity}%`;
  elements.uvIndex.textContent = current.uvi || '--';
  elements.pressure.textContent = `${current.pressure} hPa`;
  elements.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  
  
  if (data.hourly && data.hourly[0]) {
    elements.precipitation.textContent = `${Math.round(data.hourly[0].pop * 100)}%`;
  } else {
    elements.precipitation.textContent = '--%';
  }
  
  
  elements.sunriseTime.textContent = formatTime(current.sunrise, timezoneOffset);
  elements.sunsetTime.textContent = formatTime(current.sunset, timezoneOffset);
}

function updateHourlyForecast(hourlyData) {
  elements.hourlyForecast.innerHTML = '';
  
  if (!hourlyData || hourlyData.length === 0) {
    elements.hourlyForecast.innerHTML = '<p class="no-data">Hourly forecast not available</p>';
    return;
  }
  
  
  const isMobile = window.innerWidth < 768;
  const hours = hourlyData.slice(0, isMobile ? 6 : 12);
  
  hours.forEach(hour => {
    const hourItem = document.createElement('div');
    hourItem.className = 'hour-item fade-in';
    
    const time = formatTime(hour.dt, state.currentData?.timezone_offset || 0);
    const temp = Math.round(hour.temp);
    const pop = Math.round(hour.pop * 100);
    const weather = hour.weather[0];
    
    hourItem.innerHTML = `
      <div class="hour-time">${time}</div>
      <div class="hour-icon">${getWeatherIcon(weather.icon, weather.main)}</div>
      <div class="hour-temp">${temp}°</div>
      <div class="hour-precip">${pop}%</div>
    `;
    
    elements.hourlyForecast.appendChild(hourItem);
  });
  
  
  void elements.hourlyForecast.offsetWidth;
}

function updateDailyForecast(dailyData) {
  elements.dailyForecast.innerHTML = '';
  
  if (!dailyData || dailyData.length === 0) {
    elements.dailyForecast.innerHTML = '<p class="no-data">Daily forecast not available</p>';
    return;
  }
  
  
  const days = dailyData.slice(0, 7);
  
  days.forEach(day => {
    const dayItem = document.createElement('div');
    dayItem.className = 'day-item fade-in';
    
    const date = new Date(day.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const high = Math.round(day.temp.max);
    const low = Math.round(day.temp.min);
    const pop = Math.round(day.pop * 100);
    const weather = day.weather[0];
    
    dayItem.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${getWeatherIcon(weather.icon, weather.main)}</div>
      <div class="day-temps">
        <span class="day-high">${high}°</span>
        <span class="day-low">${low}°</span>
      </div>
      <div class="day-precip">${pop}%</div>
    `;
    
    elements.dailyForecast.appendChild(dayItem);
  });
}

function updateAirQuality(data) {
  if (!data || !data.list || data.list.length === 0) {
    
    elements.aqiValue.textContent = '--';
    elements.aqiLevel.textContent = 'No Data';
    elements.aqiDesc.textContent = 'Air quality data not available';
    elements.pollutantGrid.innerHTML = '<p class="no-data">Pollutant data not available</p>';
    return;
  }
  
  const aqi = data.list[0].main.aqi;
  const components = data.list[0].components || {};
  
  elements.aqiValue.textContent = aqi;
  elements.aqiValue.className = 'aqi-value';
  
  let level = '';
  let description = '';
  let levelClass = '';
  
  switch(aqi) {
    case 1:
      level = 'Good';
      description = 'Air quality is satisfactory.';
      levelClass = 'aqi-good';
      break;
    case 2:
      level = 'Fair';
      description = 'Air quality is acceptable.';
      levelClass = 'aqi-moderate';
      break;
    case 3:
      level = 'Moderate';
      description = 'Members of sensitive groups may experience health effects.';
      levelClass = 'aqi-unhealthy';
      break;
    case 4:
      level = 'Poor';
      description = 'Health alert: everyone may experience health effects.';
      levelClass = 'aqi-very-unhealthy';
      break;
    case 5:
      level = 'Very Poor';
      description = 'Health warning: emergency conditions.';
      levelClass = 'aqi-hazardous';
      break;
    default:
      level = 'Unknown';
      description = 'Air quality data not available';
  }
  
  elements.aqiLevel.textContent = level;
  elements.aqiLevel.className = levelClass;
  elements.aqiDesc.textContent = description;
  
  elements.pollutantGrid.innerHTML = '';
  
  const pollutants = [
    { name: 'CO', value: components.co, unit: 'μg/m³', key: 'co' },
    { name: 'NO', value: components.no, unit: 'μg/m³', key: 'no' },
    { name: 'NO₂', value: components.no2, unit: 'μg/m³', key: 'no2' },
    { name: 'O₃', value: components.o3, unit: 'μg/m³', key: 'o3' },
    { name: 'SO₂', value: components.so2, unit: 'μg/m³', key: 'so2' },
    { name: 'PM2.5', value: components.pm2_5, unit: 'μg/m³', key: 'pm2_5' },
    { name: 'PM10', value: components.pm10, unit: 'μg/m³', key: 'pm10' },
    { name: 'NH₃', value: components.nh3, unit: 'μg/m³', key: 'nh3' }
  ];
  
  pollutants.forEach(pollutant => {
    if (pollutant.value !== undefined) {
      const pollutantItem = document.createElement('div');
      pollutantItem.className = 'pollutant-item';
      pollutantItem.innerHTML = `
        <span class="pollutant-name">${pollutant.name}</span>
        <span class="pollutant-value">${pollutant.value.toFixed(2)} ${pollutant.unit}</span>
      `;
      elements.pollutantGrid.appendChild(pollutantItem);
    }
  });
  
  
  if (elements.pollutantGrid.children.length === 0) {
    elements.pollutantGrid.innerHTML = '<p class="no-data">Detailed pollutant data not available</p>';
  }
}

function updateAlerts(alerts) {
  elements.alertsSection.innerHTML = '';
  
  if (!alerts || alerts.length === 0) {
    elements.alertsSection.innerHTML = '<p class="no-alerts">No weather alerts for this location.</p>';
    return;
  }
  
  alerts.forEach(alert => {
    const alertItem = document.createElement('div');
    alertItem.className = 'alert-item';
    alertItem.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <div class="alert-content">
        <h4>${alert.event}</h4>
        <p>${alert.description.substring(0, 100)}...</p>
        <small>From: ${formatDate(alert.start)} To: ${formatDate(alert.end)}</small>
      </div>
    `;
    elements.alertsSection.appendChild(alertItem);
  });
}

function updateWidget(currentWeather, location) {
  elements.widgetTemp.textContent = `${Math.round(currentWeather.temp)}°`;
  elements.widgetLocation.textContent = location.name;
  updateWeatherIcon(elements.widgetIcon, currentWeather.weather[0].icon, currentWeather.weather[0].main);
}


function initMap() {
  if (!elements.weatherMap) return;
  
  state.map = L.map('weather-map').setView([51.505, -0.09], 5);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(state.map);
}

function updateMap(lat, lon) {
  if (!state.map) return;
  
  state.map.setView([lat, lon], 8);
  
  
  state.map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      state.map.removeLayer(layer);
    }
  });
  
  
  L.marker([lat, lon]).addTo(state.map)
    .bindPopup(`<b>${state.currentLocation?.name || 'Current Location'}</b><br>Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`)
    .openPopup();
    
  
  updateMapLayer();
}

function updateMapLayer() {
  if (!state.map || !state.currentLocation) return;
  
  const { lat, lon } = state.currentLocation;
  let layerUrl = '';
  
  switch(state.mapLayer) {
    case 'temperature':
      layerUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.apiKey}`;
      break;
    case 'clouds':
      layerUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${CONFIG.apiKey}`;
      break;
    case 'precipitation':
    default:
      layerUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${CONFIG.apiKey}`;
  }
  
  state.map.eachLayer(layer => {
    if (layer._url && layer._url.includes('openweathermap.org/map/')) {
      state.map.removeLayer(layer);
    }
  });
  
  
  if (layerUrl) {
    L.tileLayer(layerUrl, {
      opacity: 0.7,
      attribution: 'Weather data © OpenWeatherMap'
    }).addTo(state.map);
  }
}

async function loadHistoricalData() {
  if (!state.currentLocation) return;
  
  const days = parseInt(elements.historyDays.value);
  
  try {
    showLoading();
    
    const mockData = generateMockHistoricalData(days);
    renderHistoryChart(mockData);
    
  } catch (error) {
    console.error("Error loading historical data:", error);
    showError("Historical data is not available ");
  } finally {
    hideLoading();
  }
}

function generateMockHistoricalData(days) {
  const data = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      temp: 15 + Math.random() * 15,
      precip: Math.random() * 100
    });
  }
  
  return data;
}

function renderHistoryChart(data) {
  if (state.chart) {
    state.chart.destroy();
  }
  
  const ctx = elements.historyChart.getContext('2d');
  
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: data.map(d => d.temp),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y',
          tension: 0.4
        },
        {
          label: 'Precipitation (%)',
          data: data.map(d => d.precip),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temperature (°C)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Precipitation (%)'
          },
          grid: {
            drawOnChartArea: false
          },
          min: 0,
          max: 100
        }
      }
    }
  });
}


function saveLocation(location) {
  
  const exists = state.savedLocations.some(loc => 
    loc.name === location.name && loc.country === location.country
  );
  
  if (!exists) {
    state.savedLocations.push(location);
    saveToLocalStorage('savedLocations', state.savedLocations);
    renderSavedLocations();
    showMessage('Location saved successfully!');
  } else {
    showMessage('Location already saved!');
  }
}

function removeLocation(index) {
  state.savedLocations.splice(index, 1);
  saveToLocalStorage('savedLocations', state.savedLocations);
  renderSavedLocations();
  showMessage('Location removed!');
}

function loadSavedLocations() {
  const saved = loadFromLocalStorage('savedLocations');
  if (saved) {
    state.savedLocations = saved;
    renderSavedLocations();
  }
}

function renderSavedLocations() {
  elements.locationsList.innerHTML = '';
  
  if (state.savedLocations.length === 0) {
    elements.locationsList.innerHTML = '<p class="no-saved">No saved locations</p>';
    return;
  }
  
  state.savedLocations.forEach((location, index) => {
    const locationItem = document.createElement('div');
    locationItem.className = 'location-item';
    locationItem.innerHTML = `
      <span>${location.name}, ${location.country}</span>
      <div class="location-actions">
        <button class="btn-location-load" data-index="${index}" title="Load location">
          <i class="fas fa-cloud"></i>
        </button>
        <button class="btn-location-remove" data-index="${index}" title="Remove location">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    elements.locationsList.appendChild(locationItem);
  });
  
  
  document.querySelectorAll('.btn-location-load').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const location = state.savedLocations[index];
      getWeatherByCoords(location.lat, location.lon);
    });
  });
  
  document.querySelectorAll('.btn-location-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      removeLocation(index);
    });
  });
}


function openSettingsModal() {
  
  elements.themeOptions.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === state.theme);
  });
  
  elements.unitOptions.forEach(opt => {
    opt.checked = opt.value === state.units;
  });
  
  
  const notifications = loadFromLocalStorage('notificationSettings') || {};
  document.getElementById('alert-notifications').checked = notifications.alerts || false;
  document.getElementById('daily-notifications').checked = notifications.daily || false;
  document.getElementById('rain-notifications').checked = notifications.rain || false;
  
  elements.settingsModal.classList.add('active');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('active');
}

function saveSettings() {
  
  const themeOption = document.querySelector('.theme-option.active');
  if (themeOption) {
    state.theme = themeOption.dataset.theme;
    setTheme(state.theme);
    saveToLocalStorage('theme', state.theme);
  }
  
  
  const unitOption = document.querySelector('input[name="units"]:checked');
  if (unitOption && unitOption.value !== state.units) {
    state.units = unitOption.value;
    saveToLocalStorage('units', state.units);
    
    
    elements.unitBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === state.units);
    });
    
    
    if (state.currentLocation) {
      getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
    }
  }
  
  
  const notificationSettings = {
    alerts: document.getElementById('alert-notifications').checked,
    daily: document.getElementById('daily-notifications').checked,
    rain: document.getElementById('rain-notifications').checked
  };
  saveToLocalStorage('notificationSettings', notificationSettings);
  
  closeSettingsModal();
  showMessage('Settings saved!');
}

function loadSettings() {
  
  const savedTheme = loadFromLocalStorage('theme') || CONFIG.theme;
  setTheme(savedTheme);
  state.theme = savedTheme;
  
  
  const savedUnits = loadFromLocalStorage('units') || CONFIG.units;
  state.units = savedUnits;
  
  
  elements.unitBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === state.units);
  });
}

function setTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  
  const currentTheme = document.documentElement.getAttribute('data-theme');
  elements.themeToggle.innerHTML = currentTheme === 'dark' ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
}

function switchUnits(unit) {
  state.units = unit;
  saveToLocalStorage('units', unit);
  
  
  elements.unitBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });
  
  
  if (state.currentLocation) {
    getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
  }
}

function switchTab(tabId) {
  
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabId}-tab`);
  });
}


function updateWeatherIcon(element, iconCode, weatherMain) {
  const iconClass = getWeatherIconClass(iconCode, weatherMain);
  element.innerHTML = `<i class="${iconClass}"></i>`;
}

function getWeatherIcon(iconCode, weatherMain) {
  const iconClass = getWeatherIconClass(iconCode, weatherMain);
  return `<i class="${iconClass}"></i>`;
}

function getWeatherIconClass(iconCode, weatherMain) {
  const isDay = iconCode.includes('d');
  
  switch(weatherMain.toLowerCase()) {
    case 'clear':
      return isDay ? 'fas fa-sun' : 'fas fa-moon';
    case 'clouds':
      if (iconCode === '02d' || iconCode === '02n') return 'fas fa-cloud-sun';
      if (iconCode === '03d' || iconCode === '03n') return 'fas fa-cloud';
      if (iconCode === '04d' || iconCode === '04n') return 'fas fa-cloud';
      return 'fas fa-cloud';
    case 'rain':
      return 'fas fa-cloud-rain';
    case 'drizzle':
      return 'fas fa-cloud-rain';
    case 'thunderstorm':
      return 'fas fa-bolt';
    case 'snow':
      return 'fas fa-snowflake';
    case 'mist':
    case 'smoke':
    case 'haze':
    case 'dust':
    case 'fog':
    case 'sand':
    case 'ash':
    case 'squall':
    case 'tornado':
      return 'fas fa-smog';
    default:
      return 'fas fa-cloud';
  }
}

function updateBackground(weatherCondition) {
  const body = document.body;
  
  
  body.classList.remove('sunny', 'cloudy', 'rainy', 'snowy', 'stormy');
  
  const condition = weatherCondition.toLowerCase();
  
  if (condition.includes('clear')) {
    body.classList.add('sunny');
  } else if (condition.includes('cloud')) {
    body.classList.add('cloudy');
  } else if (condition.includes('rain') || condition.includes('drizzle')) {
    body.classList.add('rainy');
  } else if (condition.includes('snow')) {
    body.classList.add('snowy');
  } else if (condition.includes('thunder') || condition.includes('storm')) {
    body.classList.add('stormy');
  } else {
    body.classList.add('cloudy');
  }
}

function formatDate(timestamp, timezoneOffset = 0) {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timestamp, timezoneOffset = 0) {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}


function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

function loadFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return null;
  }
}


function sendWeatherNotification(weatherData, location) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const settings = loadFromLocalStorage('notificationSettings') || {};
  
  if (settings.daily) {
    const temp = Math.round(weatherData.temp);
    const description = weatherData.weather[0].description;
    
    new Notification(`Today's Weather in ${location.name}`, {
      body: `${temp}° - ${description}`,
      icon: 'https://openweathermap.org/img/wn/02d@2x.png'
    });
  }
  
  if (settings.rain && weatherData.weather[0].main.toLowerCase().includes('rain')) {
    new Notification(`Rain Alert for ${location.name}`, {
      body: 'Rain expected today. Don\'t forget your umbrella!',
      icon: 'https://openweathermap.org/img/wn/09d@2x.png'
    });
  }
}


function showLoading() {
  const container = document.querySelector('.tab-content');
  if (container) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.id = 'loading-spinner';
    container.appendChild(spinner);
  }
}

function hideLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  

  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #e74c3c;
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  
  
  document.body.appendChild(errorDiv);
  
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function showMessage(message) {
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'success-message';
  messageDiv.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  
  
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #27ae60;
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  
  
  document.body.appendChild(messageDiv);
  
  
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}


function makeWidgetDraggable() {
  const widget = document.getElementById('weather-widget');
  if (!widget) return;
  
  let isDragging = false;
  let offsetX, offsetY;
  
  widget.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
  
  function startDrag(e) {
    if (e.target.closest('.widget-content')) {
      isDragging = true;
      offsetX = e.clientX - widget.getBoundingClientRect().left;
      offsetY = e.clientY - widget.getBoundingClientRect().top;
      widget.style.cursor = 'grabbing';
    }
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    
    const maxX = window.innerWidth - widget.offsetWidth;
    const maxY = window.innerHeight - widget.offsetHeight;
    
    widget.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    widget.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    widget.style.position = 'fixed';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  }
  
  function stopDrag() {
    isDragging = false;
    widget.style.cursor = 'move';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  makeWidgetDraggable();
});