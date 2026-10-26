#!/usr/bin/env python3
"""Build catalog.js from the Bottle POS export.

Reads data/pos-export-raw.json, cleans product names, re-sorts every item
into a department and aisle, picks the package shape and colors the page
uses to draw each product image, and writes catalog.js.

Run:  python3 scripts/build_catalog.py
"""
import json
import re
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "pos-export-raw.json"
OUT = ROOT / "catalog.js"
REPORT = ROOT / "data" / "catalog-report.txt"


def rx(words):
    return re.compile(r"(?<![a-z0-9])(?:" + "|".join(words) + r")(?![a-z0-9])", re.I)


# ---------------------------------------------------------------- exclusions
# Tobacco, smoking papers, register buttons and things we don't sell online.
EXCLUDE = rx([
    r"back ?woods?", r"swisher", r"dutch masters", r"black ?& ?mild", r"zig-?zag", r"bob marley",
    r"cigarettes?", r"cigars?", r"cigarillos?", r"arturo fuente", r"punch elite", r"game leaf",
    r"white owl", r"garcia y vega", r"raw (?:papers|cones|classic)", r"papers?", r"green paper",
    r"vapes?", r"juul", r"elf ?bar", r"zyn", r"nicotine", r"grabba", r"hookah", r"space glow",
    r"vip royal capsule", r"satya", r"incense", r"condoms?", r"trojan", r"lottery", r"keno",
    r"open (?:tax )?(?:grocery|wine|beer|liquor)", r"sale sale(?: sale| \d)?", r"mi phone",
    r"gift card", r"the quincy sun", r"the patriot ledger", r"skl", r"bottle deposit", r"deposit",
    r"dr mcgil menthol", r"cuban \w+ rounds", r"churchill", r"rounds \d+ pk",
])

# Sandwiches on the deli board are named after the neighborhood.
DELI = {
    "the neck (italian)": ("The Neck", "Italian cold cuts, provolone, oil and vinegar"),
    "merry mouth": ("Merry Mouth", "A Merrymount favorite from the deli board"),
    "adams shore": ("Adams Shore", "The house sandwich"),
    "shore drive": ("Shore Drive", "From the deli board"),
    "palmer street": ("Palmer Street", "From the deli board"),
    "g-town": ("G-Town", "Named for Germantown"),
    "sea street": ("Sea Street", "Named for our street"),
    "post island": ("Post Island", "From the deli board"),
    "copnh": ("Copeland", "From the deli board"),
    "meat & cheese": ("Meat & Cheese", "Your pick of meat and cheese"),
    "build-your-own": ("Build your own", "Pick the bread, meat, cheese and toppings"),
    "bon appetit": ("Bon Appetit", "From the deli board"),
    "sandwich extra meat": ("Extra meat", "Add extra meat to any sandwich"),
}

# ---------------------------------------------------------------- name fixes
TYPOS = [
    (r"\bSpinfrift\b", "Spindrift"), (r"\bVeriety\b", "Variety"), (r"\bMunt Dew\b", "Mtn Dew"),
    (r"\bDiet12pk\b", "Diet 12 pk"), (r"\bKids Toy Cany\b", "Kids Toy Candy"),
    (r"\bLabbet\b", "Labatt"), (r"\bDr Paper\b", "Dr Pepper"), (r"\bDr Pep\b", "Dr Pepper"),
    (r"\bCapecod\b", "Cape Cod"), (r"\bCape Code\b", "Cape Cod"), (r"\bLaffytaffy\b", "Laffy Taffy"),
    (r"\bCurlywurly\b", "Curly Wurly"), (r"\bAlmondjoy\b", "Almond Joy"), (r"\bMilkyway\b", "Milky Way"),
    (r"\bTridents Gums\b", "Trident Gum"), (r"\bGums\b", "Gum"), (r"\bMcintos\b", "McIntosh"),
    (r"\bHlndl\b", "Hillandale"), (r"\bHillo Ndale\b", "Hillandale"), (r"\bEssentia Watel L\b", "Essentia Water 1 L"),
    (r"\bWatel\b", "Water"), (r"\bSquirel\b", "Squirrel"), (r"\bSesonal\b", "Seasonal"),
    (r"\bIimperial\b", "Imperial"), (r"\bBiirds\b", "Birds"), (r"\bWest Cost\b", "West Coast"),
    (r"\bProtin\b", "Protein"), (r"\bUnweapped\b", "Unwrapped"), (r"\bKit-Kate\b", "Kit Kat"),
    (r"\bCharlston\b", "Charleston"), (r"\bVanila\b", "Vanilla"), (r"\bFavereds\b", "Favorites"),
    (r"\bGoetez's\b", "Goetze's"), (r"\bJhnsonville\b", "Johnsonville"), (r"\bGarnola\b", "Granola"),
    (r"\bTropicanapineapple\b", "Tropicana Pineapple"), (r"\bTaytoroast\b", "Tayto Roast"),
    (r"\bMashrooms\b", "Mushrooms"), (r"\bPapper\b", "Pepper"), (r"\bSeleeve\b", "Sleeve"),
    (r"\bWaffeles\b", "Waffles"), (r"\bAvacado\b", "Avocado"), (r"\bBuffelo\b", "Buffalo"),
    (r"\bMasion\b", "Maison"), (r"\bPedialite\b", "Pedialyte"), (r"\bHotpockets\b", "Hot Pockets"),
    (r"\bHot Pkts\b", "Hot Pockets"), (r"\bSour Crem\b", "Sour Cream"), (r"\bCoors Benquet\b", "Coors Banquet"),
    (r"\bMiller Highlife\b", "Miller High Life"), (r"\bNiklnip\b", "Nylabone Nip"),
    (r"\bTayto Pawn\b", "Tayto Prawn"), (r"\bStock Cold Brew\b", "Stok Cold Brew"),
    (r"\bLettus\b", "Lettuce"), (r"\bChobani Greek Yogurt 5.3 oz All Types\b", "Chobani Greek Yogurt 5.3 oz"),
    (r"\bKona Big Wave 12 pk Can\b", "Kona Big Wave 12 pk Cans"), (r"\bSpaten Lager\b", "Spaten Lager"),
    (r"\bLucozade Energy Orange\b", "Lucozade Energy Orange"), (r"\bMt Dew\b", "Mtn Dew"),
    (r"\bMountain Dew\b", "Mtn Dew"), (r"\bCoke Regular\b", "Coca-Cola"), (r"\bCoke Diet\b", "Diet Coke"),
    (r"\bCoke Zero\b", "Coke Zero"), (r"\bPepsi Regular\b", "Pepsi"), (r"\bPepsi Diet\b", "Diet Pepsi"),
    (r"\bCapt Morgan\b", "Captain Morgan"), (r"\bJamesons\b", "Jameson"), (r"\bTitos\b", "Tito's"),
    (r"\bBota-Box Tetra\b", "Bota Box"), (r"\bY-Tail\b", "Yellow Tail"), (r"\bLamarca\b", "La Marca"),
    (r"\bS\.Blanc\b", "Sauvignon Blanc"), (r"\bSauv/Blanc\b", "Sauvignon Blanc"), (r"\bSauv\. Blanc\b", "Sauvignon Blanc"),
    (r"\bCab-Sauv\b", "Cabernet Sauvignon"), (r"\bCab Sauv\b", "Cabernet Sauvignon"),
    (r"\bP\. Grigio\b", "Pinot Grigio"), (r"\bP Noir\b", "Pinot Noir"), (r"\bWhite Zinf\b", "White Zinfandel"),
    (r"\bBbn\b", "Bourbon"), (r"\bChs\b", "Cheese"), (r"\bChkn\b", "Chicken"), (r"\bSndw\b", "Sandwich"),
    (r"\bCkie\b", "Cookie"), (r"\bCky\b", "Cookie"), (r"\bI/C\b", "Ice Cream"), (r"\bSausg\b", "Sausage"),
    (r"\bLmnade\b", "Lemonade"), (r"\bStraw Lmnade\b", "Strawberry Lemonade"), (r"\bPrtzl\b", "Pretzel"),
    (r"\bRecls\b", "Reclosable"), (r"\bDbl\b", "Double"), (r"\bDoub\b", "Double"), (r"\bCarmel\b", "Caramel"),
    (r"\bRasp\b", "Raspberry"), (r"\bNab\b", "Nabisco"), (r"\bSq Mtn\b", "Sugar Mountain"),
    (r"\bLt\b", "L"), (r"\bSmirnoff V\. ?80\b", "Smirnoff Vodka"), (r"\bSmirnoff V\.", "Smirnoff Vodka"),
    (r"\bGrey Goose L\b", "Grey Goose 1 L"), (r"\bD\.Hines\b", "Duncan Hines"), (r"\bP\.Farm\b", "Pepperidge Farm"),
    (r"\bNstl Tol House Sandl\b", "Nestle Toll House Sandwich"), (r"\bNestle Tool House\b", "Nestle Toll House"),
    (r"\bAndy Capps?\b", "Andy Capp's"), (r"\bMike and Ike\b", "Mike and Ike"), (r"\bMikes\b", "Mike's"),
    (r"\bPlanter\b", "Planters"), (r"\bHr Peanuts\b", "Honey Roasted Peanuts"), (r"\bMcvities\b", "McVitie's"),
    (r"\bMccormick\b", "McCormick"), (r"\bDelmonte\b", "Del Monte"), (r"\bBrigham's\b", "Brigham's"),
    (r"\bWachusetts\b", "Wachusett"), (r"\bHeady & Topper Alchemist\b", "The Alchemist Heady Topper"),
    (r"\bLawsons\b", "Lawson's"), (r"\bJacks Abby\b", "Jack's Abby"), (r"\bDale's Pale Ale\b", "Dale's Pale Ale"),
    (r"\bRichie's Italian Ice\b", "Richie's Italian Ice"), (r"\bHaagen Dazs\b", "Häagen-Dazs"),
    (r"\bBen&Jerry\b", "Ben & Jerry's"), (r"\bBen & Jerry\b", "Ben & Jerry's"), (r"\bReeses\b", "Reese's"),
    (r"\bDubai Chocolate 1.24 oz\b", "Dubai Chocolate Bar 1.24 oz"), (r"\bKeoghs\b", "Keogh's"),
    (r"\bGurley's Candy Bags\b", "Gurley's Candy Bag"), (r"\bHaribo Peg\b", "Haribo Peg Bag"),
    (r"\bSkittles Peg\b", "Skittles Peg Bag"), (r"\bPag Bag\b", "Peg Bag"), (r"\bOscar Mayer Bacon\b", "Oscar Mayer Bacon"),
    (r"\bTotinos\b", "Totino's"), (r"\bStouffers\b", "Stouffer's"), (r"\bMrs Freshleys\b", "Mrs. Freshley's"),
    (r"\bWelchs\b", "Welch's"), (r"\bGatorade Glacier Freeze\b", "Gatorade Glacier Freeze"),
    (r"\bThe Skinny Cow\b", "Skinny Cow"), (r"\bNatalies\b", "Natalie's"), (r"\bSeagram's Jamaican Me Happiness\b", "Seagram's Jamaican Me Happy"),
    (r"\bMinina\b", "Mission"), (r"\bSpinfrift Spiked\b", "Spindrift Spiked"), (r"\bBuzz Ball\b", "Buzzballz"),
    (r"\bBuzz Ballz\b", "Buzzballz"), (r"\bRitas\b", "Rita's"), (r"\bPhx\b", "PHX"), (r"\bG Town\b", "G-Town"),
    (r"\bCafe Bustelo Can\b", "Café Bustelo"), (r"\b20ok\b", "20 ct"), (r"\bTide Pods 20 ct\b", "Tide Pods 20 ct"),
    (r"\bBounty Essentials 26.4m\^2\b", "Bounty Essentials"), (r"\bPete & G Egg\b", "Pete & Gerry's Eggs"),
    (r"\bPete & Gerry Pasture 12 Eggs\b", "Pete & Gerry's Pasture Raised Eggs 12 ct"), (r"\bEggs 12 1 lb\b", "Large Eggs 12 ct"),
    (r"\bPotato Russet\b", "Russet Potatoes"), (r"\bMorning Recovery Lemon\b", "Morning Recovery Lemon"),
    (r"\bSlim Jim Original \.97oz\b", "Slim Jim Original 0.97 oz"), (r"\bMaruchan Chicken Flavor Noodle \.3oz\b", "Maruchan Chicken Ramen 3 oz"),
    (r"\bGm NV\b", "Nature Valley"), (r"\bGm\b", "General Mills"), (r"\bFc\b", "Food Club"), (r"\bD Oro\b", "d'Oro"),
    (r"\bBc\b", "Betty Crocker"), (r"\bHood Half N Half 1quart\b", "Hood Half & Half 1 qt"),
    (r"\bHood Half N Half 1pint\b", "Hood Half & Half 1 pt"), (r"\bHood Heavy Cream 1pint\b", "Hood Heavy Cream 1 pt"),
    (r"\bHood Light Cream 1pint\b", "Hood Light Cream 1 pt"), (r"\b1\.5qt\b", "1.5 qt"), (r"\bArizona Can22oz\b", "Arizona 22 oz Can"),
    (r"\bAmstel Light 12/Pk Can\b", "Amstel Light 12 pk Cans"), (r"\bMiller Lite 12/Pk Btl\b", "Miller Lite 12 pk Bottles"),
    (r"\bMiller Lite 16 oz 6pkcan\b", "Miller Lite 16 oz 6 pk Cans"), (r"\bNatural Ice 16 oz 6pkcan\b", "Natural Ice 16 oz 6 pk Cans"),
    (r"\bModelo Especial 12 pk Cn\b", "Modelo Especial 12 pk Cans"), (r"\bNegro Modelo 12 Pks\b", "Negra Modelo 12 pk Bottles"),
    (r"\bSmirnoff Ice 6 Pks\b", "Smirnoff Ice 6 pk Bottles"), (r"\bWhite Claw Black Berry19.2 oz\b", "White Claw Blackberry 19.2 oz"),
    (r"\bWhite Claw Strawberry19.2 oz\b", "White Claw Strawberry 19.2 oz"), (r"\bCoors Light 18 pk Nr\b", "Coors Light 18 pk Bottles"),
    (r"\bPoland Spring 1 gal\b", "Poland Spring 1 gal"), (r"\bMichelob Ultra 12 pk 16 oz Aluminium\b", "Michelob Ultra 16 oz 12 pk Aluminum"),
    (r"\bLamplighter Rabbit Rabbit 4pkcan\b", "Lamplighter Rabbit Rabbit 4 pk Cans"),
]
TYPOS = [(re.compile(a), b) for a, b in TYPOS]


