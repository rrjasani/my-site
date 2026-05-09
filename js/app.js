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
  const WEATHER_CACHE_KEY = 'rj-weather-cache-v1';
  const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

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

  const GARDEN_PROFILES = {
    none: {
      label: 'No garden',
      targetInches: 0,
      areaSqFt: 0,
      baseMessage: 'No garden mode: enjoy the rain as free ambience.'
    },
    apartment: {
      label: 'Apartment/Container',
      targetInches: 1.5,
      areaSqFt: 10,
      baseMessage: 'Container roots dry fast, so smaller but steadier watering works best.'
    },
    suburban: {
      label: 'Suburban yard',
      targetInches: 1.0,
      areaSqFt: 100,
      baseMessage: 'A weekly deep soak usually beats daily sprinkles for roots.'
    },
    farm: {
      label: 'Large farm/field',
      targetInches: 0.9,
      areaSqFt: 43560,
      baseMessage: 'Field scale favors timing: let forecasted rain replace one irrigation pass.'
    }
  };

  const ROTATING_TIPS = [
    'Pro tip: Mulch before rain so the soil acts more like a sponge and less like a sidewalk.',
    'Pro tip: Direct downspouts into beds or basins so roof water feeds plants instead of pavement.',
    'Pro tip: Water deeply and less often; roots follow moisture downward like they are chasing a cooler basement.',
    'Pro tip: Group thirsty plants together so one deep soak does the work of many light passes.',
    'Pro tip: Keep bare soil covered with compost or mulch to slow evaporation after rain.',
    'Pro tip: A shallow basin around a plant helps rainfall pause long enough to sink in.',
    'Pro tip: If rain is coming, wait and let the sky do the first round of watering for you.',
    'Pro tip: Healthy soil with compost holds water like a wrung-out towel instead of letting it rush away.',
    'Pro tip: On slopes, slow water with small contour ridges so it spreads out instead of running off.',
    'Pro tip: Use drip irrigation near the soil surface so water reaches roots, not the air.',
    'Pro tip: Check moisture below the surface; the top can look dry while the root zone is still comfortable.',
    'Pro tip: Put containers where they catch gentle rain but are protected from drying wind.',
    'Pro tip: Add leaf mold or compost to beds to help them store rain for longer stretches.',
    'Pro tip: Morning watering loses less to evaporation and gives plants the whole day to use it.',
    'Pro tip: A rain barrel turns one storm into several future waterings.',
    'Pro tip: Dense planting shades soil and helps it keep moisture longer between rains.',
    'Pro tip: If water beads off dry soil, soak slowly in rounds so it has time to enter.',
    'Pro tip: Clay pots or ollas release water gradually, like a slow IV for thirsty roots.',
    'Pro tip: Pull weeds before watering; otherwise they drink from the same straw as your plants.',
    'Pro tip: Pruning a little damaged growth during hot weather can reduce how much water the plant needs.',
    'Pro tip: Raised beds drain faster, so after light rain they may still need a quick moisture check.',
    'Pro tip: Keep wood chips off stems and trunks; hold moisture in the soil, not against the plant.',
    'Pro tip: If a storm is likely, loosen crusted soil lightly so more rain can soak in.',
    'Pro tip: Reuse cooled cooking water on ornamentals when appropriate instead of sending it down the drain.',
    'Pro tip: In windy spots, a hedge or trellis can protect soil moisture like a lid on a pot.',
    'Pro tip: Bigger plants may need slower watering, not just more watering, so the root zone actually gets it.',
    'Pro tip: After a solid rain, skip guessing and dig a small test hole to see how deep moisture reached.',
    'Pro tip: Shade cloth over tender crops can reduce water stress during hot dry spells.',
    'Pro tip: Compost-rich soil buffers both drought and downpours better than tired soil.',
    'Pro tip: A little water applied twice often sinks deeper than one fast flood that runs away.'
  ];

  let weeklyRainInches = 0;
  let maxRainChance = 0;

  function saveCache(payload) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        payload
      }));
    } catch (_) {}
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt || !parsed.payload) return null;
      if ((Date.now() - parsed.savedAt) > WEATHER_CACHE_TTL_MS) return null;
      return parsed.payload;
    } catch (_) {
      return null;
    }
  }

  function wmoLookup(code) {
    return WMO[code] || { label: 'Unknown', emoji: '🌡️' };
  }

  function mmToInches(mm) {
    return mm / 25.4;
  }

  function round(value, digits = 1) {
    return Number(value.toFixed(digits));
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function chooseTip(tips) {
    return tips[Math.floor(Math.random() * tips.length)];
  }

  function getAnalogy(profileKey, amountLabel) {
    if (profileKey === 'apartment') {
      return `Think: about ${amountLabel}, like giving each pot a long drink instead of a splash.`;
    }

    if (profileKey === 'suburban') {
      return `Think: about ${amountLabel}, like soaking a thick bath towel rather than misting the surface.`;
    }

    if (profileKey === 'farm') {
      return `Think: about ${amountLabel}, like one measured refill pass, not an all-day flood.`;
    }

    return `Think: about ${amountLabel}.`;
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

      return `<div class="rain-row">
        <span>${formatDay(day)}</span>
        <span>${chance}%</span>
        <span>${round(amountIn, 2)} in</span>
      </div>`;
    });

    list.innerHTML = rows.join('');
  }

  function buildAdvice(profileKey) {
    const profile = GARDEN_PROFILES[profileKey] || GARDEN_PROFILES.suburban;
    const adviceEl = document.getElementById('w-garden-advice');
    const tipEl = document.getElementById('w-perma-tip');

    if (profileKey === 'none') {
      adviceEl.textContent =
        `🌿 No garden? No watering needed. If you have one or two pots, just check whether the soil feels dry an inch down.`;

      tipEl.textContent = chooseTip(ROTATING_TIPS);
      return;
    }

    const target = profile.targetInches;
    const deficit = Math.max(target - weeklyRainInches, 0);
    const gallonsPerSqFtPerInch = 0.623;
    const gallonsNeeded = deficit * profile.areaSqFt * gallonsPerSqFtPerInch;

    let amountText = '';
    if (profileKey === 'apartment') {
      const liters = gallonsNeeded * 3.785;
      amountText = gallonsNeeded <= 0.4
        ? 'one slow watering pass'
        : `${Math.max(1, Math.round(liters / 2))} large watering-can fills`;
    } else if (profileKey === 'suburban') {
      amountText = deficit <= 0.2
        ? 'a light soak'
        : `${round(gallonsNeeded, 1)} gallons per 100 sq ft`;
    } else {
      amountText = deficit <= 0.2
        ? 'a light top-off pass'
        : `${Math.round(gallonsNeeded).toLocaleString()} gallons per acre equivalent`;
    }

    const analogy = getAnalogy(profileKey, amountText);

    if (deficit <= 0.05) {
      adviceEl.textContent =
        `✅ Nature has you covered. Forecast rain (~${round(weeklyRainInches, 2)} in) should meet ${profile.label.toLowerCase()} needs. Skip watering and let roots chase moisture.`;
    } else if (maxRainChance >= 65 && deficit <= 0.35) {
      adviceEl.textContent =
        `⏳ Water-light week. Wait 24 hours after the next rain, then add only a small top-off if the soil still feels dry. ${analogy}`;
    } else {
      adviceEl.textContent =
        `💧 Add about ${amountText} this week. ${analogy}`;
    }

    tipEl.textContent = chooseTip(ROTATING_TIPS);
  }

  function applyWeatherData(current, daily) {
    const { label, emoji } = wmoLookup(current.weather_code);
    document.getElementById('w-emoji').textContent = emoji;
    document.getElementById('w-temp').textContent = Math.round(current.temperature_2m) + '°F';
    document.getElementById('w-condition').textContent = label;
    document.getElementById('w-humidity').textContent = current.relative_humidity_2m + '%';
    document.getElementById('w-wind').textContent = Math.round(current.wind_speed_10m) + ' mph';
    document.getElementById('w-feels').textContent = Math.round(current.apparent_temperature) + '°F';
    document.getElementById('w-extra').style.display = 'flex';

    renderRainForecast(daily);
    buildAdvice(document.getElementById('garden-type').value);
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
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=precipitation_sum,precipitation_probability_max` +
      `&forecast_days=7` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=mm&timezone=auto`;

    const data = await fetchJsonWithTimeout(url, 8000);
    const current = data.current;

    if (!current || !data.daily) {
      throw new Error('Weather response missing expected fields');
    }

    return { current, daily: data.daily };
  }

  async function fetchLocation(lat, lon) {
    try {
      const data = await fetchJsonWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        5000
      );
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

  const gardenTypeSelect = document.getElementById('garden-type');
  gardenTypeSelect.addEventListener('change', () => {
    if (!document.getElementById('weather-widget').classList.contains('loading')) {
      buildAdvice(gardenTypeSelect.value);
    }
  });

  const cached = loadCache();
  if (cached && cached.current && cached.daily) {
    applyWeatherData(cached.current, cached.daily);
    if (cached.location) {
      applyLocationData(cached.location);
    }
  }

  if (!navigator.geolocation) {
    if (!cached) {
      showError('Geolocation not supported.');
    }
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

          const latestCache = loadCache();
          if (latestCache && latestCache.current && latestCache.daily) {
            saveCache({
              current: latestCache.current,
              daily: latestCache.daily,
              location: locationData
            });
          }
        })
        .catch(() => {
          applyLocationData({ city: 'Your area', state: '' });
        });

      try {
        const weatherData = await fetchWeather(lat, lon);
        if (weatherData) {
          applyWeatherData(weatherData.current, weatherData.daily);
          const latestCache = loadCache();
          saveCache({
            current: weatherData.current,
            daily: weatherData.daily,
            location: latestCache && latestCache.location
              ? latestCache.location
              : { city: document.getElementById('w-location').textContent || 'Your area', state: '' }
          });
        } else if (!cached) {
          showError('Could not load weather and rain forecast right now.');
        }
      } catch (_) {
        if (!cached) {
          showError('Could not load weather and rain forecast right now.');
        }
      }
    },
    () => {
      if (!cached) {
        showError('Enable location to see your weather.');
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
})();
