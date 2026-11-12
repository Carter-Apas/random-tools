import type { CategoryView, Vegetable } from "../shared/types.js";

export interface Answer {
  label: string;
  aliases: string[];
}

export interface Category extends Omit<CategoryView, "total"> {
  answers: Answer[];
}

export const normalize = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const category = (
  id: string,
  name: string,
  prompt: string,
  vegetable: Vegetable,
  words: string,
  hint = "Use a common English name. Each answer can be used once per visit.",
): Category => ({
  id,
  name,
  prompt,
  hint,
  vegetable,
  answers: words.split(";").map((word) => {
    const [label, ...aliases] = word.split("|");
    return { label, aliases: [...new Set([label, ...aliases].map(normalize))] };
  }),
});

export const categories: Category[] = [
  category(
    "moons",
    "Moonlighting",
    "Name a moon in our solar system",
    "potato",
    "Moon|the moon|luna;Phobos;Deimos;Io;Europa;Ganymede;Callisto;Titan;Enceladus;Mimas;Tethys;Dione;Rhea;Iapetus;Hyperion;Phoebe;Titania;Oberon;Umbriel;Ariel;Miranda;Triton;Nereid;Charon;Nix;Hydra;Styx;Kerberos",
    "Named moons of planets and dwarf planets. Earth’s Moon counts.",
  ),
  category(
    "pasta",
    "Pasta la vista",
    "Name a type of pasta",
    "carrot",
    "Spaghetti;Penne;Fusilli;Rigatoni;Farfalle;Linguine;Fettuccine|fettucine;Tagliatelle;Pappardelle;Ravioli;Tortellini;Lasagne|lasagna;Macaroni|maccheroni;Cannelloni;Conchiglie|pasta shells;Orecchiette;Orzo|risoni;Bucatini;Vermicelli;Capellini|angel hair;Rotini;Cavatappi;Cavatelli;Ditalini;Fregola;Gemelli;Manicotti;Paccheri;Strozzapreti;Trenette;Trofie;Ziti",
    "Traditional Italian pasta shapes, filled or unfilled.",
  ),
  category(
    "rivers",
    "A river runs through it",
    "Name a major river",
    "beetroot",
    "Nile;Amazon;Yangtze|chang jiang;Yellow River|huang he;Mississippi;Missouri;Colorado;Columbia;Rio Grande;Yukon;Mackenzie;Saint Lawrence|st lawrence;Danube;Rhine;Rhone;Seine;Thames;Volga;Don;Dnieper|dnipro;Tigris;Euphrates;Ganges|ganga;Brahmaputra;Indus;Mekong;Irrawaddy|ayeyarwady;Salween;Amur;Lena;Ob;Yenisei;Congo;Niger;Zambezi;Limpopo;Orange;Murray;Darling;Parana;Orinoco;Sao Francisco;Waikato;Clutha|mata au;Whanganui;Waimakariri;Rakaia;Waitaki;Buller|kawatiri;Rangitata",
    "Major world rivers and familiar New Zealand rivers. River suffix is optional.",
  ),
  category(
    "cheeses",
    "Say cheese",
    "Name a type of cheese",
    "turnip",
    "Cheddar;Brie;Camembert;Gouda;Edam;Emmental|emmentaler;Gruyere;Mozzarella;Parmesan|parmigiano reggiano;Pecorino;Ricotta;Mascarpone;Feta;Halloumi;Manchego;Roquefort;Gorgonzola;Stilton;Wensleydale;Red Leicester;Double Gloucester;Cheshire;Lancashire;Caerphilly;Havarti;Jarlsberg;Monterey Jack;Colby;Provolone;Burrata;Taleggio;Fontina;Asiago;Cotija;Paneer;Quark;Cottage cheese;Cream cheese;Goat cheese|goats cheese|chevre;Blue cheese;Limburger;Munster|muenster;Raclette;Reblochon;Comte;Gjetost|brunost",
    "Common cheese varieties. Use the type rather than a brand.",
  ),
  category(
    "spices",
    "Spice of life",
    "Name a culinary spice",
    "pumpkin",
    "Cinnamon;Clove|cloves;Nutmeg;Mace;Allspice;Ginger;Turmeric;Cumin;Coriander|coriander seed;Cardamom;Pepper|black pepper;White pepper;Pink pepper;Sichuan pepper|szechuan pepper;Chilli|chili|cayenne;Paprika;Saffron;Star anise;Anise|aniseed;Fennel|fennel seed;Fenugreek;Mustard|mustard seed;Caraway;Nigella|black cumin;Sumac;Vanilla;Juniper|juniper berry;Ajwain;Asafoetida|hing;Galangal;Tamarind;Amchur|amchoor",
    "Individual culinary spices. Herb leaves and spice blends sit this one out.",
  ),
  category(
    "africa",
    "African adventure",
    "Name a country in Africa",
    "corn",
    "Algeria;Angola;Benin;Botswana;Burkina Faso;Burundi;Cabo Verde|cape verde;Cameroon;Central African Republic|car;Chad;Comoros;Republic of the Congo|congo republic|congo brazzaville;Democratic Republic of the Congo|dr congo|drc|congo kinshasa;Djibouti;Egypt;Equatorial Guinea;Eritrea;Eswatini|swaziland;Ethiopia;Gabon;Gambia|the gambia;Ghana;Guinea;Guinea Bissau;Ivory Coast|cote d ivoire;Kenya;Lesotho;Liberia;Libya;Madagascar;Malawi;Mali;Mauritania;Mauritius;Morocco;Mozambique;Namibia;Niger;Nigeria;Rwanda;Sao Tome and Principe;Senegal;Seychelles;Sierra Leone;Somalia;South Africa;South Sudan;Sudan;Tanzania;Togo;Tunisia;Uganda;Zambia;Zimbabwe",
    "The 54 UN member countries in Africa. Common English and local names accepted.",
  ),
  category(
    "genres",
    "Turn it up",
    "Name a music genre",
    "aubergine",
    "Rock;Pop;Jazz;Blues;Country;Classical;Folk;Hip hop|hiphop;Rap;Reggae;Ska;Punk|punk rock;Metal|heavy metal;Disco;Funk;Soul;Gospel;R and B|r&b|rnb|rhythm and blues;Electronic|electronica;House;Techno;Trance;Dubstep;Drum and bass|dnb;Ambient;Grunge;Indie|indie rock;Alternative|alternative rock;Britpop;Shoegaze;Bluegrass;Rockabilly;Swing;Bebop;Bossa nova;Samba;Salsa;Tango;Flamenco;Afrobeat;Afrobeats;K pop|kpop;J pop|jpop;Opera;Operetta;Chiptune;Synthpop;New wave;Post punk;Post rock;Progressive rock|prog rock;Psychedelic rock;Garage rock;Surf rock;Death metal;Black metal;Doom metal;Power metal;Thrash metal;Trip hop;Downtempo;Dub;Dancehall;Reggaeton",
    "Established genres and familiar subgenres. Artist names do not count.",
  ),
  category(
    "seas",
    "Seven seas and then some",
    "Name a sea",
    "tomato",
    "Mediterranean|mediterranean sea;Caribbean|caribbean sea;Baltic|baltic sea;Black Sea;Red Sea;North Sea;Norwegian Sea;Greenland Sea;Barents Sea;White Sea;Adriatic|adriatic sea;Aegean|aegean sea;Ionian|ionian sea;Tyrrhenian|tyrrhenian sea;Ligurian|ligurian sea;Alboran|alboran sea;Marmara|sea of marmara;Azov|sea of azov;Arabian Sea;Andaman Sea;South China Sea;East China Sea;Yellow Sea;Japan Sea|sea of japan|east sea;Philippine Sea;Sulu Sea;Celebes Sea|sulawesi sea;Java Sea;Banda Sea;Arafura Sea;Timor Sea;Coral Sea;Tasman Sea;Bismarck Sea;Solomon Sea;Bering Sea;Okhotsk|sea of okhotsk;Chukchi Sea;Beaufort Sea;Labrador Sea;Weddell Sea;Ross Sea;Amundsen Sea;Bellingshausen Sea;Scotia Sea;Laccadive Sea;Laptev Sea;Kara Sea",
    "Named seas, rather than oceans or lakes. Sea suffix is optional.",
  ),
  category(
    "units",
    "Measure for measure",
    "Name a unit of measurement",
    "potato",
    "Metre|meter|m;Kilometre|kilometer|km;Centimetre|centimeter|cm;Millimetre|millimeter|mm;Mile;Yard;Foot|feet;Inch;Nautical mile;Light year;Parsec;Astronomical unit|au;Gram|g;Kilogram|kg;Milligram|mg;Tonne|metric ton;Pound|lb;Ounce|oz;Stone;Second|s;Minute;Hour;Ampere|amp;Kelvin;Celsius|degree celsius;Fahrenheit|degree fahrenheit;Mole|mol;Candela;Litre|liter;Millilitre|milliliter;Gallon;Pint;Quart;Fluid ounce;Teaspoon;Tablespoon;Cup;Newton;Pascal;Bar;Atmosphere;Joule;Calorie;Watt;Horsepower;Volt;Ohm;Coulomb;Farad;Hertz;Becquerel;Sievert;Gray;Lumen;Lux;Tesla;Weber;Henry;Radian;Steradian;Degree;Knot;Hectare;Acre;Byte;Bit;Decibel",
    "Common metric, imperial, scientific and computing units. Use a unit rather than the quantity it measures.",
  ),
  category(
    "ranges",
    "Peak performance",
    "Name a mountain range",
    "carrot",
    "Himalayas|himalaya;Andes;Alps;Rocky Mountains|rockies;Appalachians|appalachian mountains;Pyrenees;Carpathians;Apennines;Dolomites;Balkans|balkan mountains;Scandinavian Mountains|scandes;Urals|ural mountains;Caucasus;Atlas Mountains|atlas;Drakensberg;Rwenzori|ruwenzori;Ethiopian Highlands;Hindu Kush;Karakoram;Pamirs|pamir mountains;Tien Shan|tian shan;Kunlun;Altai|altay;Zagros;Alborz|elburz;Western Ghats;Eastern Ghats;Sierra Nevada;Sierra Madre;Cascade Range|cascades;Coast Mountains;Alaska Range;Brooks Range;Great Dividing Range;Southern Alps|ka tiritiri o te moana;Tararua Range|tararuas;Ruahine Range|ruahines;Kaimanawa Range;Kaikoura Ranges;Darran Mountains;Transantarctic Mountains",
    "Mountain ranges from around the world. Range or Mountains suffix is optional.",
  ),
  category(
    "fruit",
    "Fruit salad",
    "Name a common fruit",
    "beetroot",
    "Apple;Apricot;Avocado;Banana;Blackberry|blackberries;Blackcurrant;Blueberry|blueberries;Boysenberry;Cherry|cherries;Coconut;Cranberry;Date;Dragon fruit|pitaya;Durian;Feijoa;Fig;Grape;Grapefruit;Guava;Kiwifruit|kiwi|kiwi fruit;Lemon;Lime;Lychee;Mandarin|tangerine;Mango;Melon;Nectarine;Olive;Orange;Papaya|pawpaw;Passionfruit|passion fruit;Peach;Pear;Persimmon;Pineapple;Plum;Pomegranate;Raspberry|raspberries;Strawberry|strawberries;Watermelon",
    "Common culinary fruits, including a few Kiwi favourites.",
  ),
  category(
    "vegetables",
    "From the patch",
    "Name a common vegetable",
    "turnip",
    "Artichoke;Asparagus;Aubergine|eggplant;Beetroot|beet;Bok choy|pak choi;Broccoli;Brussels sprouts|brussel sprouts;Cabbage;Capsicum|bell pepper;Carrot;Cauliflower;Celery;Chard|silverbeet;Chilli|chili|chilli pepper;Corn|sweetcorn;Courgette|zucchini;Cucumber;Fennel;Garlic;Green bean|green beans;Kale;Kumara|sweet potato;Leek;Lettuce;Mushroom;Onion;Parsnip;Pea|peas;Potato;Pumpkin;Radish;Rhubarb;Shallot;Spinach;Squash;Swede|rutabaga;Tomato;Turnip",
    "Culinary vegetables. NZ and overseas names are welcome.",
  ),
  category(
    "pets",
    "Creature comforts",
    "Name a common pet animal",
    "pumpkin",
    "Cat|cats;Dog|dogs;Rabbit|bunny;Guinea pig;Hamster;Gerbil;Mouse|mice;Rat;Goldfish;Betta|siamese fighting fish;Guppy;Budgie|budgerigar;Canary;Parrot;Cockatiel;Cockatoo;Lovebird;Finch;Turtle;Tortoise;Gecko;Bearded dragon;Snake;Ferret;Chinchilla;Chook|chicken;Axolotl;Frog;Horse;Pony",
    "Common companion animals and familiar aquarium pets.",
  ),
  category(
    "instruments",
    "Garden band",
    "Name a musical instrument",
    "corn",
    "Piano;Guitar;Violin;Viola;Cello;Double bass|upright bass;Bass guitar|bass;Drums|drum|drum kit;Flute;Clarinet;Oboe;Bassoon;Saxophone|sax;Trumpet;Trombone;Tuba;French horn|horn;Harp;Ukulele|uke;Banjo;Mandolin;Accordion;Harmonica;Recorder;Xylophone;Marimba;Triangle;Tambourine;Bongos;Bagpipes;Organ;Synthesizer|synthesiser|synth;Didgeridoo;Sitar",
  ),
  category(
    "sports",
    "Fresh air club",
    "Name a sport",
    "aubergine",
    "Football|soccer;Rugby|rugby union;Rugby league;Cricket;Tennis;Basketball;Netball;Volleyball;Badminton;Table tennis|ping pong;Golf;Hockey|field hockey;Ice hockey;Baseball;Softball;Swimming;Surfing;Sailing;Rowing;Kayaking;Canoeing;Cycling;Running;Athletics|track and field;Boxing;Wrestling;Judo;Karate;Taekwondo;Fencing;Archery;Gymnastics;Diving;Water polo;Handball;Squash;Skiing;Snowboarding;Skateboarding;Climbing|rock climbing;Triathlon;Bowls|lawn bowls;Darts;Snooker;Pool;American football",
  ),
  category(
    "capitals",
    "Capital gains",
    "Name a national capital in Europe",
    "tomato",
    "Tirana;Andorra la Vella;Vienna|wien;Minsk;Brussels|bruxelles;Sarajevo;Sofia;Zagreb;Nicosia|lefkosia;Prague|praha;Copenhagen|kobenhavn;Tallinn;Helsinki;Paris;Berlin;Athens|athina;Budapest;Reykjavik;Dublin;Rome|roma;Riga;Vaduz;Vilnius;Luxembourg|luxembourg city;Valletta;Chisinau;Monaco;Podgorica;Amsterdam;Skopje;Oslo;Warsaw|warszawa;Lisbon|lisboa;Bucharest|bucuresti;Moscow|moskva;San Marino;Belgrade|beograd;Bratislava;Ljubljana;Madrid;Stockholm;Bern|berne;Ankara;Kyiv|kiev;London;Vatican City|vatican;Pristina|prishtina",
    "Capitals of countries in the Europe category, including transcontinental countries and Kosovo.",
  ),
  category(
    "elements",
    "Elementary",
    "Name one of the first 20 chemical elements",
    "potato",
    "Hydrogen|h;Helium|he;Lithium|li;Beryllium|be;Boron|b;Carbon|c;Nitrogen|n;Oxygen|o;Fluorine|f;Neon|ne;Sodium|na;Magnesium|mg;Aluminium|aluminum|al;Silicon|si;Phosphorus|p;Sulfur|sulphur|s;Chlorine|cl;Argon|ar;Potassium|k;Calcium|ca",
    "Atomic numbers 1–20. Element names or symbols are accepted.",
  ),
  category(
    "nzbirds",
    "Feathered neighbours",
    "Name a native New Zealand bird",
    "carrot",
    "Kiwi;Kea;Kaka;Kakapo;Tui;Kereru|new zealand pigeon|wood pigeon;Piwakawaka|fantail;Pukeko;Takahe;Weka;Ruru|morepork;Kotare|kingfisher|sacred kingfisher;Korimako|bellbird;Hihi|stitchbird;Kokako;Tieke|saddleback;Titipounamu|rifleman;Toutouwai|new zealand robin;Mohua|yellowhead;Hoiho|yellow eyed penguin;Korora|little blue penguin|blue penguin;Toroa|albatross;Karearea|new zealand falcon;Kahu|harrier;Kaki|black stilt;Kotuku|white heron;Huia;Moa;Haast's eagle|haast eagle",
    "Māori or English names. Extinct native birds count too.",
  ),
  category(
    "herbs",
    "A pinch of green",
    "Name a culinary herb",
    "beetroot",
    "Basil;Parsley;Coriander|cilantro;Mint;Rosemary;Thyme;Sage;Oregano;Dill;Chives;Tarragon;Marjoram;Bay|bay leaf;Lemongrass;Sorrel;Chervil;Lovage;Fennel;Lavender;Lemon balm;Savory|savoury;Shiso;Curry leaf;Makrut lime leaf|kaffir lime leaf",
    "Fresh or dried herbs used in cooking.",
  ),
  category(
    "farm",
    "Down on the farm",
    "Name a common farm animal",
    "turnip",
    "Cow|cattle|bull|ox;Sheep|lamb|ram;Pig|hog|swine;Goat;Horse;Pony;Donkey|ass;Chicken|hen|rooster|chook;Duck;Goose|geese;Turkey;Alpaca;Llama;Deer;Buffalo|water buffalo;Rabbit;Quail;Ostrich;Emu;Bee|bees|honeybee",
    "Different names for the same animal share an answer.",
  ),
  category(
    "trees",
    "Branching out",
    "Name a common type of tree",
    "pumpkin",
    "Oak;Pine;Maple;Birch;Willow;Elm;Ash;Beech;Cedar;Fir;Spruce;Cypress;Redwood;Sequoia;Eucalyptus|gum;Kauri;Rimu;Totara;Pohutukawa;Kowhai;Kahikatea;Puriri;Karaka;Manuka;Kanuka;Cabbage tree|ti kouka;Palm;Olive;Apple;Cherry;Peach;Plum;Pear;Fig;Magnolia;Walnut;Chestnut;Poplar;Acacia;Jacaranda",
  ),
  category(
    "europe",
    "A European holiday",
    "Name a country in Europe",
    "corn",
    "Albania;Andorra;Austria;Belarus;Belgium;Bosnia and Herzegovina|bosnia;Bulgaria;Croatia;Cyprus;Czechia|czech republic;Denmark;Estonia;Finland;France;Germany;Greece;Hungary;Iceland;Ireland|republic of ireland;Italy;Latvia;Liechtenstein;Lithuania;Luxembourg;Malta;Moldova;Monaco;Montenegro;Netherlands|holland;North Macedonia|macedonia;Norway;Poland;Portugal;Romania;Russia;San Marino;Serbia;Slovakia;Slovenia;Spain;Sweden;Switzerland;Turkey|turkiye;Ukraine;United Kingdom|uk|britain|great britain;Vatican City|vatican;Kosovo",
    "Sovereign countries, including transcontinental countries and Kosovo.",
  ),
  category(
    "flowers",
    "In full bloom",
    "Name a common garden flower",
    "aubergine",
    "Rose;Daisy;Tulip;Daffodil;Sunflower;Lily;Iris;Dahlia;Peony;Poppy;Lavender;Marigold;Petunia;Pansy;Viola;Snapdragon;Geranium;Hydrangea;Hibiscus;Chrysanthemum;Carnation;Orchid;Begonia;Fuchsia;Foxglove;Hollyhock;Cosmos;Zinnia;Sweet pea;Bluebell;Snowdrop;Freesia;Ranunculus;Anemone;Camellia;Azalea;Rhododendron;Wisteria",
  ),
  category(
    "pulses",
    "Full of beans",
    "Name an edible bean or pulse",
    "tomato",
    "Chickpea|garbanzo;Lentil|lentils;Red lentil;Green lentil;Brown lentil;Black lentil|beluga lentil;Puy lentil;Pea|peas;Split pea;Black bean|black turtle bean;Kidney bean|red kidney bean;Cannellini|white kidney bean;Navy bean|haricot bean;Pinto bean;Borlotti|cranberry bean;Lima bean|butter bean;Broad bean|fava bean;Soybean|soya bean|edamame;Mung bean;Adzuki|adzuki bean|azuki;Black eyed pea|cowpea;Runner bean;Green bean|french bean|string bean;Flageolet;Great northern bean;Lupin bean|lupini bean;Pigeon pea;Chana dal;Urad dal|black gram;Horse gram;Moth bean;Tepary bean;Rice bean;Winged bean",
    "Common edible beans, peas and lentil varieties. General and specific lentil names have their own slots.",
  ),
];

export const findAnswer = (category: Category, raw: string): Answer | undefined => {
  const value = normalize(raw);
  const withoutSuffix = value.replace(/(river|sea|mountains|range)$/, "");
  return category.answers.find(
    (answer) =>
      answer.aliases.includes(value) ||
      (category.id === "rivers" && answer.aliases.includes(withoutSuffix)) ||
      (category.id === "seas" &&
        answer.aliases.some((alias) => alias.replace(/sea$/, "") === withoutSuffix)) ||
      (category.id === "ranges" &&
        answer.aliases.some((alias) => alias.replace(/(mountains|range)$/, "") === withoutSuffix)),
  );
};