def clean_name(n):
    n = re.sub(r"\s*\(\d{4,}\)", "", n)            # register codes like (30022)
    n = re.sub(r"\s+", " ", n).strip()
    for a, b in TYPOS:
        n = a.sub(b, n)
    n = re.sub(r"(\d+)\s*/\s*pk", r"\1 pk", n, flags=re.I)
    n = re.sub(r"(\d+)\s*pk\s*can\b", r"\1 pk Cans", n, flags=re.I)
    n = re.sub(r"(\d+ pk) (?:Nr|Btl|Bottle|Btls|Bottles|Loose Btl)\b", r"\1 Bottles", n)
    n = re.sub(r"(\d+ pk) (?:Can|Cn|Cans)\b", r"\1 Cans", n)
    n = re.sub(r"(\d+ pk) Loose\b", r"\1 Loose", n)
    n = re.sub(r"\b(\d+) Loose Btl\b", r"\1 Loose Bottles", n)
    n = re.sub(r"\bNr\b", "Bottles", n)
    n = re.sub(r"\bBtl\b", "Bottle", n)
    n = re.sub(r"(\d)(oz|ml|lb|ct)\b", r"\1 \2", n)
    n = re.sub(r"\b(\d+)z\b", r"\1 oz", n)
    n = re.sub(r"\bL\b(?=$)", "", n).strip() if re.search(r"\d L$", n) is None else n
    return re.sub(r"\s+", " ", n).strip()


