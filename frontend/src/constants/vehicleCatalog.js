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

// Brands and models sold in India (current + common older models still on the road).
// Users can still type a brand/model that is not listed.
const MOTORCYCLE_BRAND_MODELS = {
  Hero: ["Splendor Plus", "Splendor Plus Xtec", "Super Splendor", "Super Splendor Xtec", "HF Deluxe", "HF 100", "Passion Plus", "Passion Pro", "Passion Xtec", "Glamour", "Glamour Xtec", "Xtreme 125R", "Xtreme 160R", "Xtreme 160R 4V", "Xtreme 200S", "XPulse 200 4V", "XPulse 210", "Mavrick 440", "Karizma XMR", "Achiever 150", "Hunk 160R"],
  Honda: ["Shine 100", "Shine 125", "SP 125", "SP 160", "Livo", "Unicorn", "Dream Yuga", "CD 110 Dream", "Hornet 2.0", "CB200X", "CB300F", "CB300R", "H'ness CB350", "CB350", "CB350RS", "NX500", "CB650R", "CBR650R", "Africa Twin", "Gold Wing"],
  Bajaj: ["Platina 100", "Platina 110", "CT 100", "CT 110X", "CT 125X", "Discover 125", "Pulsar 125", "Pulsar N125", "Pulsar 150", "Pulsar N150", "Pulsar N160", "Pulsar NS125", "Pulsar NS160", "Pulsar NS200", "Pulsar RS200", "Pulsar N250", "Pulsar F250", "Pulsar NS400Z", "Avenger Street 160", "Avenger Cruise 220", "Dominar 250", "Dominar 400", "Freedom 125 CNG"],
  TVS: ["Sport", "Star City Plus", "Radeon", "Raider 125", "Apache RTR 160", "Apache RTR 160 4V", "Apache RTR 180", "Apache RTR 200 4V", "Apache RTR 310", "Apache RR 310", "Ronin"],
  "Royal Enfield": ["Bullet 350", "Classic 350", "Hunter 350", "Meteor 350", "Goan Classic 350", "Himalayan 450", "Scram 411", "Scram 440", "Guerrilla 450", "Interceptor 650", "Continental GT 650", "Super Meteor 650", "Shotgun 650", "Bear 650", "Classic 650"],
  Yamaha: ["FZ-S FI", "FZS-Fi V4", "FZ-X", "FZ 25", "FZS 25", "MT-15 V2", "R15 V4", "R15S", "R15M", "MT-03", "R3", "Saluto", "SZ-RR"],
  Suzuki: ["Gixxer", "Gixxer SF", "Gixxer 250", "Gixxer SF 250", "V-Strom SX", "V-Strom 800DE", "GSX-8R", "Katana", "Hayabusa"],
  KTM: ["125 Duke", "200 Duke", "250 Duke", "390 Duke", "RC 125", "RC 200", "RC 390", "250 Adventure", "390 Adventure", "890 Duke R", "1390 Super Duke R"],
  Kawasaki: ["W175", "Ninja 300", "Ninja 400", "Ninja 500", "Ninja 650", "Z650", "Z650RS", "Z900", "Z900RS", "Versys 650", "Vulcan S", "Eliminator", "KLX 230", "Ninja ZX-10R"],
  Jawa: ["Jawa 42", "Jawa 350", "42 Bobber", "Perak"],
  Yezdi: ["Roadster", "Scrambler", "Adventure"],
  BSA: ["Gold Star 650"],
  "Harley-Davidson": ["X440", "Nightster", "Sportster S", "Street Bob", "Fat Boy", "Pan America"],
  Triumph: ["Speed 400", "Scrambler 400 X", "Trident 660", "Street Triple", "Speed Twin 900", "Bonneville T100", "Tiger 900", "Rocket 3"],
  "BMW Motorrad": ["G 310 R", "G 310 GS", "G 310 RR", "F 900 R", "R 1250 GS", "S 1000 RR"],
  Benelli: ["Imperiale 400", "TRK 502", "Leoncino 500", "502C"],
  Husqvarna: ["Svartpilen 250", "Svartpilen 401", "Vitpilen 250"],
  Ducati: ["Scrambler Icon", "Monster", "Panigale V2", "Multistrada V2", "Diavel"],
  Revolt: ["RV400", "RV1", "RV1+"],
  "Ola Electric": ["Roadster X", "Roadster", "Roadster Pro"],
  Ultraviolette: ["F77 Mach 2", "F77 SuperStreet"],
  Tork: ["Kratos R"],
  Oben: ["Rorr"],
  Matter: ["Aera"],
};

