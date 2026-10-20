/* HydroGuard risk scoring — demo only, NOT clinically validated.
   Each input scores 0–3; total out of 9.
   High: total >= 5 OR any single input scores 3.
   Watch: total 2–4 OR any single input scores 2.
   Low: total 0–1. */
(function (HG) {
  // Band tables: first matching test wins. Temperature and heart rate score in both directions.
  const RULES = {
    temp: {
      label: 'Temperature', unit: '°C', step: 0.1, min: 34, max: 40.5, normal: [36.0, 37.5],
      bands: [
        { score: 3, text: 'Below 35.0 or above 38.5', test: v => v < 35.0 || v > 38.5 },
        { score: 2, text: '35.0–35.4 or 38.1–38.5', test: v => v < 35.5 || v > 38.0 },
        { score: 1, text: '35.5–35.9 or 37.6–38.0', test: v => v < 36.0 || v > 37.5 },
        { score: 0, text: '36.0–37.5', test: () => true },
      ],
    },
    hr: {
      label: 'Heart rate', unit: 'bpm', step: 1, min: 30, max: 150, normal: [51, 90],
      bands: [
        { score: 3, text: 'Below 40 or above 110', test: v => v < 40 || v > 110 },
        { score: 2, text: '40–44 or 101–110', test: v => v < 45 || v > 100 },
        { score: 1, text: '45–50 or 91–100', test: v => v < 51 || v > 90 },
        { score: 0, text: '51–90', test: () => true },
      ],
    },
    hyd: {
      label: 'Hydration index', unit: '%', step: 1, min: 20, max: 100, normal: [70, 100],
      bands: [
        { score: 3, text: 'Below 50', test: v => v < 50 },
        { score: 2, text: '50–59', test: v => v < 60 },
        { score: 1, text: '60–69', test: v => v < 70 },
        { score: 0, text: '70 and above', test: () => true },
      ],
    },
  };

  function scoreOne(key, value) {
    return RULES[key].bands.find(b => b.test(value)).score;
  }

  function scoreReading(r) {
    const parts = { temp: scoreOne('temp', r.temp), hr: scoreOne('hr', r.hr), hyd: scoreOne('hyd', r.hyd) };
    const total = parts.temp + parts.hr + parts.hyd;
    const maxPart = Math.max(parts.temp, parts.hr, parts.hyd);
    let level = 'low';
    if (total >= 5 || maxPart === 3) level = 'high';
    else if (total >= 2 || maxPart === 2) level = 'watch';
    return { parts, total, level };
  }

  const LEVELS = {
    high: { label: 'High risk', rank: 0, advice: 'Review now. Check for signs of UTI and let the RN in charge know.' },
    watch: { label: 'Watch', rank: 1, advice: 'Offer fluids and check again at the next reading.' },
    low: { label: 'Low risk', rank: 2, advice: 'No action needed.' },
  };

  HG.RULES = RULES;
  HG.LEVELS = LEVELS;
  HG.scoreOne = scoreOne;
  HG.scoreReading = scoreReading;
})(window.HG = window.HG || {});