# ---------------------------------------------------------------- lexicons
SPIRIT_WORDS = rx([
    "vodka", "tequila", "mezcal", "whiske?y", "whisky", "bourbon", "rye whiskey", "rum", "gin", "cognac",
    "brandy", "liqueur", "scotch(?! tape| magic)", "proof", "schnapps", "soju", "baijiu", "sake", "amaretto", "triple sec", "vermouth",
    "absinthe", "aperitivo?", "grappa", "pisco", "ouzo", "anejo", "añejo", "reposado", "blanco tequila",
])
SPIRIT_BRANDS = rx([
    "smirnoff vodka", "tito'?s", "absolut", "grey goose", "ketel one", "stoli", "svedka", "skyy",
    "new amsterdam", "deep eddy", "pinnacle", "ciroc", "belvedere", "chopin", "three olives", "burnett'?s",
    "mcgillicuddy'?s", "dr\\.? mcgillicuddy'?s", "fireball", "dr apple fireball", "jack daniel'?s(?! country)",
    "jim beam", "maker'?s mark", "bulleit(?! old fashioned)", "wild turkey", "woodford", "knob creek",
    "evan williams", "buffalo trace", "basil hayden'?s", "1792", "eagle rare", "elijah craig", "four roses",
    "crown royal", "canadian club", "seagram'?s (?:7|vo|v\\.o)", "jameson", "tullamore", "proper (?:no\\.? )?twelve",
    "bushmills", "red breast", "redbreast", "powers", "johnnie walker", "dewar'?s", "chivas", "glenlivet",
    "glenfiddich", "macallan", "monkey shoulder", "bacardi", "captain morgan(?! sliced)", "malibu", "kraken",
    "sailor jerry", "goslings?", "mount gay", "don q", "appleton", "tanqueray", "bombay", "hendrick'?s",
    "beefeater", "aviation", "jose cuervo", "cuervo", "patr[oó]n", "don julio", "casamigos", "1800",
    "espol[oò]n", "hornitos", "sauza", "teremana", "lunazul", "el jimador", "la gritona", "viva tequila",
    "clase azul", "hennessy", "remy martin", "r[eé]my", "courvoisier", "d'?uss[eé]", "martell", "e ?& ?j",
    "christian brothers", "paul masson", "hiram walker", "baileys", "kahlua", "kahlúa", "disaronno",
    "jagermeister", "jägermeister", "grand marnier", "cointreau", "aperol", "campari", "st\\.? germain",
    "st\\.? elder", "rumchata", "tuaca", "frangelico", "chambord", "southern comfort", "goldschlager",
    "rumple ?minze", "metaxa", "mashbuild", "jinro", "chamisul", "saero", "gekkeikan", "sho chiku bai",
    "hpnotiq", "ole smoky", "screwball", "skrewball", "uv vodka", "sobieski", "luksusowa", "pravda",
    "highclere", "hennessey", "admiral nelson", "myers'?s?", "lagavulin", "laphroaig", "gentleman jack",
    "old thompson", "ballantine'?s scotch", "buchanan'?s", "dekuyper", "pallini", "galliano", "sambuca", "rumple",
    "pama", "chi chi'?s", "ice box", "pink whitney", "soonhari", "graves alcohol", "everclear", "seagrams vo",
    "michters?", "sazerac", "clyde may'?s", "umiki", "pucker",
])
RTD_BRANDS = rx([
    "white claw", "truly", "high noon", "twisted tea", "smirnoff ice", "smirnoff sourced", "smirnoff (?:green apple|raspberry|red white)",
    "mike'?s(?: hard)?", "four loko", "buzzballz", "rita'?s", "lime ?a ?rita", "cayman jack", "happy dad",
    "beatbox", "arizona hard", "simply spiked", "spindrift spiked", "topo chico hard", "vizzy", "bud light seltzer",
    "surfside", "sunboy", "uptown cocktails", "cutwater", "super lyte", "ranch water", "jack daniel'?s country",
    "captain morgan sliced", "bulleit old fashioned", "kentucky bourbon 4 pk", "viva (?:jalapeno|coconut) tequila 4 pk",
    "on the rocks", "monaco", "nütrl", "nutrl", "loverboy", "fishers island", "crook ?& ?marker", "seagram'?s escapes",
    "seagram'?s jamaican", "seagram'?s (?:variety|veriety)", "angry orchard", "magners", "woodchuck", "downeast",
    "cisco (?:whale|gray)", "sun cruiser", "long drinks?", "viva (?:grapefruit|watermelon|lime|pineapple)", "nantucket cran",
    "salt point", "easy sipping", "mezza di mezza", "chandon spritz", "hudson north", "minus 196", "bold rock", "strongbow", "stella cidre", "dunkin spiked", "redd'?s", "arnold palmer(?! .*tea can)",
    "golden road", "dogfish head canned cocktails", "kona big wave seltzer", "corona (?:hard )?seltzer", "smirnoff seltzer",
    "zero sugar 12 pk", "hard seltzer", "hard cider", "cider", "seltzer.*spiked", "spiked", "hard lemonade", "hard tea",
])
WINE_WORDS = rx([
    "cab(?:ernet)?", "merlot", "pinot", "chardonnay", "chard", "sauvignon", "sauv", "moscato", "prosecco",
    "ros[eé]", "zinfandel", "malbec", "riesling", "chianti", "sangria", "champagne", "brut", "cava",
    "lambrusco", "red blend", "shiraz", "syrah", "tempranillo", "rioja", "montepulciano", "sancerre",
    "beaujolais", "bordeaux", "grenache", "petite sirah", "port", "tawny", "sherry", "marsala", "vino",
    "rouge", "white wine", "red wine", "wine", "redvolution", "nighthawk", "vinho verde", "asti",
    "spumante", "moscato d'?asti", "gew[uü]rztraminer", "albari[nñ]o", "carmenere", "primitivo",
    "nero d'?avola", "valpolicella", "barolo", "super tuscan", "rosso", "bianco wine",
])
WINE_BRANDS = rx([
    "sutter home", "barefoot", "bota box", "black box", "yellow tail", "josh", "kendall[- ]jackson", "meiomi",
    "kim crawford", "coppola", "cupcake(?! two)", "la marca", "apothic", "19 crimes", "woodbridge", "beringer",
    "mark west", "cavit", "ecco domani", "santa margherita", "oyster bay", "matua", "whitehaven", "decoy",
    "caymus", "duckhorn", "robert mondavi", "clos du bois", "chateau ste\\.? michelle", "bogle", "menage a trois",
    "stella rosa", "gallo", "carlo rossi", "franzia", "freixenet", "mionetto", "lunetta", "ruffino", "banfi",
    "tavernello", "bolla", "cooper ?& ?thief", "banshee", "wither hills", "carletto", "pizzolato",
    "la vieille ferme", "la vielle ferme", "lindeman'?s", "dark horse", "14 hands", "columbia crest",
    "j\\. lohr", "j lohr", "louis jadot", "veuve", "mo[eë]t", "chandon", "korbel", "andre", "cook'?s",
    "wycliff", "riunite", "bartenura", "manischewitz", "ca'? del sol", "kris", "j chardonnay", "maison marcel",
    "our daily", "benziger", "kim craw", "beringer c", "dory vino", "gallo 4 pk", "real sangria", "seaglass",
    "chloe", "joel gott", "unshackled", "the prisoner", "justin", "daou", "bread ?& ?butter", "butter chardonnay",
    "la crema", "sonoma-cutrer", "rombauer", "ferrari-carano", "st\\.? francis", "pomelo", "castello del poggio",
    "frontera", "concha y toro", "casillero", "alamos", "trapiche", "catena", "el coto", "marques de caceres",
    "cline", "ravenswood", "seghesio", "line 39", "noble vines", "the seeker", "angeline", "hess", "simi",
    "william hill", "z\\. alexander brown", "z alexander brown", "moscato d", "gnarly head", "conundrum",
    "belle glos", "elouan", "postmark", "liberated", "dreaming tree", "chateau d'?esclans", "whispering angel",
    "hampton water", "fleur de mer", "mezza corona", "mezzacorona", "zonin", "lunetta", "risata", "voga",
    "sterling", "francis ford", "diamond collection",
])
BEER_WORDS = rx([
    "ipa", "i\\.p\\.a\\.?", "ale", "lager", "stout", "porter", "pils", "pilsner", "pilsener", "shandy", "hefeweizen",
    "witbier", "saison", "gose", "kolsch", "kölsch", "bock", "dunkel", "m[aä]rzen", "oktoberfest", "pale ale",
    "double ipa", "dipa", "neipa", "beer", "brew(?:ing|ery)?", "draught",
])
BEER_BRANDS = rx([
    "coors", "miller", "bud(?:weiser)?", "bud light", "michelob", "heineken", "corona", "coronita", "modelo",
    "negra modelo", "pacifico", "stella artois", "guinness", "sam adams", "samuel adams", "harpoon", "blue moon",
    "narragansett", "pabst", "pbr", "yuengling", "natural (?:ice|light)", "busch", "keystone", "labatt",
    "amstel", "peroni", "dos equis", "tecate", "sol", "red stripe", "asahi", "sapporo", "kirin", "spaten",
    "beck'?s", "hoegaarden", "shock top", "leinenkugel'?s?", "kona", "lagunitas", "sierra nevada", "founders",
    "fiddlehead", "night shift", "lord hobo", "jack'?s abby", "allagash", "wachusett", "widowmaker", "lamplighter",
    "mighty squirrel", "stormalong", "lawson'?s", "the alchemist", "heady topper", "tree house", "trillium",
    "bissell", "maine beer", "wormtown", "castle island", "untold", "cape cod beer", "notch", "dogfish",
    "goose island", "new belgium", "voodoo ranger", "dale'?s", "oskar blues", "ballast point", "shipyard",
    "sea dog", "magic hat", "long trail", "von trapp", "schilling", "whalers", "ufo", "rolling rock", "genesee",
    "schlitz", "steel reserve", "mickey'?s", "olde english", "colt 45", "king cobra", "hurricane", "old milwaukee",
    "milwaukee'?s best", "prestige", "fosters", "foster'?s", "athletic", "free wave", "go brew", "sun love",
    "smithwick'?s", "kilkenny", "harp", "murphy'?s", "tusker", "kalik", "presidente", "medalla", "victoria",
    "estrella", "san miguel", "tsingtao", "singha", "chang", "hite", "cass", "efes", "stella",
    "victory", "troegs", "tröegs", "great lakes", "two roads", "lone pine", "maine lunch", "zero gravity",
    "foam brewers", "hill farmstead", "bent water", "aeronaut", "idle hands", "exhibit a", "true west", "barrel house z",
    "medusa", "cambridge brewing", "jack'?s abby", "downeast cider", "wicked hazy", "clown shoes", "brewdog",
    "kentucky", "anchor steam", "deschutes", "bell'?s (?:two|oberon|ale)", "stone (?:ipa|brewing)", "elysian", "21st amendment", "ommegang", "duvel",
    "chimay", "delirium", "weihenstephaner", "paulaner", "warsteiner", "bitburger", "erdinger", "franziskaner",
    "pilsner urquell", "lowenbrau", "löwenbräu", "hofbrau", "hofbräu", "carlsberg", "tuborg", "grolsch",
    "moretti", "birra moretti", "menabrea", "kingfisher", "taj mahal", "red hook", "redhook", "pyramid",
    "abita", "full sail", "rogue", "new glarus", "boulevard", "firestone", "lord hobo", "jacks abby",
])
SODA_BRANDS = rx([
    "coca-cola", "coke", "pepsi", "sprite", "fanta", "dr pepper", "mtn dew", "canada dry", "schweppes",
    "ginger ale", "seven up", "7 ?up", "sunkist", "crush", "a ?& ?w", "mug root", "barq'?s", "root beer",
    "sierra mist", "starry", "fresca", "mexican coke", "jarritos", "squirt", "ginger beer", "cream soda",
    "polar", "la ?croix", "spindrift", "bubly", "poland spring", "dasani", "aquafina", "smart ?water",
    "essentia", "fiji", "evian", "voss", "topo chico", "san ?pellegrino", "sanpellegrino", "perrier",
    "vitamin water", "gatorade", "gatorlyte", "powerade", "propel", "body ?armor", "bodyarmor", "prime",
    "electrolit", "electrolite", "pedialyte(?! freezer)", "liquid i\\.?v", "red bull", "monster", "celsius",
    "alani", "bang", "ghost", "c4", "bloom energy", "lucozade", "5[- ]hour", "rockstar", "nos", "reign",
    "tropicana", "ocean spray", "simply (?:orange|lemonade|apple|limeade|cranberry|mixed berry|peach|watermelon)",
    "minute maid", "arizona(?! hard)", "snapple", "pure leaf", "gold peak", "lipton iced", "honest tea",
    "natalie'?s", "hint", "core water", "core hydration", "vita coco", "coconut water", "starbucks(?! .*k cups)",
    "dunkin iced coffee", "stok", "kombucha", "health[- ]ade", "gts?", "synergy", "joyba", "prebiotic soda",
    "poppi", "olipop", "clamato", "tonic", "club soda", "seltzer", "sparkling ice", "mr\\.? ?& ?mrs\\.? t",
    "zing zang", "rose'?s lime", "grenadine", "margarita mix", "bloody mary", "sour mix", "sweet ?& ?sour",
    "juice", "lemonade", "iced tea", "ice tea", "water", "soda", "energy drink", "sports drink", "electrolyte",
    "nesquik", "yoo-?hoo", "chocolate milk drink", "frappuccino", "mini soda", "pepsi mini", "phx",
    "welch'?s juice", "v8", "capri sun", "kool-aid", "miwadi", "mi wadi", "peace tea", "brisk",
    "califia", "oatly", "silk", "morning recovery", "zevia", "waterloo", "liquid death", "ice 5 lb", "ice \\d+ lb",
    "bagged ice", "ice bag", "tres agaves", "margarita", "mixer", "bitters", "cocktail mix", "core power",
])
ICE = rx(["ice \\d+ ?lb(?: bag)?", "bag(?:ged)? ice", "ice bag", "ice 5 lb bag"])


