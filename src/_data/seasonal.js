// Server-rendered at build time so the seasonal note doesn't shift layout when
// status.js runs. status.js recomputes client-side; in the build month the text
// is identical, so there's no CLS. Keep this array in sync with js/status.js.
const notes = [
  "Winter's at its coldest. Coolant and battery are worth a check before they let you down.",
  "Salt is still on the roads. Keep an eye on the chassis.",
  "Winter has left the roads full of potholes. Time to look at the suspension.",
  "Spring brings longer drives. A fluids check and a look over is never a bad idea.",
  "Show season's starting. If it's been sat all winter, book it in first.",
  "Longer summer drives ahead. Worth checking brakes, tyres and fluids.",
  "Proper summer heat. Coolant and the fan should be working properly.",
  "Holiday season means big miles. Better a service now than a breakdown on the way.",
  "Autumn's on the way. Time for the annual service before the weather turns.",
  "Cold mornings are back. Heater matrix and blower motor worth a look.",
  "Dark evenings are here. Lights and wipers are the bits you need every day now.",
  "Winter's properly arrived. If it hasn't had a look this year, now's the time."
];

const month = new Date().getMonth();
const season = (month === 11 || month <= 1) ? "winter"
             : (month <= 4) ? "spring"
             : (month <= 7) ? "summer"
             : "autumn";

export default { note: notes[month], season };
