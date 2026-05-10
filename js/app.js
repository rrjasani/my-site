// ── Custom cursor ──
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
});

(function animateRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animateRing);
})();

document.querySelectorAll('a, button, .project-card, .work-item, .filter-btn').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width  = '20px';
    cursor.style.height = '20px';
    ring.style.width    = '60px';
    ring.style.height   = '60px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width  = '12px';
    cursor.style.height = '12px';
    ring.style.width    = '40px';
    ring.style.height   = '40px';
  });
});

// ── Scroll fade-in ──
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach((el, i) => {
  el.style.transitionDelay = (i % 5) * 0.07 + 's';
  obs.observe(el);
});

/* ── Weather Widget ── */
(function () {
  const WMO = {
    0:  { label: 'Clear Sky', emoji: '☀️' },
    1:  { label: 'Mainly Clear', emoji: '🌤️' },
    2:  { label: 'Partly Cloudy', emoji: '⛅' },
    3:  { label: 'Overcast', emoji: '☁️' },
    45: { label: 'Foggy', emoji: '🌫️' },
    48: { label: 'Icy Fog', emoji: '🌫️' },
    51: { label: 'Light Drizzle', emoji: '🌦️' },
    53: { label: 'Drizzle', emoji: '🌦️' },
    55: { label: 'Heavy Drizzle', emoji: '🌧️' },
    61: { label: 'Light Rain', emoji: '🌧️' },
    63: { label: 'Rain', emoji: '🌧️' },
    65: { label: 'Heavy Rain', emoji: '🌧️' },
    71: { label: 'Light Snow', emoji: '🌨️' },
    73: { label: 'Snow', emoji: '❄️' },
    75: { label: 'Heavy Snow', emoji: '❄️' },
    80: { label: 'Light Showers', emoji: '🌦️' },
    81: { label: 'Showers', emoji: '🌧️' },
    82: { label: 'Heavy Showers', emoji: '⛈️' },
    95: { label: 'Thunderstorm', emoji: '⛈️' },
  };

  let weeklyRainInches = 0;
  let maxRainChance = 0;

  function wmoLookup(code) {
    return WMO[code] || { label: 'Unknown', emoji: '🌡️' };
  }

  function mmToInches(mm) {
    return mm / 25.4;
  }

  function round(value, digits = 1) {
    return Number(value.toFixed(digits));
  }

  function setTime() {
    const now = new Date();
    document.getElementById('w-time').textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDay(dateISO) {
    const d = new Date(dateISO + 'T12:00:00');
    return d.toLocaleDateString([], { weekday: 'short' });
  }

  function renderRainForecast(daily) {
    const list = document.getElementById('w-rain-list');
    const times = daily.time || [];
    const amountsMm = daily.precipitation_sum || [];
    const chances = daily.precipitation_probability_max || [];

    weeklyRainInches = 0;
    maxRainChance = 0;

    const rows = times.slice(0, 7).map((day, idx) => {
      const amountMm = Number(amountsMm[idx] || 0);
      const chance = Number(chances[idx] || 0);
      const amountIn = mmToInches(amountMm);
      weeklyRainInches += amountIn;
      if (chance > maxRainChance) maxRainChance = chance;

      const label = chance >= 70 ? '🌧️' : chance >= 40 ? '🌦️' : '🌤️';

      return `<div class="rain-row">
        <span class="rain-day">${formatDay(day)} ${label}</span>
        <div class="rain-bar"><span style="width:${Math.max(4, Math.min(100, chance))}%"></span></div>
        <span class="rain-chance">${chance}%</span>
      </div>`;
    });

    list.innerHTML = rows.join('');
  }

  function buildAdvice() {
    const adviceEl = document.getElementById('w-garden-advice');
    const rainyDays = Math.min(7, Math.max(0, Math.round(maxRainChance / 20)));

    if (weeklyRainInches >= 1 || rainyDays >= 4) {
      adviceEl.textContent =
        `✅ Rain should do most of the work this week. Skip watering unless soil feels dry.`;
    } else if (maxRainChance >= 50) {
      adviceEl.textContent =
        `⏳ Mixed week. Wait for the next rain, then do one light watering if needed.`;
    } else {
      adviceEl.textContent =
        `💧 Dry week ahead. Plan 1-2 deep watering sessions.`;
    }
  }

  function applyWeatherData(current, daily) {
    const { label, emoji } = wmoLookup(current.weather_code);
    document.getElementById('w-emoji').textContent = emoji;
    document.getElementById('w-temp').textContent = Math.round(current.temperature_2m) + '°F';
    document.getElementById('w-condition').textContent = label;

    renderRainForecast(daily);
    buildAdvice();
    document.getElementById('weather-widget').classList.remove('loading');
  }

  function applyLocationData(locationData) {
    const city = locationData.city || 'Your area';
    const state = locationData.state || '';
    document.getElementById('w-location').textContent = city;
    document.getElementById('w-city').textContent = state ? `${city}, ${state}` : city;
  }

  async function fetchWeather(lat, lon) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code` +
      `&daily=precipitation_sum,precipitation_probability_max` +
      `&forecast_days=7` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=mm&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    const current = data.current;

    if (!current || !data.daily) {
      throw new Error('Weather response missing expected fields');
    }

    return { current, daily: data.daily };
  }

  async function fetchLocation(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      const address = data.address || {};
      return {
        city: address.city || address.town || address.village || address.county || 'Your area',
        state: address.state_code || address.state || ''
      };
    } catch (_) {
      return {
        city: 'Your area',
        state: ''
      };
    }
  }

  function showError(message) {
    const widget = document.getElementById('weather-widget');
    widget.innerHTML = `<p class="weather-error">${message}</p>`;
    widget.classList.remove('loading');
  }

  if (!navigator.geolocation) {
    showError('Geolocation not supported.');
    return;
  }

  setTime();
  setInterval(setTime, 60000);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      fetchLocation(lat, lon)
        .then((locationData) => {
          applyLocationData(locationData);
        })
        .catch(() => {
          applyLocationData({ city: 'Your area', state: '' });
        });

      try {
        const weatherData = await fetchWeather(lat, lon);
        if (weatherData) {
          applyWeatherData(weatherData.current, weatherData.daily);
        } else {
          showError('Could not load weather and rain forecast right now.');
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        showError('Could not load weather and rain forecast right now.');
      }
    },
    () => {
      showError('Enable location to see your weather.');
    },
    {
      enableHighAccuracy: false,
      maximumAge: 300000
    }
  );
})();