const SCOOTER_BRAND_MODELS = {
  Honda: ["Activa 6G", "Activa 125", "Activa e", "QC1", "Dio", "Dio 125", "Grazia"],
  TVS: ["Jupiter", "Jupiter 125", "Ntorq 125", "Zest 110", "Scooty Pep Plus", "iQube", "X", "XL100"],
  Suzuki: ["Access 125", "Burgman Street 125", "Avenis 125", "e-Access"],
  Yamaha: ["Fascino 125", "Ray ZR 125", "Ray ZR Street Rally", "Aerox 155"],
  Hero: ["Pleasure Plus", "Destini 125", "Destini Prime", "Xoom 110", "Xoom 125", "Xoom 160", "Maestro Edge"],
  "Hero Vida": ["V1 Pro", "V1 Plus", "V2 Pro", "V2 Plus", "V2 Lite", "VX2"],
  Bajaj: ["Chetak", "Chetak 2901", "Chetak Premium"],
  Ather: ["450S", "450X", "450 Apex", "Rizta S", "Rizta Z"],
  "Ola Electric": ["S1 Pro", "S1 Air", "S1 X", "S1 X+", "S1 Z"],
  Aprilia: ["SR 125", "SR 160", "SXR 125", "SXR 160", "Storm 125"],
  Vespa: ["VXL 125", "VXL 150", "SXL 125", "SXL 150", "ZX 125"],
  Kinetic: ["Zing", "Zulu", "DX"],
  Okinawa: ["Praise Pro", "iPraise+", "Ridge 100", "Okhi-90"],
  Ampere: ["Magnus EX", "Nexus", "Reo", "Primus"],
  "Pure EV": ["ePluto 7G", "eTrance Neo", "EcoDryft"],
  Simple: ["One", "Dot One"],
  River: ["Indie"],
  BGauss: ["C12i", "RUV350", "D15"],
  Lectrix: ["LXS G 2.0", "LXS G 3.0"],
};