NOT_FRESH = rx(["sauce", "seasoning", "juice", "cans?", "chunks", "crushed", "diced", "marinated", "mashed", "soup",
    "dip", "chips", "topping", "halves", "sliced", "frozen", "seltzer", "soda", "pk", "peeled", "flakes", "dried",
    "sparkling", "pastene", "del monte", "food club", "badia", "giorgio", "rotel", "wyman'?s", "farm rich",
    "tasty bite", "sunny d", "snyder'?s", "sweet baby ray'?s", "tgi", "spice", "powder", "artichoke", "deep riv",
    "full circle", "clap back", "resers", "betty crocker", "\\d+ oz"])


def grocery_aisle(n):
    """Pick a grocery aisle from the name. First match wins."""
    for aisle, pat in GROCERY:
        if aisle == "Fresh produce" and NOT_FRESH.search(n):
            continue
        if pat.search(n):
            return aisle
    return "Pantry"


GROCERY = [
    ("Pet food and treats", rx(["fancy feast", "friskies", "purina", "cesar", "milk-?bone", "pedigree", "meow mix",
        "iams", "temptations", "nylabone", "valued naturals", "dog", "dogs'? ", "cat food", "cat treats", "kitten",
        "puppy", "beggin", "greenies", "blue buffalo", "rachael ray nutrish", "fresh step", "tidy cats", "cat litter",
        "litter", "soup chew bones", "chew bones", "rawhide", "9 lives", "kibbles"])),
    ("Household and personal care", rx(["paper towels?", "bath(?:room)? tissue", "toilet", "scott", "bounty", "charmin",
        "angel soft", "cottonelle", "kleenex", "puffs", "tide", "cascade", "dawn", "palmolive", "clorox", "lysol",
        "pine ?sol", "windex", "wd ?-?40", "foil", "reynolds", "ziploc", "sandwich bags", "trash bags", "glad",
        "hefty", "plates", "dixie", "solo cups?", "cups", "napkins", "batter(?:y|ies)", "duracell", "energizer",
        "bulb", "charcoal", "kingsford", "firewood", "duraflame", "hotsticks", "match(?:es| light)", "lighters?",
        "bic", "advil", "tylenol", "motrin", "aleve", "tums", "rolaids", "pepto", "halls", "cough", "aquaphor",
        "vaseline", "dove (?:original|minis|bar|soap|men)", "soap", "deodorant", "toothpaste", "toothbrush",
        "colgate", "crest", "shampoo", "conditioner", "loreal", "l'oreal", "gel", "pampers", "huggies", "wipes",
        "diapers", "tampons", "pads", "always", "kotex", "band-?aid", "razor", "gillette", "lotion", "chapstick",
        "pens?", "notebook", "comp book", "memo", "tape", "scotch (?:magic )?tape", "snowbrush", "snow brush",
        "ice scraper", "gift bags", "greeting cards?", "candles?", "air freshener", "febreze", "sponge", "scrub",
        "bleach", "detergent", "fabric", "downy", "bounce", "laundry", "dish", "simply done", "that'?s smart",
        "thats smart", "trash", "storage bags", "coffee filters", "filters", "propane", "sterno", "lint",
        "q-?tips", "cotton", "floss", "listerine", "mouthwash", "sunscreen", "bug spray", "off!", "umbrella",
        "phone charger", "charger", "usb", "earbuds", "playing cards", "dish soap", "cleaner", "towels",
        "zinc", "vitamin(?:s)? (?:c|d) tablets", "emergen-?c", "dayquil", "nyquil", "benadryl", "claritin",
        "zyrtec", "alka", "excedrin", "bayer", "midol", "ibuprofen", "aspirin", "antacid", "dramamine", "imodium",
        "rubber gloves", "hand sanitizer", "purell", "kleenex", "tissues"])),
    ("Pantry", rx(["dressing", "sauce", "alfredo(?! chicken)", "soups?", "noodles", "pasta", "seasoning", "gravy",
        "stock", "broth", "cereal", "flakes", "salsa(?! con queso)", "marinade", "spice", "badia", "mccormick"])),
    ("Ice cream and frozen", rx(["ice cream", "gelato", "sorbet", "ben & jerry'?s", "häagen-dazs", "haagen", "brigham'?s",
        "breyer'?s", "friendly'?s", "gifford'?s", "gilfords", "popsicle", "ice pops?", "freezer pops", "italian ice",
        "outshine", "drum ?stick", "klondike", "skinny cow", "push pop", "frozen", "digiorno", "newman'?s own pizza",
        "totino'?s", "stouffer'?s", "bagel bites", "cape cod cafe", "hot pockets?", "ore-?ida", "gorton", "banquet",
        "green isle", "eggo", "frazil", "pizza rolls", "pizza", "tater tots", "french fried", "fries 28",
        "zesty twirls", "taquitos", "jose ole", "lean cuisine", "marie callender", "hungry man", "birds eye",
        "food club (?:sliced strawberries|california blend|mixed vegetables)", "alfredo chicken parmesan",
        "salisbury", "white castle", "magnum", "rebel ice", "lactaid ice", "snickers ice", "twix ice", "ice cream bar",
        "ice cream sandwich", "hood vanilla sandwich", "cool whip", "talenti", "halo top", "hood (?:ice|sherbet)",
        "richie'?s", "jumbo push", "chipwich", "fudgsicle", "creamsicle", "nestle crunch bar ice"])),
    ("Snacks and chips", rx(["chips?", "lays", "lay'?s", "doritos", "cheetos", "ruffles", "pringles", "tostitos",
        "santitas", "fritos", "takis", "cape cod", "wise", "utz", "tayto", "keogh'?s", "hunky dor(?:y|ys)",
        "popcorn", "smartfoods?", "pretzels?", "pretzel crisps?", "goldfish", "cheez-?it", "chex mix", "gardetto'?s",
        "munchos", "funyuns", "andy capp'?s", "slim jim", "jerky", "old trapper", "jack link'?s", "peanuts", "planters",
        "almonds", "blue diamond", "trail mix", "pistachios?", "sunflower seeds", "david seeds", "cashews",
        "crackers?", "ritz", "triscuit", "wheat thins", "stacy'?s", "pita chips", "veggie straws?", "bugles",
        "combos", "humpty dumpty", "frollies", "over the top", "munchies", "sun ?chips", "kettle", "boulder canyon",
        "terra", "skinny pop", "pirate'?s booty", "corn nuts", "nuts", "mixed nuts", "chex", "handi snaks",
        "rice cakes", "wasa", "crispbread", "tortilla chips", "pork rinds", "oh snap pickle", "community kettle",
        "taytos?", "snax", "monster munch", "walkers", "hula hoops", "king size"])),
    ("Candy and chocolate", rx(["chocolate", "choc", "candy", "cany", "gum", "mints?", "haribo", "skittles", "starburst",
        "twix", "snickers", "kit ?kat", "reese'?s", "hershey'?s", "m ?& ?m'?s?", "cadbury", "dairy milk", "twirl",
        "wispa", "flake", "crunchie", "aero", "kinder", "toblerone", "milka", "mars bar", "twizzlers", "swedish fish",
        "sour patch", "air ?heads", "laffy taffy", "jolly rancher", "nerds", "pop rocks", "ring pop", "blow pop",
        "charms", "tootsie", "life ?savers", "tic tac", "altoids", "mentos", "trident", "dentyne", "extra long",
        "bubblicious", "hubba bubba", "big league chew", "juicy drop", "mike and ike", "hi-chew", "gurley'?s",
        "peg bag", "peg", "dubai", "curly wurly", "maltesers", "rolo", "lion bar", "yorkie", "boost", "picnic",
        "timeout", "caramello", "mallo cup", "junior mints", "sno caps", "heath", "skor", "100 grand",
        "3 musketeers", "milky way", "almond joy", "mounds", "butterfinger", "baby ruth", "payday", "whoppers",
        "sweetarts", "necco", "spree", "mamba", "slime licker", "unicorn doo", "cow tales", "caramel creams?",
        "caramel cream", "smarties", "chupa chups", "chupa chips", "lollipops?", "breath savers", "icebreakers",
        "gummies", "gummy", "sour punch", "sour sneaky", "lifesavers", "york", "5 th avenue", "fifth avenue",
        "fruit chews", "jelly beans", "peeps", "creme egg", "nestle (?:crunch|rowntree|smarties|lion|aero|dibs)",
        "dibs", "kit-kat", "charleston chew", "goetze'?s", "toffees?", "fudge", "brittle", "marshmallow",
        "cotton candy", "baby bottle pop", "penrose", "pickle", "eclairs", "fingers", "pez", "warheads",
        "boyer", "big cup", "nutrageous", "fun dip", "dots", "hot tamales", "good ?& ?plenty", "lemonheads",
        "red vines", "jujubes", "milk duds", "raisinets", "kinder joy", "kinder bueno", "reese'?s pieces",
        "crunch", "mamba", "zours", "sweet pack(?! back)", "candy bags", "pop", "rock candy"])),
    ("Bakery and sweets", rx(["hostess", "little debbie", "drake'?s", "drakes", "tastykake", "entenmann'?s",
        "mrs\\.? freshley'?s", "brownies?", "cookies?", "oreo", "chips ahoy", "nutter butter", "pepperidge farm",
        "tate'?s", "tates", "mcvitie'?s", "digestives", "jaffa cakes", "boland'?s", "bolands", "muffins?",
        "muffin town", "cakes?", "donuts?", "doughnuts?", "whoopie", "pies?", "bread", "rolls?", "bagels?",
        "english muffins?", "tortillas?", "wraps?", "scali", "croissants?", "7 days", "martin'?s", "wonder",
        "arnold", "thomas'?", "nilla", "wafers?", "keebler", "fig bar", "nature'?s fig", "o'?haras",
        "honey bun", "pop-?tarts?", "danish", "biscuits?", "bun", "cupcakes?", "two bite", "loaf",
        "fantini", "piantedosi", "iced gingerbread", "rice krispies treats", "zebra cakes", "ho hos",
        "twinkies", "ding dongs", "swiss rolls", "sno balls", "devil dogs", "yodels", "ring dings",
        "peggy lawton", "daisy'?s", "dutch chocolate", "pastry", "scone", "crumb cake"])),
    ("Dairy and eggs", rx(["milk(?! choc| chocolate|y| duds| bone| bar)", "cream(?! cheese| soda| egg| eggs|y| creme| ale)",
        "half ?(?:n|&|and) ?half", "butter(?!finger| cookies| cup| bread| chardonnay| pecan)", "eggs?", "yogurt",
        "yoplait", "chobani(?! drink)", "chobani greek", "sour cream", "cottage cheese", "cream cheese",
        "philadelphia", "lactaid", "fairlife", "coffee[- ]mate", "creamer", "whipped cream", "reddi wip",
        "hood", "cabot", "sargento", "kraft (?:singles|cheese|parm|american)", "cheese", "cheddar", "mozzarella",
        "provolone", "parmesan", "string cheese", "kerrygold", "land o lakes", "daisy", "organic valley",
        "stonyfield", "horizon", "oikos", "siggi'?s", "activia", "danimals", "go-?gurt", "dannon", "kefir",
        "nellie'?s", "pete ?& ?gerry'?s", "hillandale", "eggland", "kaukauna", "babybel", "laughing cow",
        "velveeta", "ricotta", "feta", "brie", "sartori", "cedar'?s", "hummus", "hommus", "guacamole",
        "wholly", "dip(?! chips)", "french onion", "tzatziki", "core power", "chobani drink", "hood milk"])),
    ("Meat and deli", rx(["boar'?s head", "oscar mayer", "bacon", "hot dogs?", "franks?", "kayem", "sausages?", "salami",
        "salame", "pepperoni", "prosciutto", "ham(?!burger)", "turkey (?:breast|deli|sliced)", "deli", "hamburger",
        "burgers?", "patties", "johnsonville", "jimmy dean", "ball park", "nathan'?s", "hillshire", "hormel",
        "bologna", "chicken (?:breast|thighs|wings|tenders)", "ground beef", "steak", "pork", "bianco",
        "lunchables", "kielbasa", "chorizo", "meatballs", "mortadella", "capicola", "genoa"])),
    ("Fresh produce", rx(["limes?", "lemons?(?! dill| lime| tea| juice| berry| ade| pepper)", "oranges?(?! juice| soda| crush| energy| no pulp| chicken)",
        "apples?(?! juice| sauce|sauce| pie| jacks| cider| crisp| fireball| cinnamon)", "pink lady", "mcintosh", "honeycrisp",
        "granny smith", "gala", "fuji apple", "pears?", "bananas?", "russet potatoes", "potatoes(?! traditional| mashed)",
        "sweet potatoes", "onions?(?! powder| chips| dip| rings)", "tomatoes(?! sauce| paste| crushed| diced| peeled)",
        "lettuce", "romaine", "spinach(?! dip)", "kale", "avocados?", "garlic bulb", "peppers? (?:green|red|bell)",
        "cucumbers?", "grapes?(?! soda| juice| drink| fanta| crush| gatorade| jinro| claw| zero)", "strawberries(?! sliced)",
        "blueberries", "raspberries", "carrots?", "celery(?! juice)", "broccoli(?! florets)", "mushrooms(?! 4 oz| s&p)",
        "cilantro", "parsley", "jalapenos? (?:fresh|peppers)", "ginger root", "watermelon(?! lemonade| claw| sour| gatorade| 6 pk| 12 pk| hard)",
        "cantaloupe", "pineapple(?! chunks| juice| mango| soda| fanta| claw| tequila)", "mango(?! claw| juice| margarita| seltzer| 19| 6 pk| 12 pk| hard| tea| truly)",
        "plantains?", "yellow onion", "dole spinach", "dole salad", "salad kit", "baby carrots", "produce"])),
    ("Pantry", rx([".*"])),
]


