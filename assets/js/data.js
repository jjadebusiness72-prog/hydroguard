/* HydroGuard demo data — all people, places and phone numbers are fictional.
   Phone numbers use ACMA's reserved fictional ranges (0491 570 xxx, 02 5550 xxxx).
   Readings are generated deterministically so every page shows the same numbers. */
(function (HG) {
  // ---------- Facility ----------
  HG.FACILITY = {
    name: 'Kurrajong Gardens',
    full: 'Kurrajong Gardens Aged Care (demo)',
    wings: ['Banksia', 'Waratah'],
  };

  // ---------- Shift follows the clock so the demo makes sense at any time ----------
  const hr = new Date().getHours();
  const SHIFT = hr >= 7 && hr < 15 ? 'Day shift, 7 am – 3 pm' : hr >= 15 && hr < 23 ? 'Afternoon shift, 3 pm – 11 pm' : 'Night shift, 11 pm – 7 am';
  HG.SHIFT = SHIFT;

  // ---------- Staff ----------
  HG.STAFF = {
    priya: { id: 'priya', name: 'Priya Raman', role: 'Registered Nurse', short: 'RN', wing: 'Banksia', shift: SHIFT, phone: '0491 570 110', photo: 'assets/photos/staff-priya.jpg' },
    tom: { id: 'tom', name: 'Tom Becker', role: 'Enrolled Nurse', short: 'EN', wing: 'Waratah', shift: SHIFT, phone: '0491 570 111', photo: 'assets/photos/staff-tom.jpg' },
    grace: { id: 'grace', name: 'Grace Adeyemi', role: 'Assistant in Nursing', short: 'AIN', wing: 'Banksia', shift: SHIFT, phone: '0491 570 112', photo: 'assets/photos/staff-grace.jpg' },
    leanne: { id: 'leanne', name: 'Leanne Ward', role: 'Nurse Unit Manager', short: 'NUM', wing: 'All wings', shift: 'Business hours', phone: '0491 570 113', photo: 'assets/photos/staff-leanne.jpg' },
  };

  // ---------- Residents ----------
  // start = values 22 hours ago, latest = current reading. Scores are worked out in scoring.js.
  const R = [
    {
      id: 'margaret', name: 'Margaret O’Connell', preferred: 'Peggy', age: 87, dob: '14/03/1939', sex: 'F',
      residentId: 'KG-1042', band: 'HG-W-0142', room: '12', wing: 'Banksia', nurse: 'priya',
      resus: { status: 'Not for CPR', detail: 'Advance care directive on file (signed 02/2025). Comfort care focus.' },
      conditions: ['Type 2 diabetes', 'Mild dementia', 'Past UTIs (3 in 12 months)'],
      allergies: ['Trimethoprim'], mobility: 'Walks with a frame', diet: 'Diabetic, thin fluids',
      fluidTarget: 1500, likes: 'A cup of tea at 3 pm and the cricket on the radio.',
      contacts: [
        { name: 'Siobhan O’Connell', relation: 'Daughter', phone: '0491 570 006', primary: true, emergency: true, poa: true },
        { name: 'Declan O’Connell', relation: 'Son', phone: '0491 570 007', emergency: true },
        { name: 'Dr Helen Park', relation: 'GP', phone: '02 5550 1234' },
      ],
      start: { temp: 36.8, hr: 78, hyd: 74 }, latest: { temp: 38.4, hr: 104, hyd: 52 }, curve: 2.2,
      location: 'lounge', nightBathroom: [2, 2, 3, 3, 5, 6, 7],
    },
    {
      id: 'ravi', name: 'Ravi Sharma', preferred: 'Ravi', age: 88, dob: '02/11/1937', sex: 'M',
      residentId: 'KG-1057', band: 'HG-W-0157', room: '16', wing: 'Banksia', nurse: 'priya',
      resus: { status: 'For CPR', detail: 'Full active treatment. Reviewed with family 06/2026.' },
      conditions: ['Chronic kidney disease (stage 3)', 'Hypertension'],
      allergies: ['Penicillin'], mobility: 'Independent', diet: 'Vegetarian, low salt',
      fluidTarget: 1600, likes: 'Crosswords and a walk in the garden after lunch.',
      contacts: [
        { name: 'Anjali Sharma', relation: 'Daughter', phone: '0491 570 008', primary: true, emergency: true },
        { name: 'Dr Michael Tan', relation: 'GP', phone: '02 5550 2211' },
      ],
      start: { temp: 36.7, hr: 80, hyd: 68 }, latest: { temp: 36.9, hr: 84, hyd: 46 }, curve: 1.6,
      location: 'garden', nightBathroom: [1, 1, 2, 1, 2, 3, 3],
    },
    {
      id: 'elsie', name: 'Elsie Morgan', preferred: 'Elsie', age: 93, dob: '27/07/1933', sex: 'F',
      residentId: 'KG-1011', band: 'HG-W-0111', room: '18', wing: 'Banksia', nurse: 'priya',
      resus: { status: 'Not for CPR', detail: 'Advance care directive on file. For hospital transfer if needed.' },
      conditions: ['Osteoarthritis', 'Hearing loss (aids both ears)'],
      allergies: [], mobility: 'Wheelchair, two-person transfer', diet: 'Soft diet, mildly thick fluids',
      fluidTarget: 1400, likes: 'Old movies and visits from the therapy dog.',
      contacts: [
        { name: 'Robert Morgan', relation: 'Son', phone: '0491 570 009', primary: true, emergency: true, poa: true },
      ],
      start: { temp: 36.9, hr: 82, hyd: 72 }, latest: { temp: 37.8, hr: 96, hyd: 64 }, curve: 1.4,
      location: 'room', nightBathroom: [1, 2, 1, 2, 2, 3, 3],
    },
    {
      id: 'bill', name: 'William Hartley', preferred: 'Bill', age: 79, dob: '09/01/1947', sex: 'M',
      residentId: 'KG-1078', band: 'HG-W-0178', room: '7', wing: 'Waratah', nurse: 'tom',
      resus: { status: 'For CPR', detail: 'Full active treatment.' },
      conditions: ['Parkinson’s disease', 'Benign prostate enlargement'],
      allergies: ['Codeine'], mobility: 'Walks with a stick', diet: 'Normal',
      fluidTarget: 1800, likes: 'Talking footy (Swans) and the morning paper.',
      contacts: [
        { name: 'Carol Hartley', relation: 'Wife', phone: '0491 570 010', primary: true, emergency: true },
        { name: 'Jess Hartley', relation: 'Granddaughter', phone: '0491 570 011' },
      ],
      start: { temp: 36.4, hr: 70, hyd: 71 }, latest: { temp: 35.8, hr: 72, hyd: 58 }, curve: 1.2,
      location: 'dining', nightBathroom: [2, 2, 2, 3, 3, 3, 4],
    },
    {
      id: 'wei', name: 'Wei Chen', preferred: 'Wei', age: 82, dob: '18/05/1944', sex: 'M',
      residentId: 'KG-1063', band: 'HG-W-0163', room: '14', wing: 'Banksia', nurse: 'priya',
      resus: { status: 'For CPR', detail: 'Full active treatment.' },
      conditions: ['Atrial fibrillation', 'Glaucoma'],
      allergies: [], mobility: 'Independent', diet: 'Normal',
      fluidTarget: 1700, likes: 'Tai chi class on Tuesdays and Thursdays.',
      contacts: [
        { name: 'Lily Chen', relation: 'Daughter', phone: '0491 570 012', primary: true, emergency: true },
      ],
      start: { temp: 36.8, hr: 84, hyd: 75 }, latest: { temp: 37.2, hr: 92, hyd: 67 }, curve: 1,
      location: 'physio', nightBathroom: [1, 1, 1, 2, 1, 2, 2],
    },
    {
      id: 'dorothy', name: 'Dorothy Papadopoulos', preferred: 'Dot', age: 91, dob: '30/09/1935', sex: 'F',
      residentId: 'KG-1003', band: 'HG-W-0103', room: '3', wing: 'Waratah', nurse: 'tom',
      resus: { status: 'Not for CPR', detail: 'Advance care directive on file.' },
      conditions: ['Heart failure (stable)'],
      allergies: ['Sulfa drugs'], mobility: 'Walks with a frame', diet: 'Fluid limit 1.2 L per day',
      fluidTarget: 1200, likes: 'Baking days in the activities room.',
      contacts: [
        { name: 'Nick Papadopoulos', relation: 'Son', phone: '0491 570 013', primary: true, emergency: true, poa: true },
        { name: 'Maria Kostas', relation: 'Niece', phone: '0491 570 014' },
      ],
      start: { temp: 36.5, hr: 76, hyd: 80 }, latest: { temp: 36.6, hr: 74, hyd: 81 }, curve: 1,
      location: 'activities', nightBathroom: [1, 1, 1, 1, 1, 1, 1],
    },
    {
      id: 'joan', name: 'Joan Whitfield', preferred: 'Joan', age: 84, dob: '11/12/1941', sex: 'F',
      residentId: 'KG-1029', band: 'HG-W-0129', room: '9', wing: 'Waratah', nurse: 'tom',
      resus: { status: 'For CPR', detail: 'Full active treatment.' },
      conditions: ['Osteoporosis'],
      allergies: [], mobility: 'Independent', diet: 'Normal',
      fluidTarget: 1600, likes: 'Gardening club and phone calls with her sister in Perth.',
      contacts: [
        { name: 'Margaret Ellis', relation: 'Sister', phone: '0491 570 015', primary: true, emergency: true },
      ],
      start: { temp: 36.7, hr: 82, hyd: 73 }, latest: { temp: 36.9, hr: 88, hyd: 69 }, curve: 1,
      location: 'garden', nightBathroom: [1, 0, 1, 1, 1, 1, 1],
    },
    {
      id: 'kev', name: 'Kevin Doyle', preferred: 'Kev', age: 76, dob: '04/04/1950', sex: 'M',
      residentId: 'KG-1084', band: 'HG-W-0184', room: '21', wing: 'Waratah', nurse: 'tom',
      resus: { status: 'For CPR', detail: 'Full active treatment.' },
      conditions: ['Stroke (2023), left-side weakness'],
      allergies: [], mobility: 'Walks with a stick', diet: 'Normal',
      fluidTarget: 1800, likes: 'Country music and the Friday barbecue.',
      contacts: [
        { name: 'Sharon Doyle', relation: 'Wife', phone: '0491 570 016', primary: true, emergency: true },
      ],
      start: { temp: 36.5, hr: 68, hyd: 84 }, latest: { temp: 36.4, hr: 66, hyd: 85 }, curve: 1,
      location: 'room', nightBathroom: [1, 1, 0, 1, 1, 0, 1],
    },
  ];

  // ---------- Locations (floor plan coordinates are % of the plan) ----------
  HG.ZONES = {
    room: { label: 'Own room', x: null, y: null },
    lounge: { label: 'Lounge', x: 50, y: 22 },
    dining: { label: 'Dining room', x: 78, y: 22 },
    garden: { label: 'Courtyard garden', x: 50, y: 52 },
    activities: { label: 'Activities room', x: 22, y: 22 },
    physio: { label: 'Physio room', x: 22, y: 82 },
    bathroom: { label: 'Bathroom', x: null, y: null },
  };
  // Room numbers placed around the plan, Banksia on the left, Waratah on the right
  HG.ROOM_POS = {
    '3': { x: 64, y: 78 }, '7': { x: 72, y: 78 }, '9': { x: 80, y: 78 }, '21': { x: 88, y: 78 },
    '12': { x: 8, y: 40 }, '14': { x: 8, y: 52 }, '16': { x: 8, y: 64 }, '18': { x: 8, y: 76 },
  };

  // ---------- Deterministic generation ----------
  function rng(seed) { // mulberry32
    let t = 0; for (const c of seed) t = (t * 31 + c.charCodeAt(0)) >>> 0;
    return () => { t += 0x6D2B79F5; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  const round = (v, dp) => Math.round(v * 10 ** dp) / 10 ** dp;

  const now = new Date();
  const latestTime = new Date(now); latestTime.setMinutes(0, 0, 0);
  if (latestTime.getHours() % 2) latestTime.setHours(latestTime.getHours() - 1);
  HG.LATEST_TIME = latestTime;

  function readings24(r) {
    const rand = rng(r.id + 'r');
    const out = [];
    for (let i = 0; i < 12; i++) {
      const p = Math.pow(i / 11, r.curve); // later rise for steeper curves
      const j = i === 11 ? 0 : 1;          // latest reading is exact
      out.push({
        time: new Date(latestTime.getTime() - (11 - i) * 2 * 3600e3),
        temp: round(r.start.temp + (r.latest.temp - r.start.temp) * p + j * (rand() - 0.5) * 0.3, 1),
        hr: Math.round(r.start.hr + (r.latest.hr - r.start.hr) * p + j * (rand() - 0.5) * 6),
        hyd: Math.round(r.start.hyd + (r.latest.hyd - r.start.hyd) * p + j * (rand() - 0.5) * 4),
      });
    }
    return out;
  }

  // 30 daily averages: stable baseline, drifting toward today's values over the last week
  function history30(r) {
    const rand = rng(r.id + 'h');
    const out = [];
    const day0 = new Date(latestTime); day0.setHours(12, 0, 0, 0);
    for (let d = 29; d >= 0; d--) {
      const p = d > 6 ? 0 : Math.pow((6 - d) / 6, 1.5) * 0.7; // daily average lags the latest reading
      out.push({
        time: new Date(day0.getTime() - d * 86400e3),
        temp: round(r.start.temp + (r.latest.temp - r.start.temp) * p + (rand() - 0.5) * 0.4, 1),
        hr: Math.round(r.start.hr + (r.latest.hr - r.start.hr) * p + (rand() - 0.5) * 8),
        hyd: Math.round(r.start.hyd + (r.latest.hyd - r.start.hyd) * p + (rand() - 0.5) * 6),
      });
    }
    return out;
  }

  // Fluid intake (mL) for the last 7 days, roughly tracking hydration
  function fluids7(r) {
    const rand = rng(r.id + 'f');
    return Array.from({ length: 7 }, (_, i) => {
      const p = Math.pow(i / 6, 1.5);
      const ratio = 0.95 - p * Math.max(0, (r.start.hyd - r.latest.hyd) / 40);
      return Math.round((r.fluidTarget * ratio + (rand() - 0.5) * 200) / 50) * 50;
    });
  }

  const meal = d => { const h = d.getHours(); return h < 6 ? 'supper' : h < 11 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'afternoon tea' : h < 20 ? 'dinner' : 'supper'; };

  // Recent door / location events from the wristband
  function events(r) {
    const t = latestTime.getTime();
    const z = HG.ZONES[r.location].label;
    return [
      { time: new Date(now.getTime() - 12 * 60e3), text: r.location === 'room' ? `Entered room ${r.room}` : `Arrived at ${z.toLowerCase()}` },
      { time: new Date(t - 40 * 60e3), text: `Room ${r.room} door unlocked with wristband` },
      { time: new Date(t - 3.2 * 3600e3), text: `Dining room (${meal(new Date(t - 3.2 * 3600e3))})` },
      { time: new Date(t - 6.5 * 3600e3), text: `Room ${r.room} door unlocked with wristband` },
      { time: new Date(t - 9 * 3600e3), text: `Bathroom visit overnight (${r.nightBathroom[6]} in total)` },
    ];
  }

  R.forEach(r => {
    r.readings = readings24(r);
    r.history = history30(r);
    r.fluids = fluids7(r);
    r.events = events(r);
    r.photo = `assets/photos/${r.id}.jpg`;
    r.risk = HG.scoreReading ? HG.scoreReading(r.readings[11]) : null;
  });

  HG.RESIDENTS = R;
  HG.resident = id => R.find(r => r.id === id);
  HG.staff = id => HG.STAFF[id];
})(window.HG = window.HG || {});