const CAR_BRAND_MODELS = {
  "Maruti Suzuki": ["Alto K10", "S-Presso", "Celerio", "WagonR", "Swift", "Dzire", "Baleno", "Ignis", "Fronx", "Brezza", "Ertiga", "XL6", "Grand Vitara", "Jimny", "Invicto", "Ciaz", "Eeco", "e Vitara", "Victoris"],
  Hyundai: ["Grand i10 Nios", "i20", "i20 N Line", "Aura", "Exter", "Venue", "Venue N Line", "Verna", "Creta", "Creta N Line", "Creta Electric", "Alcazar", "Tucson", "Ioniq 5"],
  Tata: ["Tiago", "Tiago EV", "Tigor", "Tigor EV", "Altroz", "Punch", "Punch EV", "Nexon", "Nexon EV", "Curvv", "Curvv EV", "Harrier", "Harrier EV", "Safari"],
  Mahindra: ["Bolero", "Bolero Neo", "Thar", "Thar Roxx", "Scorpio Classic", "Scorpio-N", "XUV 3XO", "XUV400", "XUV700", "XEV 9e", "BE 6", "Marazzo"],
  Toyota: ["Glanza", "Urban Cruiser Taisor", "Rumion", "Urban Cruiser Hyryder", "Innova Crysta", "Innova Hycross", "Fortuner", "Fortuner Legender", "Hilux", "Camry", "Vellfire", "Land Cruiser 300"],
  Kia: ["Sonet", "Syros", "Seltos", "Carens", "Carens Clavis", "Carnival", "EV6", "EV9"],
  Honda: ["Amaze", "City", "City e:HEV", "Elevate"],
  MG: ["Comet EV", "Windsor EV", "Astor", "Hector", "Hector Plus", "ZS EV", "Gloster"],
  Renault: ["Kwid", "Triber", "Kiger"],
  Nissan: ["Magnite", "X-Trail"],
  Volkswagen: ["Virtus", "Taigun", "Tiguan", "Polo", "Vento"],
  Skoda: ["Kylaq", "Slavia", "Kushaq", "Kodiaq", "Superb", "Rapid"],
  Citroen: ["C3", "eC3", "Basalt", "C3 Aircross", "C5 Aircross"],
  Jeep: ["Compass", "Meridian", "Wrangler", "Grand Cherokee"],
  BYD: ["Atto 3", "Seal", "eMAX 7", "Sealion 7"],
  "Mercedes-Benz": ["A-Class Limousine", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", "EQS"],
  BMW: ["2 Series Gran Coupe", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "iX1", "i4"],
  Audi: ["A4", "A6", "Q3", "Q5", "Q7", "Q8 e-tron"],
  Volvo: ["XC40", "XC60", "XC90", "EX40"],
  Lexus: ["ES", "NX", "RX", "LX"],
  Ford: ["EcoSport", "Figo", "Aspire", "Freestyle", "Endeavour"],
  Chevrolet: ["Beat", "Spark", "Sail", "Cruze", "Enjoy"],
  Datsun: ["redi-GO", "GO", "GO+"],
  Fiat: ["Punto", "Linea"],
};

const BICYCLE_BRAND_MODELS = {
  Hero: ["Sprint Pro", "Octane", "Ranger", "Kyoto", "Lectro C3", "Lectro F6i"],
  Hercules: ["Roadeo A50", "Roadeo Turner", "Top Gear", "ACT 110"],
  Firefox: ["Bad Attitude", "Anarchy", "Transalp", "Rapide", "Road Runner Pro"],
  Btwin: ["Rockrider ST100", "Rockrider ST120", "Riverside 120", "Triban RC120", "Triban RC500"],
  Montra: ["Rock", "Madrock", "Helicon", "Unplugged", "Trance"],
  BSA: ["Mach City", "Ladybird", "Champ"],
  Atlas: ["Goldline", "Volt", "Rebel"],
  Avon: ["Cycle Comfort", "Buke"],
  "Ninety One": ["Enigma", "Meraki"],
  EMotorad: ["T-Rex", "Doodle", "X1", "Lil E"],
  Trek: ["Marlin 5", "Marlin 7", "FX 1", "FX 2", "Domane AL 2"],
  Giant: ["Talon", "Escape", "ATX", "Contend"],
  Scott: ["Aspect", "Sub Cross", "Speedster"],
  Cannondale: ["Trail", "Quick", "CAAD Optimo"],
  Polygon: ["Cascade", "Heist", "Siskiu"],
};

export const BRAND_MODELS_BY_TYPE = {
  MOTORCYCLE: MOTORCYCLE_BRAND_MODELS,
  SCOOTER: SCOOTER_BRAND_MODELS,
  CAR: CAR_BRAND_MODELS,
  BICYCLE: BICYCLE_BRAND_MODELS,
};

export function brandsForType(vehicleType) {
  const catalog = BRAND_MODELS_BY_TYPE[vehicleType];
  return catalog ? Object.keys(catalog) : [];
}

export function modelsForBrand(vehicleType, brand) {
  const catalog = BRAND_MODELS_BY_TYPE[vehicleType];
  if (!catalog || !brand) return [];
  // Match a typed brand regardless of case ("honda" → Honda).
  const wanted = String(brand).trim().toLowerCase();
  const key = Object.keys(catalog).find((b) => b.toLowerCase() === wanted);
  return key ? catalog[key] : [];
}