FOOD_GUARD = rx([
    "mccormick", "gravy", "extract", "tape", "chews", "peanuts?", "ben & jerry'?s", "twix", "wasa", "gardetto'?s",
    "cocktail (?:salted )?peanuts?", "fruit cocktail", "prawn cocktail", "food color", "cheese", "wedge", "ice cream",
    "cakes?", "two bite", "taquitos", "granola", "crackers", "cookies?", "candy", "chocolate", "sticks 1 lb",
    "rose gold", "cooking wine", "vinegar", "bbq", "sauce", "soup", "chips", "dip", "beans", "mustard", "sandwich",
    "ritz", "slim jim", "banshee bones", "hunky dor(?:y|ys)", "tayto", "biscuits?", "magnum (?:doub|dbl|double)",
    "double caramel", "gin gins", "condoms?", "aquaphor", "cascade", "rye bag", "stuffing", "creamer", "cold foam",
    "seasoning", "marinade", "glaze", "jelly", "gummies", "popcorn", "pretzels?", "tuna", "salmon",
    "p\\.?f\\.? ?chang'?s", "orange chicken", "baking soda", "allegra", "stash", "bisto",
])


def classify(name, old_cat, old_type, types):
    """Return (department, aisle) for a cleaned name."""
    n = name
    low = n.lower()
    if ICE.search(low):
        return "Soft drinks", "Water, seltzer and ice"
    nonalc = re.search(r"\bn/?a\b|non[- ]?alc|zero alcohol|alcohol free|\bnon alcoholic\b|athletic|free wave|go brew|0 n/a|just the haze", low)
    food_guard = FOOD_GUARD.search(low)
    rtd = RTD_BRANDS.search(low)
    if nonalc and (BEER_BRANDS.search(low) or BEER_WORDS.search(low) or "ipa" in low):
        return "Beer", "Non-alcoholic"
    if not food_guard:
        if WINE_BRANDS.search(low) and not rtd:
            return "Wine", wine_type(low)
        if rtd:
            return "Beer", "Seltzers, ciders and cocktails"
        if SPIRIT_BRANDS.search(low) or SPIRIT_WORDS.search(low):
            if not re.search(r"ginger ale|ginger beer|root beer|club soda|tonic|soda water|seltzer|margarita mix|mixer|"
                             r"rum cake|gin gins|ginger|zing zang|bitters|grenadine|lime juice|sour mix", low):
                return "Spirits", spirit_type(low)
        if (WINE_BRANDS.search(low) or WINE_WORDS.search(low)) and not re.search(
                r"\bale\b|ipa|lager|beer|seltzer|lemonade|juice|soda|tea\b|water|claw|truly|gatorade|"
                r"pinot noir 6 pk|pinot.*can|gummies|candy|rose's lime|ros[eé] all day", low):
            return "Wine", wine_type(low)
        if (BEER_BRANDS.search(low) or BEER_WORDS.search(low)) and not re.search(
                r"root beer|ginger beer|ginger ale|birch beer|beer bread|beer batter|beer nuts|ice cream|"
                r"coffee|sol (?:salad|bean)|bud(?:dig| light lime 6)|kona coffee|victoria(?:'?s)? (?:sauce|marinara)|"
                r"stone ground|mustard|great lakes chips|hite(?: rice)?|chang(?:'?s)? sauce|cass (?:honey)|harp seal|"
                r"stella d'?oro|presidente (?:brie|cheese)|athletic tape|kentucky fried|bell'?s seasoning|"
                r"anchor hocking|rogue (?:creamery|cheese)|pyramid|foam (?:cups|plates)|stone (?:wheat|fruit)", low):
            return "Beer", beer_type(low)
    if SODA_BRANDS.search(low) and not re.search(r"baking soda|allegra|tuna|salmon|bread|cracker|crackers|chips|candy|pops|gummies|"
                                                 r"freezer|ice cream|wipes|watercress|sauce|mix(?! 12)|sour cream|"
                                                 r"pedialyte freezer|seltzer bottle|water chestnut|water biscuit|"
                                                 r"juice box", low):
        return "Soft drinks", soda_type(low)
    if old_cat in ("Beer", "Wine", "Spirits") and not food_guard and old_type not in ("Grocery and household",):
        # trust the old drink category only when nothing marks it as food
        if old_cat == "Beer":
            return "Beer", beer_type(low)
        if old_cat == "Wine":
            return "Wine", wine_type(low)
        return "Spirits", spirit_type(low)
    return "Grocery", grocery_aisle(low)


