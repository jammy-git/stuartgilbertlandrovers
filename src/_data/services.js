export default {
  // Stuart declined to publish an hourly rate (11 Jun 2026). Kept confirmed:false so
  // the services page never renders it.
  labourRate: { text: "Labour is charged at £59 per hour + VAT", confirmed: false },
  items: [
    { num: "No. 01", title: "Servicing", text: "Land Rover servicing. Parts and labour from around £290 + VAT. Stamp in the book.",
      long: "A full Land Rover service: oil and filters, fluids, and a proper look over the brakes, suspension and underside, done to the schedule your vehicle is due. Parts and labour start from around £290 + VAT, and you get a stamp in the book. We service every model, from a Series truck to the latest L663 Defender.", confirmed: true },
    { num: "No. 02", title: "Maintenance & repairs", text: "General mechanical repairs and ongoing maintenance. Whatever's needed to keep it going.",
      long: "From a diagnosis to the fix, general mechanical repairs and the ongoing maintenance that keeps a Land Rover going. No upsell — we tell you what needs doing, what can wait, and what it'll cost. Give us a ring first and we'll book it in.", confirmed: true },
    { num: "No. 03", title: "Brakes, steering & suspension", text: "Brakes, steering and suspension. Standard parts or upgrades, whichever you're after.",
      long: "Brakes, steering and suspension — standard replacements to put it right, or upgrades if you want it to handle or sit differently. We'll talk through the options honestly and fit what suits how you actually use the vehicle.", confirmed: true },
    { num: "No. 04", title: "Welding", text: "Welding. Chassis, as needed.",
      long: "Chassis welding as needed. We assess it honestly before any cutting starts, so you know whether it's a patch or a bigger job before we begin — no surprises halfway through.", confirmed: true },
    { num: "No. 05", title: "Land Rover improvements", text: "Improvements and modifications to most models. Happy to talk it through if you give us a call.",
      long: "Improvements and modifications to most models. Whatever you've got in mind, give us a ring and we'll talk it through — what works, what's worth doing, and what it involves.", confirmed: true }
    // Diesel/V8 tuning: Stuart confirmed (11 Jun 2026) these are no longer offered — removed.
  ]
};
