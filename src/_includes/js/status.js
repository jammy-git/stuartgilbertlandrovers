// Seasonal note - rotates by calendar month. No-ops on pages without #seasonal-note.
const seasonalNotes = [
  "Winter's at its coldest. Coolant and battery are worth a check before they let you down.",
  'Salt is still on the roads. Keep an eye on the chassis.',
  'Winter has left the roads full of potholes. Time to look at the suspension.',
  'Spring brings longer drives. A fluids check and a look over is never a bad idea.',
  "Show season's starting. If it's been sat all winter, book it in first.",
  'Longer summer drives ahead. Worth checking brakes, tyres and fluids.',
  'Proper summer heat. Coolant and the fan should be working properly.',
  'Holiday season means big miles. Better a service now than a breakdown on the way.',
  "Autumn's on the way. Time for the annual service before the weather turns.",
  'Cold mornings are back. Heater matrix and blower motor worth a look.',
  'Dark evenings are here. Lights and wipers are the bits you need every day now.',
  "Winter's properly arrived. If it hasn't had a look this year, now's the time."
];
const month = new Date().getMonth();
const note = document.getElementById('seasonal-note');
if (note) note.textContent = seasonalNotes[month];
const season = (month === 11 || month <= 1) ? 'winter'
             : (month <= 4) ? 'spring'
             : (month <= 7) ? 'summer'
             : 'autumn';
const seasonalEl = document.querySelector('.seasonal');
if (seasonalEl) seasonalEl.setAttribute('data-season', season);

// Open / closed indicator.
// Workshop hours: Mon to Fri, 08:30 to 17:30. Closed weekends and UK bank holidays.
const BANK_HOLIDAYS = {
  // England & Wales bank holidays, 2026 to 2035.
  // Computed Apr 2026. Refresh this table before 2036.
  '2026-01-01': "New Year's Day",
  '2026-04-03': "Good Friday",
  '2026-04-06': "Easter Monday",
  '2026-05-04': "May Day",
  '2026-05-25': "Spring Bank Holiday",
  '2026-08-31': "Summer Bank Holiday",
  '2026-12-25': "Christmas Day",
  '2026-12-28': "Boxing Day",
  '2027-01-01': "New Year's Day",
  '2027-03-26': "Good Friday",
  '2027-03-29': "Easter Monday",
  '2027-05-03': "May Day",
  '2027-05-31': "Spring Bank Holiday",
  '2027-08-30': "Summer Bank Holiday",
  '2027-12-27': "Christmas Day",
  '2027-12-28': "Boxing Day",
  '2028-01-03': "New Year's Day",
  '2028-04-14': "Good Friday",
  '2028-04-17': "Easter Monday",
  '2028-05-01': "May Day",
  '2028-05-29': "Spring Bank Holiday",
  '2028-08-28': "Summer Bank Holiday",
  '2028-12-25': "Christmas Day",
  '2028-12-26': "Boxing Day",
  '2029-01-01': "New Year's Day",
  '2029-03-30': "Good Friday",
  '2029-04-02': "Easter Monday",
  '2029-05-07': "May Day",
  '2029-05-28': "Spring Bank Holiday",
  '2029-08-27': "Summer Bank Holiday",
  '2029-12-25': "Christmas Day",
  '2029-12-26': "Boxing Day",
  '2030-01-01': "New Year's Day",
  '2030-04-19': "Good Friday",
  '2030-04-22': "Easter Monday",
  '2030-05-06': "May Day",
  '2030-05-27': "Spring Bank Holiday",
  '2030-08-26': "Summer Bank Holiday",
  '2030-12-25': "Christmas Day",
  '2030-12-26': "Boxing Day",
  '2031-01-01': "New Year's Day",
  '2031-04-11': "Good Friday",
  '2031-04-14': "Easter Monday",
  '2031-05-05': "May Day",
  '2031-05-26': "Spring Bank Holiday",
  '2031-08-25': "Summer Bank Holiday",
  '2031-12-25': "Christmas Day",
  '2031-12-26': "Boxing Day",
  '2032-01-01': "New Year's Day",
  '2032-03-26': "Good Friday",
  '2032-03-29': "Easter Monday",
  '2032-05-03': "May Day",
  '2032-05-31': "Spring Bank Holiday",
  '2032-08-30': "Summer Bank Holiday",
  '2032-12-27': "Christmas Day",
  '2032-12-28': "Boxing Day",
  '2033-01-03': "New Year's Day",
  '2033-04-15': "Good Friday",
  '2033-04-18': "Easter Monday",
  '2033-05-02': "May Day",
  '2033-05-30': "Spring Bank Holiday",
  '2033-08-29': "Summer Bank Holiday",
  '2033-12-26': "Boxing Day",
  '2033-12-27': "Christmas Day",
  '2034-01-02': "New Year's Day",
  '2034-04-07': "Good Friday",
  '2034-04-10': "Easter Monday",
  '2034-05-01': "May Day",
  '2034-05-29': "Spring Bank Holiday",
  '2034-08-28': "Summer Bank Holiday",
  '2034-12-25': "Christmas Day",
  '2034-12-26': "Boxing Day",
  '2035-01-01': "New Year's Day",
  '2035-03-23': "Good Friday",
  '2035-03-26': "Easter Monday",
  '2035-05-07': "May Day",
  '2035-05-28': "Spring Bank Holiday",
  '2035-08-27': "Summer Bank Holiday",
  '2035-12-25': "Christmas Day",
  '2035-12-26': "Boxing Day"
};
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function ymd(d){return d.toISOString().slice(0,10);}
function nextWorkingDay(d){
  let next = new Date(d);
  for (let i = 0; i < 10; i++){
    next.setDate(next.getDate() + 1);
    const dow = next.getDay();
    if (dow === 0 || dow === 6) continue;
    if (BANK_HOLIDAYS[ymd(next)]) continue;
    return next;
  }
  return next;
}
function openStatus(now){
  const dow = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const isHoliday = BANK_HOLIDAYS[ymd(now)];
  const isWeekend = dow === 0 || dow === 6;
  const open = !isWeekend && !isHoliday && mins >= 8*60 + 30 && mins < 17*60 + 30;
  if (open) return { open: true, text: 'Open, please call to book' };
  if (isHoliday){
    const nxt = nextWorkingDay(now);
    return { open: false, text: 'Closed for ' + isHoliday + ', open ' + DAY_NAMES[nxt.getDay()] + ' 8:30' };
  }
  // Before opening today (weekday, mins < 08:30)
  if (!isWeekend && mins < 8*60 + 30 && !BANK_HOLIDAYS[ymd(now)]){
    return { open: false, text: 'Closed, open today at 8:30' };
  }
  const nxt = nextWorkingDay(now);
  const sameWeek = nxt.getDay() > dow && !isWeekend;
  const label = sameWeek ? 'tomorrow' : DAY_NAMES[nxt.getDay()];
  return { open: false, text: 'Closed, open ' + label + ' 8:30' };
}
const statusEl = document.getElementById('open-status');
if (statusEl){
  const s = openStatus(new Date());
  statusEl.classList.toggle('open', s.open);
  statusEl.querySelector('.text').textContent = s.text;
}