def spirit_type(low):
    for t, p in [
        ("Tequila and mezcal", r"tequila|mezcal|patr[oó]n|don julio|casamigos|1800|espol[oò]n|hornitos|sauza|teremana|lunazul|jimador|gritona|cuervo|clase azul|reposado|anejo|añejo|blanco"),
        ("Whiskey and bourbon", r"whiske?y|whisky|bourbon|rye|scotch|jack daniel|jim beam|maker'?s|bulleit|wild turkey|woodford|knob creek|evan williams|buffalo trace|basil hayden|1792|eagle rare|elijah craig|four roses|crown royal|canadian club|seagram'?s (?:7|vo)|jameson|tullamore|proper|bushmills|redbreast|powers|johnnie walker|dewar|chivas|glen|macallan|monkey shoulder|lagavulin|laphroaig|gentleman jack|old thompson|ballantine|buchanan|michter|sazerac|clyde may|umiki|seagrams vo|fireball|skrewball|screwball|ole smoky|mashbuild"),
        ("Vodka", r"vodka|tito|absolut|grey goose|ketel|stoli|svedka|skyy|new amsterdam|deep eddy|pinnacle|ciroc|belvedere|chopin|three olives|burnett|smirnoff|uv |sobieski|luksusowa|pravda"),
        ("Rum", r"\brum\b|admiral nelson|myers|chi chi|bacardi|captain morgan|malibu|kraken|sailor jerry|gosling|mount gay|don q|appleton"),
        ("Gin", r"\bgin\b|tanqueray|bombay|hendrick|beefeater|aviation"),
        ("Brandy and cognac", r"brandy|cognac|hennessy|hennessey|r[eé]my|courvoisier|d'?uss[eé]|martell|e ?& ?j|christian brothers|paul masson|metaxa"),
        ("Soju and sake", r"soju|jinro|chamisul|saero|sake|gekkeikan|sho chiku|baijiu"),
    ]:
        if re.search(p, low):
            return t
    return "Liqueurs and cordials"


def wine_type(low):
    if re.search(r"prosecco|champagne|brut|cava|sparkling|spumante|asti|moscato d'?asti|freixenet|mionetto|lunetta|korbel|andre|cook'?s|chandon|veuve|mo[eë]t|wycliff|pizzolato|la marca|lambrusco|riunite", low):
        return "Sparkling"
    if re.search(r"ros[eé]|whispering angel|hampton water|white zin", low):
        return "Rosé"
    if re.search(r"sangria", low):
        return "Sangria"
    if re.search(r"port\b|tawny|sherry|marsala", low):
        return "Dessert and port"
    if re.search(r"chard|pinot grigio|pinot gris|sauv(?:ignon)? blanc|riesling|moscato|white|blanc|gew|albari|vinho verde|bianco|chablis|sancerre|viognier|seaglass|breeze", low):
        return "White"
    return "Red"


def beer_type(low):
    for t, p in [
        ("Light beer", r"\blight\b|\blite\b|ultra|platinum|amstel light|corona light|corona premier|michelob light|natural light"),
        ("IPA and pale ale", r"ipa|i\.p\.a|pale ale|hazy|haze|double|imperial|dipa|juicy|sip of sunshine|heady topper|boomsauce|substance|be hoppy|whirlpool|blue comet|keeper|legendary|mass appeal|cloud candy"),
        ("Stout and porter", r"stout|porter|guinness|murphy'?s"),
        ("Imported", r"heineken|corona|coronita|modelo|pacifico|stella|peroni|dos equis|tecate|\bsol\b|red stripe|asahi|sapporo|kirin|spaten|beck'?s|tsingtao|singha|presidente|medalla|victoria|estrella|san miguel|fosters|foster'?s|smithwick|kilkenny|harp|carlsberg|tuborg|grolsch|moretti|menabrea|kingfisher|taj mahal|pilsner urquell|paulaner|warsteiner|bitburger|erdinger|franziskaner|weihenstephaner|lowenbrau|hofbrau|chimay|duvel|delirium|hoegaarden|efes|kalik|tusker|negra"),
        ("Domestic lager", r"coors|miller|bud\b|budweiser|busch|keystone|natural ice|pabst|pbr|yuengling|narragansett|labatt|high life|rolling rock|genesee|schlitz|steel reserve|mickey|olde english|colt 45|king cobra|hurricane|old milwaukee|milwaukee'?s best|prestige|lager|pils|banquet|boston lager"),
    ]:
        if re.search(p, low):
            return t
    return "Craft and seasonal"


def soda_type(low):
    if re.search(r"red bull|monster|celsius|alani|bang|ghost|c4|bloom|lucozade|5[- ]hour|rockstar|\bnos\b|reign|gatorade|gatorlyte|powerade|propel|body ?armor|prime|electrolit|pedialyte|liquid i|core power|morning recovery|energy", low):
        return "Energy and sports"
    if re.search(r"tonic|club soda|zing zang|rose'?s lime|grenadine|margarita|bloody mary|sour mix|sweet ?& ?sour|mixer|bitters|clamato|mr\.? ?& ?mrs|tres agaves", low):
        return "Mixers"
    if re.search(r"water|seltzer|polar|la ?croix|spindrift|bubly|poland|dasani|aquafina|essentia|fiji|evian|voss|topo chico|pellegrino|perrier|ice\b|sparkling ice|hint|vita coco|coconut|liquid death|waterloo", low):
        return "Water, seltzer and ice"
    if re.search(r"juice|tropicana|ocean spray|simply|minute maid|arizona|snapple|pure leaf|gold peak|lipton|honest|natalie|tea|coffee|starbucks|dunkin|stok|kombucha|health[- ]ade|gt|synergy|joyba|lemonade|v8|capri|welch|miwadi|mi wadi|califia|oatly|silk|nesquik|yoo|frappuccino|cold brew|brisk|peace", low):
        return "Juice, tea and coffee"
    return "Soda"


# ---------------------------------------------------------------- visuals
# Shapes the page knows how to draw.
SHAPES = ["can", "tallcan", "case", "pack", "bottle", "bcase", "wine", "sparkle", "spirit", "flask", "nip",
          "pet", "jug", "carton", "bag", "bar", "tub", "box", "jar", "eggs", "fruit", "sandwich", "icebag",
          "tin", "roll", "boxwine", "pouch", "cup"]

