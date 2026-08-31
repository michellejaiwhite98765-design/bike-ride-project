export const VEHICLE_TYPES = [
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "SCOOTER", label: "Scooter" },
  { value: "BICYCLE", label: "Bicycle" },
  { value: "CAR", label: "Car" },
];

export const VEHICLE_COLORS = [
  "White", "Black", "Silver", "Grey", "Red", "Blue", "Green",
  "Yellow", "Orange", "Brown", "Maroon", "Gold", "Beige", "Purple",
];

const TWO_WHEELER_BRAND_MODELS = {
  Honda: ["Activa 6G", "Activa 125", "Shine", "Unicorn", "SP 125", "Dio", "CB350", "Hornet 2.0"],
  Yamaha: ["FZ-S", "FZ-X", "MT-15", "R15", "Fascino", "Ray ZR", "Aerox 155"],
  Bajaj: ["Pulsar 150", "Pulsar NS200", "Platina", "CT 110", "Avenger 220", "Chetak"],
  TVS: ["Jupiter", "Ntorq 125", "Apache RTR 160", "Apache RTR 200", "Raider 125", "Sport"],
  "Royal Enfield": ["Classic 350", "Bullet 350", "Meteor 350", "Hunter 350", "Himalayan"],
  Hero: ["Splendor Plus", "HF Deluxe", "Passion Pro", "Glamour", "Xtreme 160R", "Destini 125"],
  Suzuki: ["Access 125", "Burgman Street", "Gixxer", "Gixxer SF", "Avenis"],
  KTM: ["Duke 200", "Duke 250", "Duke 390", "RC 200", "RC 390"],
  Kawasaki: ["Ninja 300", "Ninja 400", "Z650", "Versys 650"],
  Ather: ["450X", "450S", "Rizta"],
  "Ola Electric": ["S1 Pro", "S1 Air", "S1 X"],
};

const CAR_BRAND_MODELS = {
  "Maruti Suzuki": ["Swift", "Baleno", "WagonR", "Alto K10", "Dzire", "Ertiga", "Brezza", "Fronx"],
  Hyundai: ["i20", "Creta", "Venue", "Verna", "Grand i10 Nios", "Exter", "Aura"],
  Tata: ["Nexon", "Punch", "Tiago", "Tigor", "Altroz", "Harrier", "Safari"],
  Mahindra: ["XUV700", "Scorpio-N", "Thar", "Bolero", "XUV300", "Marazzo"],
  Toyota: ["Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Hyryder"],
  Honda: ["City", "Amaze", "Elevate", "WR-V"],
  Kia: ["Seltos", "Sonet", "Carens"],
  Volkswagen: ["Virtus", "Taigun", "Polo"],
  Ford: ["EcoSport", "Endeavour", "Figo"],
  Renault: ["Kwid", "Triber", "Kiger"],
  Skoda: ["Slavia", "Kushaq", "Octavia"],
  MG: ["Hector", "Astor", "Comet EV"],
  Nissan: ["Magnite", "Kicks"],
};

const BICYCLE_BRAND_MODELS = {
  Hero: ["Sprint Pro", "Octane", "Ranger"],
  "Hercules": ["Roadeo", "Turner"],
  Firefox: ["Bad Attitude", "Anarchy", "Transalp"],
  Btwin: ["Rockrider ST100", "Triban RC120"],
  Trek: ["Marlin 5", "FX 2"],
  Giant: ["Talon", "Escape"],
  Atlas: ["Volt", "Rebel"],
};

export const BRAND_MODELS_BY_TYPE = {
  MOTORCYCLE: TWO_WHEELER_BRAND_MODELS,
  SCOOTER: TWO_WHEELER_BRAND_MODELS,
  CAR: CAR_BRAND_MODELS,
  BICYCLE: BICYCLE_BRAND_MODELS,
};

export function brandsForType(vehicleType) {
  const catalog = BRAND_MODELS_BY_TYPE[vehicleType];
  return catalog ? Object.keys(catalog) : [];
}

export function modelsForBrand(vehicleType, brand) {
  const catalog = BRAND_MODELS_BY_TYPE[vehicleType];
  return catalog?.[brand] || [];
}