BRAND_COLORS = [
    # (pattern, body, label/ink)
    (r"coors light", "#C9D3DC", "#0F4C9A"), (r"coors banquet|coors 30|coors(?! light)", "#F2C14E", "#7A2E1B"),
    (r"miller lite", "#F5F3EE", "#0A3C7D"), (r"miller high life", "#F4E7C5", "#C4122F"),
    (r"bud light", "#1E5BC6", "#FFFFFF"), (r"bud zero|budweiser|bud\b", "#C8102E", "#FFFFFF"),
    (r"michelob ultra", "#EDF1F5", "#1B2E59"), (r"michelob", "#1B2E59", "#D4AF37"),
    (r"heineken", "#0B6A36", "#E4002B"), (r"corona", "#F6D54A", "#0E3B7D"), (r"modelo", "#D9B35C", "#0C2340"),
    (r"pacifico", "#F2E14C", "#C8102E"), (r"stella", "#F2EDE1", "#B01E23"), (r"guinness", "#111111", "#D8B46A"),
    (r"sam adams|samuel adams", "#0C2E55", "#E1B12C"), (r"harpoon", "#1A1A1A", "#E35205"),
    (r"blue moon", "#0F2F5F", "#F28C28"), (r"narragansett", "#F4F1E8", "#C8102E"), (r"pabst|pbr", "#F5F5F5", "#1D3F87"),
    (r"yuengling", "#F2EAD8", "#7B1E1E"), (r"natural (?:ice|light)", "#2E6DB4", "#FFFFFF"),
    (r"labatt", "#1C3F94", "#FFFFFF"), (r"amstel", "#E4002B", "#F5D547"), (r"peroni", "#0F2A6B", "#E4002B"),
    (r"white claw", "#F7F7F5", "#111111"), (r"truly", "#F1EEE8", "#1F1F1F"), (r"high noon", "#F3E7D3", "#1B4D3E"),
    (r"twisted tea", "#1A1A1A", "#E8B84A"), (r"smirnoff", "#E4002B", "#FFFFFF"), (r"angry orchard", "#E8DCC0", "#8C1D18"),
    (r"mike'?s", "#F5D90A", "#111111"), (r"four loko", "#222222", "#FF5A1F"), (r"cayman jack", "#F3E3B5", "#0E5D3A"),
    (r"buzzballz", "#F48FB1", "#3B1F5A"), (r"rita'?s", "#00A651", "#FFFFFF"), (r"lagunitas", "#F3E9D2", "#9B1C1F"),
    (r"sierra nevada", "#1F5A3E", "#E9DFC4"), (r"founders", "#E8E1D3", "#1A1A1A"), (r"fiddlehead", "#F1F1EC", "#2B5F3A"),
    (r"night shift", "#141414", "#F2C14E"), (r"allagash", "#F4F0E6", "#2B4A7A"), (r"kona", "#7DB9D8", "#0E3A5C"),
    (r"shock top", "#F5A623", "#0E2C5C"), (r"leinenkugel", "#E7D6A9", "#0D4C2B"), (r"jack'?s abby", "#F2EEE6", "#C8102E"),
    (r"lord hobo", "#151515", "#E2C044"), (r"lamplighter", "#F2E8D5", "#2C4A6E"), (r"wachusett", "#2E4A8C", "#F1D44C"),
    (r"shipyard", "#E07B1F", "#1F1F1F"), (r"dos equis", "#E8C66A", "#1A1A1A"), (r"red stripe", "#C8102E", "#111111"),
    (r"asahi", "#C9CFD6", "#111111"), (r"spaten", "#F2EEE6", "#0E2C5C"), (r"magners", "#1F3B2B", "#E2C044"),
    (r"coca-cola|coke(?! zero)|mexican coke", "#E4002B", "#FFFFFF"), (r"diet coke", "#D9DCE0", "#E4002B"),
    (r"coke zero", "#111111", "#E4002B"), (r"pepsi", "#004B93", "#FFFFFF"), (r"diet pepsi", "#C9D3DC", "#004B93"),
    (r"sprite", "#00A04A", "#FFF200"), (r"fanta", "#FF8200", "#0C3B9E"), (r"dr pepper", "#701B2E", "#FFFFFF"),
    (r"mtn dew", "#4BA82E", "#E4002B"), (r"canada dry", "#0B6A3A", "#E6C05C"), (r"schweppes", "#F4D35E", "#0B2240"),
    (r"poland spring", "#D8EEF8", "#00704A"), (r"dasani", "#E3F1FB", "#0057A8"), (r"smart ?water", "#EAF3FA", "#2A6EBB"),
    (r"polar", "#EAF4FA", "#0B4F8A"), (r"la ?croix", "#F2F2F2", "#E2457B"), (r"spindrift", "#F3EFE7", "#1A1A1A"),
    (r"red bull", "#1E3A8A", "#C8102E"), (r"monster", "#111111", "#7AC943"), (r"celsius", "#F2F2F2", "#E4002B"),
    (r"alani", "#F7C6D9", "#5A2A82"), (r"gatorade|gatorlyte", "#F47B20", "#111111"), (r"vitamin water", "#F2F2F2", "#E85D9A"),
    (r"arizona", "#9ED1C1", "#C8102E"), (r"tropicana", "#FF9E1B", "#2F7D32"), (r"ocean spray", "#B3122E", "#FFFFFF"),
    (r"hood", "#FFFFFF", "#C8102E"), (r"cabot", "#F3E9D2", "#0C5A35"), (r"chobani", "#F7F3EA", "#1A1A1A"),
    (r"lays|lay'?s", "#F6D300", "#E4002B"), (r"doritos", "#E4002B", "#111111"), (r"ruffles", "#0057A8", "#FFFFFF"),
    (r"pringles", "#E4002B", "#FFFFFF"), (r"tostitos", "#F7E8C7", "#E4002B"), (r"cape cod", "#D6E8F2", "#C8102E"),
    (r"cheetos", "#F47B20", "#111111"), (r"takis", "#5B2C83", "#F7D600"), (r"wise", "#F2C200", "#C8102E"),
    (r"tayto", "#E4002B", "#F7D600"), (r"smartfood", "#111111", "#F7D600"), (r"slim jim", "#E4002B", "#F7D600"),
    (r"snickers", "#5A3420", "#2D6DB5"), (r"reese'?s", "#F47B20", "#4A2311"), (r"hershey", "#4A2311", "#C9CFD6"),
    (r"kit ?kat", "#E4002B", "#FFFFFF"), (r"twix", "#C7A26B", "#C8102E"), (r"m ?& ?m", "#5A3420", "#F7D600"),
    (r"cadbury|dairy milk|wispa|twirl|flake|crunchie|curly wurly", "#4B1E73", "#F4D35E"),
    (r"haribo", "#F5D300", "#E4002B"), (r"skittles", "#E4002B", "#FFFFFF"), (r"sour patch", "#F5D300", "#0057A8"),
    (r"swedish fish", "#E4002B", "#FFFFFF"), (r"airheads|air heads", "#1E88E5", "#FFFFFF"), (r"twizzlers", "#E4002B", "#F7D600"),
    (r"oreo", "#0057A8", "#FFFFFF"), (r"hostess", "#E4002B", "#0057A8"), (r"ben & jerry'?s", "#F2F2F2", "#2F6DB5"),
    (r"häagen-dazs|haagen", "#4A1C1C", "#D4AF37"), (r"brigham'?s", "#0C2E55", "#F2EDE1"), (r"richie'?s", "#F2EDE1", "#C8102E"),
    (r"barilla", "#1E4DA1", "#FFFFFF"), (r"prince", "#0C2E55", "#E4002B"), (r"boar'?s head", "#C8102E", "#F2EDE1"),
    (r"oscar mayer", "#F7D600", "#E4002B"), (r"fancy feast", "#F2EDE1", "#5A2A82"), (r"friskies", "#E4002B", "#F7D600"),
    (r"scott", "#F2F2F2", "#1E5BC6"), (r"bounty", "#F2F2F2", "#2F7D32"), (r"tide", "#F47B20", "#0057A8"),
    (r"sutter home", "#F2EDE1", "#7B1E1E"), (r"barefoot", "#F2EDE1", "#5A2A1A"), (r"bota box", "#7C4A2D", "#F2EDE1"),
    (r"black box", "#111111", "#F2EDE1"), (r"josh", "#F2EDE1", "#1A1A1A"), (r"kim crawford", "#F7F3EA", "#1A1A1A"),
    (r"la marca", "#9EC8D8", "#1A1A1A"), (r"meiomi", "#F2EDE1", "#4A1C1C"), (r"apothic", "#111111", "#B3122E"),
    (r"tito'?s", "#F2EDE1", "#1A1A1A"), (r"fireball", "#C8102E", "#F7D600"), (r"jack daniel", "#111111", "#F2EDE1"),
    (r"jameson", "#1F5A3E", "#F2EDE1"), (r"johnnie walker red", "#C8102E", "#F2EDE1"), (r"johnnie walker black", "#111111", "#D4AF37"),
    (r"captain morgan", "#1A1A1A", "#C8102E"), (r"bacardi", "#111111", "#F2EDE1"), (r"hennessy", "#1A1A1A", "#D4AF37"),
    (r"baileys", "#3A2416", "#D4AF37"), (r"kahlua", "#3A2416", "#F2C14E"), (r"don julio", "#F2EDE1", "#1A1A1A"),
    (r"patr[oó]n", "#F2EDE1", "#2F7D32"), (r"grey goose", "#DCE6EE", "#1E3A8A"), (r"absolut", "#E8EEF2", "#1E3A8A"),
    (r"tanqueray", "#0B6A36", "#C8102E"), (r"bulleit", "#C89B5A", "#1A1A1A"), (r"crown royal", "#4B1E73", "#D4AF37"),
    (r"jinro", "#2E7D4F", "#FFFFFF"), (r"twisted tea", "#1A1A1A", "#E8B84A"),
]
BRAND_COLORS = [(re.compile(p, re.I), a, b) for p, a, b in BRAND_COLORS]

FLAVORS = [
    (r"watermelon", "#F25C6B"), (r"black ?cherry|blackcherry", "#7A1235"), (r"cherry", "#C8102E"), (r"mango", "#F6A723"),
    (r"lime", "#7BC043"), (r"lemon", "#F5D90A"), (r"grape(?!fruit)", "#6A2C91"), (r"grapefruit", "#F47A6B"),
    (r"peach", "#F7A072"), (r"raspberry", "#D6336C"), (r"blackberry|black berry", "#4B1E5A"), (r"strawberry", "#E8384F"),
    (r"blueberry", "#3F51B5"), (r"orange|blood orange|clementine", "#F47B20"), (r"pineapple", "#F2C14E"),
    (r"coconut", "#EDE6D6"), (r"cranberry", "#A4133C"), (r"apple", "#7CB342"), (r"pumpkin", "#E07B1F"),
    (r"berry", "#8E244D"), (r"tropical|punch", "#F25C54"), (r"mint|menthol", "#5CC9A7"), (r"vanilla", "#F3E5AB"),
    (r"chocolate|choco|cocoa", "#5A3420"), (r"caramel", "#C68642"), (r"cinnamon", "#A0522D"), (r"ginger", "#D9A441"),
    (r"citrus", "#F6B93B"), (r"cucumber", "#8BC34A"), (r"melon", "#9CCC65"), (r"plum", "#7B2D5B"),
]
FLAVORS = [(re.compile(p, re.I), c) for p, c in FLAVORS]

DEPT_TONES = {
    "Beer": ["#1F5A3E", "#B4472A", "#0C2E55", "#E1A72C", "#5A2E1B", "#2F6DB5", "#8C1D18", "#3E6B48"],
    "Wine": ["#5A1A2B", "#7B1E3A", "#3D2B1F", "#B98D52", "#2F4A3A", "#7A5C3E"],
    "Spirits": ["#1A1A1A", "#7A4A1E", "#B98D52", "#20395E", "#5A1A2B", "#2F4A3A"],
    "Soft drinks": ["#E4002B", "#0057A8", "#00A04A", "#F47B20", "#5A2A82", "#00A3AD", "#F2C200"],
    "Grocery": ["#C8102E", "#0057A8", "#2F7D32", "#F2A900", "#5A2A82", "#E35205", "#00838F", "#6D4C41", "#AD1457"],
}


def h(s):
    return zlib.crc32(s.encode())


def brand_of(name):
    words = re.sub(r"\d.*$", "", name).split()
    return " ".join(words[:2]) if words else name


def pick_colors(name, dept):
    low = name.lower()
    flavor = next((c for p, c in FLAVORS if p.search(low)), "")
    for p, a, b in BRAND_COLORS:
        if p.search(low):
            return a, b, flavor
    tones = DEPT_TONES.get(dept, DEPT_TONES["Grocery"])
    body = tones[h(brand_of(name)) % len(tones)]
    return body, "#FFFFFF", flavor


def size_of(name, old_size):
    s = old_size or ""
    m = re.search(r"(\d+(?:\.\d+)?)\s*(ml|l|oz|lb|gal|qt|pt|ct)\b", name, re.I)
    vol = (m.group(1) + " " + m.group(2).lower().replace("l", "L") if m.group(2).lower() == "l" else m.group(1) + " " + m.group(2).lower()) if m else ""
    pk = re.search(r"(\d+)\s*pk\b", name, re.I)
    parts = []
    if pk:
        parts.append(pk.group(1) + " pk")
    if vol:
        parts.append(vol)
    return ", ".join(parts) if parts else s


def pick_shape(name, dept, aisle):
    low = name.lower()
    pk = re.search(r"(\d+)\s*pk", low)
    n = int(pk.group(1)) if pk else 0
    bottles = re.search(r"bottles?|nr\b|btl|loose", low)
    ml = re.search(r"(\d+(?:\.\d+)?)\s*ml", low)
    liters = re.search(r"(\d+(?:\.\d+)?)\s*l\b", low)
    if dept == "Grocery" and aisle == "Deli sandwiches":
        return "sandwich"
    if ICE.search(low):
        return "icebag"
    if dept == "Wine":
        if re.search(r"box|tetra|bota|black box|franzia|3 l|5 l", low):
            return "boxwine"
        if re.search(r"\d+ pk", low) and re.search(r"barefoot|cavit|sutter|gallo|prosecco 3", low):
            return "pack"
        return "sparkle" if aisle == "Sparkling" else "wine"
    if dept == "Spirits":
        if ml and float(ml.group(1)) <= 100:
            return "nip"
        if (ml and float(ml.group(1)) <= 375) or re.search(r"pint|200 ml|375", low):
            return "flask"
        return "spirit"
    if dept in ("Beer", "Soft drinks"):
        if dept == "Soft drinks" and re.search(r"gal\b|gallon|128 oz|3 l\b", low):
            return "jug"
        if dept == "Soft drinks" and re.search(r"(?:46|52|59|64) oz|48 oz", low):
            return "carton" if re.search(r"tropicana|juice|simply|minute|newman", low) else "pet"
        if n >= 10:
            return "bcase" if bottles else "case"
        if n >= 2:
            return "bcase" if bottles else "pack"
        if re.search(r"(?:16\.9|20|17|18\.5|21|23\.9|28|32|33\.8) oz|1 l|1\.5 l|2 l|700 ml|500 ml|liter", low) and dept == "Soft drinks":
            return "pet"
        if re.search(r"bottle", low) or (dept == "Soft drinks" and re.search(r"water|gatorade|vitamin|propel|smart|essentia|snapple|pure leaf|tea|juice|kombucha|coffee|starbucks|dunkin|electrolit|core power", low) and not re.search(r"can\b|cans", low)):
            return "bottle" if dept == "Beer" else "pet"
        if re.search(r"(?:16|19\.2|22|23\.5|24|25) oz|tall", low):
            return "tallcan"
        return "can"
    # grocery
    if aisle == "Fresh produce":
        return "fruit"
    if aisle == "Dairy and eggs":
        if re.search(r"eggs?", low) and not re.search(r"creme egg|kinder", low):
            return "eggs"
        if re.search(r"gallon|half gallon|52 oz|1 gal", low):
            return "jug"
        if re.search(r"milk|cream|half|creamer|coffee[- ]mate|lactaid|quart|pint|qt|pt|946", low):
            return "carton"
        if re.search(r"yogurt|sour cream|cottage|hummus|hommus|dip|guacamole|cream cheese|spread|butter", low):
            return "tub"
        return "box"
    if aisle == "Ice cream and frozen":
        if re.search(r"ice cream|gelato|ben & jerry|häagen|haagen|brigham|breyer|friendly|gifford|gilford|qt|quart|pint|talenti|rebel", low) and not re.search(r"bar|sandwich|pops|stick|cone", low):
            return "tub"
        if re.search(r"italian ice|richie", low):
            return "cup"
        if re.search(r"frazil", low):
            return "cup"
        return "box"
    if aisle == "Snacks and chips":
        if re.search(r"pringles", low):
            return "tin"
        if re.search(r"crackers|ritz|triscuit|wheat thins|goldfish|cheez|wasa|crispbread|handi", low):
            return "box"
        if re.search(r"slim jim|jerky", low):
            return "bar"
        if re.search(r"peanuts|almonds|nuts|trail mix|pistachio|cashew", low) and re.search(r"jar|can|16 oz|12 oz", low):
            return "jar"
        return "bag"
    if aisle == "Candy and chocolate":
        if re.search(r"gum|tic tac|altoids|mentos|mints?|breath savers|icebreakers|life ?savers|halls", low):
            return "pouch"
        if re.search(r"bag|peg|5 oz|6 oz|7 oz|8 oz|10 oz|gummies|gummy|haribo|gurley|swedish fish|sour patch|skittles|starburst|nerds|jelly|pop rocks", low):
            return "bag"
        return "bar"
    if aisle == "Bakery and sweets":
        if re.search(r"bread|loaf|rolls|scali|english muffin|bagel|tortilla|wraps", low):
            return "bag"
        if re.search(r"cookies?|oreo|chips ahoy|nutter|tate|digestive|wafer|keebler", low):
            return "box"
        return "pouch"
    if aisle == "Meat and deli":
        return "pouch"
    if aisle == "Pet food and treats":
        if re.search(r"fancy feast|cesar|cans?|3 oz|3\.5 oz|5\.5 oz|13 oz", low):
            return "tin"
        return "bag"
    if aisle == "Household and personal care":
        if re.search(r"towel|tissue|toilet|bath|roll|scott|bounty|charmin|angel soft|cottonelle", low):
            return "roll"
        if re.search(r"firewood|charcoal|kingsford|duraflame|hotsticks", low):
            return "bag"
        if re.search(r"tide|detergent|pine ?sol|bleach|clorox|cleaner|dish|dawn|spray|wd ?40|lysol", low):
            return "jug" if not re.search(r"spray|wd", low) else "pet"
        return "box"
    # pantry
    if re.search(r"soup|beans|tomato(?:es)? (?:sauce|paste|crushed|diced)|tuna|chicken breast can|fruit cocktail|corn \d|peas|green beans|pineapple chunks|mushrooms|artichoke|olives|chunks|broccoli florets|campbell|progresso|goya|del monte|dole chunks|pero|hurst|batchelor|heinz beans", low):
        return "tin"
    if re.search(r"sauce|salsa|pickle|peanut butter|jelly|jam|honey|mayo|mustard|ketchup|dressing|olive oil|oil|vinegar|nutella|spread|marinara|classico|rao|prego|ragu|herdez|vlasic|syrup", low):
        return "jar"
    if re.search(r"pasta|noodles|rice|cereal|oats|oatmeal|flour|sugar|mix|macaroni|annie|kraft mac|bars?|granola|tea bags|k cups|coffee|filters", low):
        if re.search(r"maruchan|cup noodles|nissin", low):
            return "cup"
        return "box"
    if re.search(r"chips|snack|pretzel", low):
        return "bag"
    return "box"


# ---------------------------------------------------------------- build
def main():
    d = json.loads(RAW.read_text())
    cats, types = d["cats"], d["types"]
    seen = {}
    dropped = []
    for name, ci, ti, size, pop, gd in d["items"]:
        raw = name
        old_cat, old_type = cats[ci], types[ti]
        if EXCLUDE.search(name):
            dropped.append(raw)
            continue
        key = re.sub(r"\s+", " ", name.strip().lower())
        if key in DELI:
            nm, desc = DELI[key]
            dept, aisle = "Grocery", "Deli sandwiches"
            name = nm
        else:
            name = clean_name(name)
            desc = ""
            dept, aisle = classify(name, old_cat, old_type, types)
        if dept == "Grocery" and pop < 3 and aisle != "Deli sandwiches":
            dropped.append(raw)
            continue
        k = name.lower()
        if k in seen:
            if pop > seen[k]["pop"]:
                seen[k]["pop"] = pop
            seen[k]["gd"] = seen[k]["gd"] or gd
            continue
        shape = pick_shape(name, dept, aisle)
        body, ink, flavor = pick_colors(name, dept)
        seen[k] = dict(name=name, dept=dept, aisle=aisle, size=size_of(name, size), pop=pop, gd=bool(gd),
                       shape=shape, body=body, ink=ink, flavor=flavor, desc=desc)

    items = sorted(seen.values(), key=lambda x: -x["pop"])
    # Game day picks: keep the export's picks, then add the top cold beer, seltzer, chips, dip and ice.
    for it in items:
        low = it["name"].lower()
        if (it["aisle"] in ("Light beer", "Domestic lager", "Imported", "Seltzers, ciders and cocktails") and re.search(r"(?:12|18|24|30) pk", low) and it["pop"] > 1500) \
           or (it["aisle"] == "Snacks and chips" and it["pop"] > 380 and re.search(r"chips|doritos|tostitos|lays|ruffles|pringles|cape cod|scoops|santitas|salsa|queso", low)) \
           or re.search(r"^ice 5 lb", low) or re.search(r"tostitos (?:salsa|chunky)", low):
            it["gd"] = True

    depts = ["Beer", "Wine", "Spirits", "Soft drinks", "Grocery"]
    aisles = sorted({i["aisle"] for i in items})
    palette = sorted({c for i in items for c in (i["body"], i["ink"], i["flavor"]) if c})
    rows = []
    for i in items:
        rows.append([i["name"], depts.index(i["dept"]), aisles.index(i["aisle"]), i["size"], i["pop"], int(i["gd"]),
                     SHAPES.index(i["shape"]), palette.index(i["body"]), palette.index(i["ink"]),
                     palette.index(i["flavor"]) if i["flavor"] else -1] + ([i["desc"]] if i["desc"] else []))
    data = {"depts": depts, "aisles": aisles, "shapes": SHAPES, "palette": palette, "items": rows}
    OUT.write_text("/* Generated by scripts/build_catalog.py from data/pos-export-raw.json. Do not edit by hand.\n"
                   "   Row: [name, dept, aisle, size, popularity, game day, shape, body color, ink color, flavor color, note?] */\n"
                   "window.CATALOG=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")

    from collections import Counter
    rep = [f"{len(items)} products kept, {len(dropped)} dropped", ""]
    rep += [f"{k}: {v}" for k, v in Counter(i["dept"] + " / " + i["aisle"] for i in items).most_common()]
    rep += ["", "Shapes:"] + [f"{k}: {v}" for k, v in Counter(i["shape"] for i in items).most_common()]
    rep += ["", "Dropped (first 200):"] + dropped[:200]
    REPORT.write_text("\n".join(rep) + "\n")
    print("\n".join(rep[:60]))


if __name__ == "__main__":
    main()
