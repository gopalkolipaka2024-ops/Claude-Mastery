// @ts-nocheck
/*
  Package drawings for products without a photo, ported from the prototype
  (src/store.html). Server-side only: returns SVG markup as a string.
  Shapes come from what the product is (can, case, bottle, bag...), colors from
  the brand, lettering from the name. Fonts: .lb/.lt/.ls/.lsr map onto the two
  site typefaces (see styles/package-art.css).
*/
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lum = hex => {const n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (0.299*r+0.587*g+0.114*b)/255;};
const shade = (hex,amt) => {const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(amt<0?v*(1+amt):v+(255-v)*amt)));return "#"+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,"0")).join("");};

/* ===== PRODUCT ART =====
   Every product gets a drawn package: the shape comes from what it is (can, case, wine bottle,
   chip bag...), the colors from the brand, the label from its name. Swap in a real photo by
   setting PHOTOS["Product name"] = "photos/file.webp". */

const TWO = new Set("light lite claw adams bull croix pepper dew spring home box tail head morgan walker daniel's daniels julio goose mark royal orchard tea ice ultra moon nevada shift abby hobo squirrel artois especial extra water dazs jerry's fish kat patch mayer feast crawford marca crimes coco chips spray cola zero bud jack lagunitas sour cod ranger noon loko jack's lyte dry high life banquet modelo ballz spiked ale beer".split(" "));
function labelOf(p){
  let n = p.name.replace(/\s+\d[\d.,/]*\s*(?:pk|oz|ml|l|lb|ct|gal|qt|pt|yr|years?)\b.*$/i,"").replace(/\s+(?:cans?|bottles?|single|loose)$/i,"").replace(/[()]/g,"");
  const w = n.split(/\s+/).filter(Boolean);
  let i = 1, brand = w[0]||"";
  if(w[1] && (brand.length<=4 || TWO.has(w[1].toLowerCase())) && (brand+" "+w[1]).length<=14){brand+=" "+w[1];i=2;}
  let sub = w.slice(i).join(" ");
  if(sub.length>18) sub = sub.split(" ").reduce((a,x)=>(a+" "+x).trim().length<=18?(a+" "+x).trim():a,"");
  return {brand, sub};
}
function T(txt,x,y,size,maxW,fill,cls="lb",extra=""){
  if(!txt) return "";
  const s = esc(String(txt).toUpperCase());
  const est = s.length*size*(cls==="lb"?.5:.46);
  const fit = est>maxW?` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"`:"";
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" class="${cls}"${fit}${extra}>${s}</text>`;
}
const SHADOW = (rx=34) => `<ellipse cx="60" cy="151" rx="${rx}" ry="4.5" fill="#0D1C40" opacity=".16"/>`;
const pk = p => {const m=p.name.match(/(\d+)\s*pk/i);return m?+m[1]:0;};
function liquid(p){
  const n=p.name.toLowerCase();
  if(/coca|coke|pepsi|dr pepper|cola|root beer|iced coffee|cold brew|coffee/.test(n)) return "#3A1A0E";
  if(/water|seltzer|polar|club soda|tonic|smart|poland|dasani|essentia|fiji|sparkling/.test(n)&&!p.flv) return "#D9EEF8";
  if(p.flv) return p.flv;
  if(/ginger ale|sprite|7 ?up|lemon/.test(n)) return "#E8F0C8";
  return shade(p.body,.25);
}
function glass(p){
  const n=p.name.toLowerCase();
  if(/corona|coronita|pacifico|\bsol\b|miller high life|clear/.test(n)) return "#E9E2B8";
  if(/heineken|rolling rock|stella|beck|grolsch|peroni|moretti|sam adams light/.test(n)) return "#1F5E2C";
  return "#5A3311";
}
function wineGlass(p){
  return {Red:"#2A1015",White:"#BFC98E",Rosé:"#EFA2B2",Sparkling:"#23331F",Sangria:"#6E1A33","Dessert and port":"#3B1A0E"}[p.aisle]||"#2A1015";
}
function spiritLiquid(p){
  const a=p.aisle;
  if(/Whiskey/.test(a)) return "#B5651D";
  if(/Rum/.test(a)) return /white|light|silver|coconut|malibu/i.test(p.name)?"#E6EEF2":"#8B4513";
  if(/Brandy/.test(a)) return "#7B3F00";
  if(/Tequila/.test(a)) return /reposado|anejo|añejo|gold/i.test(p.name)?"#D99A3C":"#E6EEF2";
  if(/Liqueur/.test(a)) return p.flv||shade(p.body,.1);
  return "#E6EEF2";
}

const SHAPES = {
  can(p,L,o={}){
    const x=o.x??38,w=o.w??44,top=o.top??40,bot=o.bot??148,cx=x+w/2,h=bot-top;
    return `<path d="M${x+3} ${top} h${w-6} l3 6 v${h-10} q0 4 -4 4 h${-(w-2)} q-4 0 -4 -4 v${-(h-10)} z" fill="${p.body}"/>`+
      (p.flv?`<rect x="${x}" y="${bot-h*.3}" width="${w}" height="${h*.1}" fill="${p.flv}"/>`:"")+
      `<rect x="${x}" y="${top+h*.18}" width="${w}" height="2" fill="${p.ink}" opacity=".5"/>`+
      T(L.brand,cx,top+h*.46,Math.min(13,w*.3),w-6,p.ink)+T(L.sub,cx,top+h*.6,Math.min(8,w*.18),w-8,p.ink,"lt")+
      `<path d="M${x+3} ${top} h${w-6} l3 6 v${h-10} q0 4 -4 4 h${-(w-2)} q-4 0 -4 -4 v${-(h-10)} z" fill="url(#cyl)"/>`+
      `<ellipse cx="${cx}" cy="${top+1}" rx="${w/2-3}" ry="3.2" fill="url(#metal)"/><ellipse cx="${cx}" cy="${top+1}" rx="${w/2-7}" ry="1.8" fill="#B9C1CA"/>`;
  },
  tallcan(p,L){return SHAPES.can(p,L,{x:40,w:40,top:18,bot:148});},
  case(p,L){
    const n=pk(p)||12, side=shade(p.body,-.28), top=shade(p.body,.18);
    return SHADOW(52)+`<path d="M24 48 L110 48 L96 62 L10 62 Z" fill="${top}"/><path d="M96 62 L110 48 L110 134 L96 148 Z" fill="${side}"/>`+
      `<rect x="10" y="62" width="86" height="86" fill="${p.body}"/>`+
      (p.flv?`<rect x="10" y="126" width="86" height="8" fill="${p.flv}"/>`:"")+
      `<rect x="10" y="62" width="86" height="86" fill="url(#flat)"/>`+
      T(L.brand,53,92,17,78,p.ink)+T(L.sub,53,106,9,76,p.ink,"lt")+
      `<g transform="translate(70 112)"><circle r="13" fill="${p.ink}"/>`+T(n+"",0,3,12,18,p.body)+T("PACK",0,10,5.5,18,p.body,"lt")+`</g>`+
      `<g opacity=".9"><rect x="16" y="112" width="12" height="22" rx="2" fill="url(#metal)"/><rect x="30" y="112" width="12" height="22" rx="2" fill="url(#metal)"/></g>`;
  },
  pack(p,L){
    const side=shade(p.body,-.28), isW=p.dept==="Wine";
    const tops=[22,46,70].map(x=>isW
      ?`<path d="M${x+8} 26 h8 v14 q0 6 6 12 v30 h-20 v-30 q6 -6 6 -12 z" fill="${wineGlass(p)}"/>`
      :`<rect x="${x}" y="34" width="28" height="44" rx="3" fill="${p.body}"/><rect x="${x}" y="34" width="28" height="44" rx="3" fill="url(#cyl)"/><ellipse cx="${x+14}" cy="35" rx="11" ry="2.6" fill="url(#metal)"/>`).join("");
    return SHADOW(48)+tops+`<path d="M102 76 L110 70 L110 140 L102 148 Z" fill="${side}"/><rect x="14" y="76" width="88" height="72" rx="2" fill="${p.body}"/>`+
      (p.flv?`<rect x="14" y="128" width="88" height="7" fill="${p.flv}"/>`:"")+`<rect x="14" y="76" width="88" height="72" fill="url(#flat)"/>`+
      T(L.brand,58,104,16,80,p.ink)+T(L.sub,58,118,8.5,78,p.ink,"lt")+T((pk(p)||6)+" PK",58,143,7,40,p.ink,"lt");
  },
  bottle(p,L){
    const g=glass(p);
    const d="M54 20 L66 20 L66 48 Q66 60 74 72 L74 144 Q74 148 70 148 L50 148 Q46 148 46 144 L46 72 Q54 60 54 48 Z";
    return SHADOW(18)+`<path d="${d}" fill="${g}"/><rect x="53" y="14" width="14" height="8" rx="2" fill="${p.body}"/><rect x="54" y="34" width="12" height="10" fill="${p.body}"/>`+
      `<rect x="46" y="94" width="28" height="34" fill="${p.body}"/>`+T(L.brand,60,112,9,24,p.ink)+T(L.sub,60,121,5.5,24,p.ink,"lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
  bcase(p,L){
    const g=glass(p), side=shade(p.body,-.28);
    const necks=[24,54,84].map(x=>`<path d="M${x} 72 Q${x+2} 52 ${x+3} 40 L${x+3} 26 h8 v14 Q${x+12} 52 ${x+14} 72 Z" fill="${g}"/><path d="M${x} 72 Q${x+2} 52 ${x+3} 40 L${x+3} 26 h8 v14 Q${x+12} 52 ${x+14} 72 Z" fill="url(#cyl)"/><rect x="${x+2}" y="21" width="10" height="6" rx="1.5" fill="${p.ink}"/>`).join("");
    return SHADOW(50)+necks+`<path d="M104 74 L112 68 L112 140 L104 148 Z" fill="${side}"/><rect x="10" y="70" width="94" height="78" rx="2" fill="${p.body}"/>`+
      (p.flv?`<rect x="10" y="128" width="94" height="7" fill="${p.flv}"/>`:"")+`<rect x="10" y="70" width="94" height="78" fill="url(#flat)"/>`+
      T(L.brand,57,102,17,84,p.ink)+T(L.sub,57,116,8.5,82,p.ink,"lt")+T((pk(p)||6)+" BOTTLES",57,141,7,60,p.ink,"lt");
  },
  wine(p,L){
    const g=wineGlass(p), d="M54 10 L66 10 L66 52 Q66 62 76 70 L76 146 Q76 150 72 150 L48 150 Q44 150 44 146 L44 70 Q54 62 54 52 Z";
    const foil = lum(p.body)>.85?"#7B1E3A":p.body;
    return SHADOW(20)+`<path d="${d}" fill="${g}"/><rect x="53.5" y="8" width="13" height="34" rx="2" fill="${foil}"/>`+
      `<rect x="46" y="90" width="28" height="44" fill="#F5F0E4"/><rect x="46" y="90" width="28" height="3" fill="${foil}"/>`+
      T(L.brand,60,108,8.5,24,"#2A1A12")+T(L.sub,60,118,5.2,24,"#5A4636","lt")+T(p.aisle==="Red"?"RED WINE":p.aisle==="White"?"WHITE WINE":p.aisle.toUpperCase(),60,128,4.2,22,foil,"lt")+
      `<path d="${d}" fill="url(#cyl)"/>`;
  },
  sparkle(p,L){
    const d="M55 12 L65 12 L65 50 Q65 66 78 80 L78 146 Q78 150 74 150 L46 150 Q42 150 42 146 L42 80 Q55 66 55 50 Z";
    const foil = lum(p.body)>.8?"#C9A14A":p.body;
    return SHADOW(22)+`<path d="${d}" fill="#23331F"/><path d="M53 8 h14 v46 q0 10 6 18 h-26 q6 -8 6 -18z" fill="${foil}"/>`+
      `<ellipse cx="60" cy="112" rx="15" ry="20" fill="#F5F0E4"/>`+T(L.brand,60,112,8,24,"#2A1A12")+T(L.sub||"SPARKLING",60,121,5,22,"#5A4636","lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
  spirit(p,L,o={}){
    const liq=spiritLiquid(p), d="M54 16 L66 16 L66 40 Q66 48 80 54 L80 146 Q80 150 76 150 L44 150 Q40 150 40 146 L40 54 Q54 48 54 40 Z";
    const lab = lum(p.body)>.85 ? shade(p.ink,0) : p.body, labInk = lum(p.body)>.85 ? "#F5F0E4" : p.ink;
    return (o.noShadow?"":SHADOW(24))+`<path d="${d}" fill="${liq}"/>`+(lum(liq)>.85?`<path d="${d}" fill="#9FB6E3" opacity=".18"/>`:"")+
      `<rect x="52" y="6" width="16" height="13" rx="2" fill="${p.ink==="#FFFFFF"?"#1A1A1A":p.ink}"/>`+
      `<rect x="43" y="86" width="34" height="46" rx="2" fill="${lab}"/>`+T(L.brand,60,107,10,30,labInk)+T(L.sub,60,118,5.5,30,labInk,"lt")+
      T(p.aisle.split(" ")[0].replace("Liqueurs","LIQUEUR").toUpperCase(),60,127,4.6,28,labInk,"lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
  flask(p,L){
    const liq=spiritLiquid(p), d="M51 30 L69 30 L69 52 Q84 56 84 68 L84 140 Q84 148 76 148 L44 148 Q36 148 36 140 L36 68 Q36 56 51 52 Z";
    const lab = lum(p.body)>.85 ? p.ink : p.body, labInk = lum(p.body)>.85 ? "#F5F0E4" : p.ink;
    return SHADOW(26)+`<path d="${d}" fill="${liq}"/><rect x="50" y="20" width="20" height="12" rx="2" fill="#1A1A1A"/>`+
      `<rect x="40" y="84" width="40" height="40" rx="2" fill="${lab}"/>`+T(L.brand,60,104,11,34,labInk)+T(L.sub,60,115,5.5,34,labInk,"lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
  nip(p,L){return SHADOW(12)+`<g transform="translate(33 71) scale(.55)">${SHAPES.spirit(p,L,{noShadow:1})}</g>`;},
  pet(p,L){
    const liq=liquid(p), d="M53 14 L67 14 L67 26 Q67 34 76 42 L76 140 Q76 148 68 148 L52 148 Q44 148 44 140 L44 42 Q53 34 53 26 Z";
    return SHADOW(20)+`<path d="${d}" fill="${liq}" opacity=".92"/><rect x="52" y="7" width="16" height="9" rx="2" fill="${p.body}"/>`+
      `<rect x="44" y="66" width="32" height="44" fill="${p.body}"/>`+T(L.brand,60,86,9.5,28,p.ink)+T(L.sub,60,97,5.6,28,p.ink,"lt")+
      `<path d="M46 120 h28 M46 128 h28 M46 136 h28" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="${d}" fill="url(#cyl)"/>`;
  },
  jug(p,L){
    const n=p.name.toLowerCase(), liq=/milk|cream|lactaid|fairlife/.test(n)?"#FAFAF6":/water|poland|spring/.test(n)?"#D9EEF8":liquid(p);
    const d="M40 40 L62 40 L62 28 L78 28 L78 40 L86 40 Q94 40 94 50 L94 142 Q94 148 88 148 L32 148 Q26 148 26 142 L26 52 Q26 40 40 40 Z";
    return SHADOW(36)+`<path d="${d}" fill="${liq}"/><path d="M80 48 q12 0 12 14 v18 q0 8 -8 8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5"/>`+
      `<rect x="61" y="22" width="18" height="8" rx="2" fill="${p.body==="#FFFFFF"?p.ink:p.body}"/>`+
      `<rect x="26" y="84" width="68" height="40" fill="${p.body==="#FFFFFF"?p.ink:p.body}"/>`+T(L.brand,60,104,15,60,p.body==="#FFFFFF"?"#fff":p.ink)+T(L.sub,60,116,7,60,p.body==="#FFFFFF"?"#fff":p.ink,"lt")+
      `<path d="${d}" fill="url(#cyl)" opacity=".7"/>`;
  },
  carton(p,L){
    const band = lum(p.body)>.85?p.ink:p.body, bInk = lum(p.body)>.85?"#FFFFFF":p.ink;
    return SHADOW(30)+`<path d="M80 44 L92 38 L92 142 L80 148 Z" fill="#D9DDE3"/><path d="M34 44 L57 24 L80 44 Z" fill="#EEF0F3"/><path d="M57 24 L69 18 L92 38 L80 44 Z" fill="#C9CED6"/>`+
      `<rect x="51" y="16" width="12" height="9" fill="#F4F5F7"/><rect x="34" y="44" width="46" height="104" fill="#FBFAF6"/>`+
      `<rect x="34" y="92" width="46" height="56" fill="${band}"/>`+(p.flv?`<circle cx="57" cy="70" r="12" fill="${p.flv}"/>`:`<path d="M38 78 q19 -14 38 0" stroke="${band}" stroke-width="3" fill="none"/>`)+
      T(L.brand,57,114,11,40,bInk)+T(L.sub,57,126,6,40,bInk,"lt")+`<rect x="34" y="44" width="46" height="104" fill="url(#flat)"/>`;
  },
  bag(p,L){
    const d="M24 30 L96 30 L92 42 Q101 90 92 136 L96 148 L24 148 L28 136 Q19 90 28 42 Z";
    const win = p.flv||shade(p.body,.45);
    return SHADOW(36)+`<path d="${d}" fill="${p.body}"/><path d="M24 30 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6" fill="none" stroke="${shade(p.body,-.25)}" stroke-width="2"/>`+
      `<path d="M24 148 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke="${shade(p.body,-.25)}" stroke-width="2"/>`+
      T(L.brand,60,66,17,58,p.ink)+T(L.sub,60,80,8,58,p.ink,"lt")+`<ellipse cx="60" cy="110" rx="22" ry="17" fill="${win}"/><ellipse cx="60" cy="110" rx="22" ry="17" fill="none" stroke="${p.ink}" stroke-width="2" opacity=".6"/>`+
      `<path d="${d}" fill="url(#cyl)" opacity=".75"/><path d="${d}" fill="url(#sheen)" opacity=".6"/>`;
  },
  bar(p,L){
    return SHADOW(46)+`<g transform="rotate(-9 60 96)"><path d="M14 72 L106 72 L110 76 L106 80 L110 84 L106 88 L110 92 L106 96 L110 100 L106 104 L110 108 L106 112 L106 120 L14 120 L14 112 L10 108 L14 104 L10 100 L14 96 L10 92 L14 88 L10 84 L14 80 L10 76 Z" fill="${p.body}"/>`+
      (p.flv?`<rect x="14" y="108" width="92" height="6" fill="${p.flv}"/>`:"")+T(L.brand,60,99,18,80,p.ink)+T(L.sub,60,110,7.5,76,p.ink,"lt")+
      `<rect x="14" y="72" width="92" height="48" fill="url(#flat)"/></g>`;
  },
  tub(p,L){
    const d="M33 54 L87 54 L82 146 Q82 148 78 148 L42 148 Q38 148 38 146 Z";
    return SHADOW(26)+`<path d="${d}" fill="${p.body}"/>`+(p.flv?`<path d="M35 118 L85 118 L84 130 L36 130 Z" fill="${p.flv}"/>`:"")+
      `<rect x="29" y="40" width="62" height="16" rx="4" fill="${shade(p.body,-.22)}"/>`+T(L.brand,60,86,13,46,p.ink)+T(L.sub,60,100,6.5,44,p.ink,"lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
  box(p,L){
    const side=shade(p.body,-.3), topc=shade(p.body,.2);
    return SHADOW(38)+`<path d="M26 32 L38 24 L98 24 L86 32 Z" fill="${topc}"/><path d="M86 32 L98 24 L98 142 L86 148 Z" fill="${side}"/>`+
      `<rect x="26" y="32" width="60" height="116" fill="${p.body}"/>`+T(L.brand,56,60,15,52,p.ink)+T(L.sub,56,73,7,52,p.ink,"lt")+
      `<circle cx="56" cy="108" r="20" fill="${p.flv||shade(p.body,.35)}"/><circle cx="56" cy="108" r="20" fill="none" stroke="${p.ink}" stroke-opacity=".5" stroke-width="2"/>`+
      `<rect x="26" y="32" width="60" height="116" fill="url(#flat)"/>`;
  },
  jar(p,L){
    const d="M36 58 Q34 54 40 54 L80 54 Q86 54 84 58 L86 140 Q86 148 78 148 L42 148 Q34 148 34 140 Z";
    return SHADOW(28)+`<path d="${d}" fill="${p.flv||shade(p.body,-.15)}"/><rect x="38" y="38" width="44" height="18" rx="3" fill="${p.body}"/><rect x="38" y="38" width="44" height="18" rx="3" fill="url(#cyl)"/>`+
      `<rect x="34" y="80" width="52" height="44" fill="#F5F0E4"/>`+T(L.brand,60,100,11,46,lum(p.body)>.8?p.ink:p.body)+T(L.sub,60,112,6,46,"#5A4636","lt")+`<path d="${d}" fill="url(#cyl)" opacity=".6"/>`;
  },
  eggs(p,L){
    const brown=/brown|pasture|nellie|organic|pete/i.test(p.name);
    const eggs=[34,52,70,88].map((x,i)=>`<ellipse cx="${x}" cy="${74-(i%2)*3}" rx="9" ry="12" fill="${brown?"#C9905E":"#F7F2E8"}"/>`).join("");
    return SHADOW(48)+eggs+`<path d="M12 80 L108 80 L104 140 Q104 146 98 146 L22 146 Q16 146 16 140 Z" fill="#D7C6A6"/>`+
      [24,40,56,72,88].map(x=>`<path d="M${x} 80 q8 10 16 0" fill="none" stroke="#B8A47E" stroke-width="2"/>`).join("")+
      `<rect x="30" y="98" width="60" height="34" rx="3" fill="${p.body}"/>`+T(L.brand,60,116,11,52,p.ink)+T(L.sub||"EGGS",60,127,6,52,p.ink,"lt");
  },
  fruit(p){
    const n=p.name.toLowerCase();
    const blob=(cx,cy,rx,ry,c,rot=0)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${cx} ${cy})"/><ellipse cx="${cx-rx*.35}" cy="${cy-ry*.4}" rx="${rx*.28}" ry="${ry*.18}" fill="#fff" opacity=".35" transform="rotate(${rot} ${cx} ${cy})"/>`;
    const leaf=(x,y,c="#3F8F2E")=>`<path d="M${x} ${y} q8 -10 16 -4 q-8 8 -16 4z" fill="${c}"/>`;
    let s="";
    if(/lime/.test(n)) s=blob(44,124,20,16,"#5E9E2A",-10)+blob(78,126,19,15,"#6BAA2C",12)+blob(60,104,20,16,"#76B83A");
    else if(/lemon/.test(n)) s=blob(44,124,22,15,"#F2CF1D",-12)+blob(78,126,21,14,"#F5D90A",10)+blob(60,104,22,15,"#F7DE2C");
    else if(/orange|mandarin|clementine|tangerine/.test(n)) s=blob(42,124,20,20,"#F28C28")+blob(80,124,20,20,"#F39A36")+blob(61,98,21,21,"#F5A23E")+leaf(61,78);
    else if(/pear/.test(n)) s=`<path d="M60 60 q-6 18 -16 30 q-16 22 4 50 q12 10 24 0 q20 -28 4 -50 q-10 -12 -16 -30z" fill="#C3CF4C"/>`+leaf(60,62)+`<path d="M60 62 v-8" stroke="#6B4A2E" stroke-width="3"/>`;
    else if(/apple/.test(n)){const c=/green|granny/.test(n)?"#8CC63F":/pink lady/.test(n)?"#E86A7A":"#C8102E";s=`<path d="M60 74 q-10 -8 -24 -2 q-18 10 -10 42 q8 30 30 30 q4 0 4 -2 q0 2 4 2 q22 0 30 -30 q8 -32 -10 -42 q-14 -6 -24 2z" fill="${c}"/><path d="M60 74 q0 -10 4 -16" stroke="#6B4A2E" stroke-width="3" fill="none"/>`+leaf(62,62)+`<ellipse cx="44" cy="92" rx="7" ry="11" fill="#fff" opacity=".3"/>`;}
    else if(/potato/.test(n)) s=blob(42,126,24,16,"#B9875A",-8)+blob(80,128,22,15,"#C49464",10)+blob(60,106,24,16,"#C99A6B",4);
    else if(/onion/.test(n)) s=`<path d="M60 70 q-34 18 -26 52 q8 26 26 26 q18 0 26 -26 q8 -34 -26 -52z" fill="#C97B3C"/><path d="M60 70 q-12 30 0 76 M60 70 q12 30 0 76" stroke="#A35F28" fill="none"/><path d="M58 70 q2 -14 0 -20" stroke="#6E8F3A" stroke-width="3"/>`;
    else if(/carrot/.test(n)) s=[40,58,76].map((x,i)=>`<path d="M${x} 64 l10 0 l-5 80z" fill="#F07A1A" transform="rotate(${(i-1)*10} ${x+5} 104)"/><path d="M${x+5} 64 q-6 -14 -10 -18 M${x+5} 64 q2 -16 0 -22 M${x+5} 64 q8 -12 12 -16" stroke="#4E9A2E" stroke-width="3" fill="none"/>`).join("");
    else if(/tomato/.test(n)) s=[[42,124],[78,124],[60,104],[50,140],[72,140]].map(([x,y])=>blob(x,y,13,12,"#D7262E")+`<path d="M${x} ${y-12} l3 3 l-3 -1 l-3 1z" fill="#3F8F2E"/>`).join("");
    else if(/blueberr/.test(n)) s=`<rect x="22" y="94" width="76" height="50" rx="6" fill="#DDE7F2" opacity=".8"/>`+[30,42,54,66,78,36,48,60,72,84].map((x,i)=>`<circle cx="${x+4}" cy="${i<5?110:126}" r="7" fill="#33407A"/>`).join("");
    else if(/banana/.test(n)) s=`<path d="M28 90 q30 60 72 20 q-4 -4 -8 -2 q-30 30 -58 -20z" fill="#F5D53A"/><path d="M30 100 q30 54 66 18" stroke="#E3B91C" stroke-width="3" fill="none"/>`;
    else s=[[40,110],[60,96],[80,110],[50,130],[72,130]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="22" ry="14" fill="${["#4E9A2E","#5FAF3A","#3F8F2E","#6BBF45","#4E9A2E"][i]}" transform="rotate(${(i-2)*18} ${x} ${y})"/>`).join("")+`<rect x="54" y="132" width="12" height="16" fill="#7A9A4A"/>`;
    return SHADOW(40)+s;
  },
  sandwich(p){return SHADOW(48)+subSVG(SUB_DEFAULT,false);},
  icebag(p){
    const cubes=[[40,90],[62,84],[82,96],[46,114],[70,112],[54,132],[78,132],[36,134]].map(([x,y],i)=>`<rect x="${x-9}" y="${y-9}" width="18" height="18" rx="4" fill="#fff" opacity=".85" transform="rotate(${i*17} ${x} ${y})" stroke="#A9CFE6"/>`).join("");
    return SHADOW(40)+`<path d="M26 40 Q24 34 32 34 L88 34 Q96 34 94 40 L98 140 Q98 148 90 148 L30 148 Q22 148 22 140 Z" fill="#DCEFFA" opacity=".9" stroke="#9CC9E3" stroke-width="2"/>${cubes}`+
      `<path d="M50 34 q10 -16 20 0" fill="none" stroke="#1E5BC6" stroke-width="4"/>`+T("ICE",60,72,26,50,"#1E5BC6")+T(/\d+\s*lb/i.exec(p.name)?.[0]||"",60,84,8,40,"#1E5BC6","lt");
  },
  tin(p,L){
    const n=p.name.toLowerCase();
    if(/pringles/.test(n)) return SHADOW(22)+`<rect x="40" y="20" width="40" height="128" rx="3" fill="${p.body}"/><ellipse cx="60" cy="21" rx="20" ry="4" fill="url(#metal)"/>`+
      `<circle cx="60" cy="78" r="13" fill="#F5F0E4"/><path d="M52 76 q8 -8 16 0 M53 82 q7 5 14 0" stroke="#5A3420" stroke-width="2" fill="none"/>`+T(L.brand,60,108,9,36,p.ink)+T(L.sub,60,118,5.5,36,p.ink,"lt")+(p.flv?`<rect x="40" y="128" width="40" height="8" fill="${p.flv}"/>`:"")+`<rect x="40" y="20" width="40" height="128" rx="3" fill="url(#cyl)"/>`;
    const small=/fancy feast|cesar|friskies|3 oz|3\.5 oz/.test(n), top=small?112:74;
    return SHADOW(30)+`<rect x="32" y="${top}" width="56" height="${148-top}" rx="3" fill="${p.body}"/>`+(p.flv?`<rect x="32" y="${148-(148-top)*.3}" width="56" height="5" fill="${p.flv}"/>`:"")+
      T(L.brand,60,top+(148-top)*.48,small?10:13,50,p.ink)+T(L.sub,60,top+(148-top)*.68,small?5:6.5,50,p.ink,"lt")+
      `<rect x="32" y="${top}" width="56" height="${148-top}" rx="3" fill="url(#cyl)"/><ellipse cx="60" cy="${top}" rx="28" ry="4" fill="url(#metal)"/>`;
  },
  roll(p,L){
    return SHADOW(46)+[18,60].map(x=>`<rect x="${x}" y="40" width="42" height="108" rx="4" fill="#FBFBFA"/><rect x="${x}" y="40" width="42" height="108" rx="4" fill="url(#cyl)" opacity=".5"/><ellipse cx="${x+21}" cy="41" rx="20" ry="5" fill="#ECEDEF"/><ellipse cx="${x+21}" cy="41" rx="6" ry="2" fill="#C9B79A"/>`).join("")+
      `<rect x="18" y="74" width="84" height="44" fill="${p.body==="#F2F2F2"?p.ink:p.body}"/>`+T(L.brand,60,96,16,74,p.body==="#F2F2F2"?"#fff":p.ink)+T(L.sub,60,108,7,74,p.body==="#F2F2F2"?"#fff":p.ink,"lt");
  },
  boxwine(p,L){
    const side=shade(p.body,-.3);
    return SHADOW(40)+`<path d="M24 40 L36 32 L98 32 L86 40 Z" fill="${shade(p.body,.2)}"/><path d="M86 40 L98 32 L98 142 L86 148 Z" fill="${side}"/><rect x="24" y="40" width="62" height="108" fill="${p.body}"/>`+
      `<rect x="44" y="48" width="22" height="8" rx="4" fill="${shade(p.body,-.5)}"/><rect x="30" y="72" width="50" height="50" fill="#F5F0E4"/>`+
      T(L.brand,55,94,11,44,"#2A1A12")+T(L.sub,55,106,6,44,"#5A4636","lt")+T("3 L",55,116,5,30,"#7B1E3A","lt")+`<rect x="24" y="40" width="62" height="108" fill="url(#flat)"/>`;
  },
  pouch(p,L){
    const d="M32 34 L88 34 L92 140 Q60 152 28 140 Z";
    return SHADOW(32)+`<path d="${d}" fill="${p.body}"/><rect x="32" y="34" width="56" height="10" fill="${shade(p.body,-.2)}"/>`+
      T(L.brand,60,78,14,48,p.ink)+T(L.sub,60,91,7,48,p.ink,"lt")+`<ellipse cx="60" cy="116" rx="18" ry="12" fill="${p.flv||shade(p.body,.4)}"/><path d="${d}" fill="url(#cyl)" opacity=".6"/>`;
  },
  cup(p,L){
    const d="M34 58 L86 58 L80 146 Q80 148 76 148 L44 148 Q40 148 40 146 Z";
    return SHADOW(24)+`<path d="${d}" fill="${p.body}"/><ellipse cx="60" cy="56" rx="28" ry="7" fill="${p.flv||shade(p.body,.5)}"/><ellipse cx="60" cy="56" rx="28" ry="7" fill="none" stroke="${shade(p.body,-.2)}" stroke-width="3"/>`+
      T(L.brand,60,94,12,40,p.ink)+T(L.sub,60,106,6,40,p.ink,"lt")+`<path d="${d}" fill="url(#cyl)"/>`;
  },
};
/* ===== REALISTIC PACKAGING =====
   Beer, seltzers, soda, water, wine and spirits are drawn as the package they come in:
   a single can or bottle, a 4/6/8-pack in rings or a carrier, or a 12-36 pack box.
   "Nr", "Btl", "Bottles" and "Loose" mean glass bottles; 15 packs and up are cans;
   otherwise cans unless the brand is mostly sold in bottles. Brand colors and lettering
   come from BRAND_STYLES; anything else uses the catalog's brand colors. */
const BOTTLE_BRANDS = /corona(?! premier)|coronita|negra modelo|pacifico|stella|sam adams|samuel adams|blue moon|angry orchard|smirnoff ice|mike'?s|magners|peroni|dos equis|red stripe|guinness stout|amstel|beck'?s|becks|newcastle|harpoon i\.p\.a\. 6|shipyard pumpkin 6|kona big wave 6|yuengling lager 6|heineken 6 pk$|heineken single bottle|michelob ultra 6 pk$|seagram'?s/i;
function pack(p){
  const n=p.name.toLowerCase(), count=pk(p), oz=+((n.match(/(\d+(?:\.\d+)?)\s*oz/)||[])[1]||0);
  let mat;
  if(/\bcans?\b|alumin/.test(n)) mat="can";
  else if(/bottles?\b|\bnr\b|\bbtl\b|longneck|loose/.test(n)) mat="bottle";
  else if(count>=15) mat="can";
  else if(BOTTLE_BRANDS.test(n)) mat="bottle";
  else mat="can";
  return {count,mat,oz};
}
function rng(seed){let s=(seed*9301+49297)%233280;return ()=>((s=(s*9301+49297)%233280)/233280);}
function TX(txt,x,y,size,maxW,fill,cls="lb",o={}){
  if(!txt) return "";
  const up = cls==="lb"||cls==="lt";
  const s = esc(up?String(txt).toUpperCase():String(txt));
  const est = s.length*size*({lb:.58,lt:.52,ls:.56,lsr:.64}[cls]||.58);
  const fit = est>maxW?` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"`:"";
  const rot = o.rotate?` transform="rotate(${o.rotate} ${x} ${y})"`:"";
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${o.anchor||"middle"}" class="${cls}"${fit}${rot}${o.extra||""}>${s}</text>`;
}

/* --- small brand marks, drawn around (cx, cy) at size s --- */
const MARK = {
  mountains(cx,cy,s,c){const w=s*1.3,h=s*.55,x=cx-w/2,y=cy+h/2;
    return `<path d="M${x} ${y} L${x+w*.28} ${y-h*.85} L${x+w*.42} ${y-h*.45} L${x+w*.6} ${y-h} L${x+w} ${y} Z" fill="${c}"/><path d="M${x+w*.6} ${y-h} L${x+w*.52} ${y-h*.72} L${x+w*.58} ${y-h*.76} L${x+w*.64} ${y-h*.66} L${x+w*.7} ${y-h*.78} Z M${x+w*.28} ${y-h*.85} L${x+w*.22} ${y-h*.6} L${x+w*.3} ${y-h*.66} L${x+w*.35} ${y-h*.6} Z" fill="#fff"/>`;},
  crest(cx,cy,s,ring,fill){return `<circle cx="${cx}" cy="${cy}" r="${s*.34}" fill="${fill}" stroke="${ring}" stroke-width="${s*.07}"/><circle cx="${cx}" cy="${cy}" r="${s*.2}" fill="none" stroke="${ring}" stroke-width="${s*.03}"/>`;},
  star(cx,cy,s,c){const r=s*.32,pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;pts.push((cx+rr*Math.cos(a)).toFixed(1)+" "+(cy+rr*Math.sin(a)).toFixed(1));}return `<path d="M${pts.join(" L")} Z" fill="${c}"/>`;},
  crown(cx,cy,s,c){const w=s*.7,h=s*.38,x=cx-w/2,y=cy+h/2;return `<path d="M${x} ${y} L${x} ${y-h*.6} L${x+w*.25} ${y-h*.25} L${x+w*.5} ${y-h} L${x+w*.75} ${y-h*.25} L${x+w} ${y-h*.6} L${x+w} ${y} Z" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="${h*.22}" fill="${c}"/>`;},
  harp(cx,cy,s,c){const h=s*.6;return `<path d="M${cx-h*.28} ${cy+h*.5} L${cx-h*.28} ${cy-h*.3} Q${cx-h*.1} ${cy-h*.62} ${cx+h*.35} ${cy-h*.45} L${cx-h*.2} ${cy+h*.5} Z" fill="none" stroke="${c}" stroke-width="${s*.05}"/>`+[0,1,2,3].map(i=>`<line x1="${cx-h*.2+i*h*.1}" y1="${cy-h*.3+i*.04*h}" x2="${cx-h*.2+i*h*.1}" y2="${cy+h*.35-i*h*.12}" stroke="${c}" stroke-width="${s*.02}"/>`).join("");},
  wave(cx,cy,s,c){const r=s*.36;return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${s*.03}"/>`+[.85,.65,.45,.25].map((k,i)=>`<path d="M${cx-r*.9} ${cy+r*(.15+i*.12)} Q${cx-r*.2} ${cy-r*k} ${cx+r*.6} ${cy-r*(k-.3)} Q${cx+r*.2} ${cy-r*(k-.5)} ${cx+r*.1} ${cy+r*(.3+i*.1)}" fill="none" stroke="${c}" stroke-width="${s*.035}"/>`).join("");},
  ribbon(cx,cy,s,c){const w=s*1.6;return `<path d="M${cx-w/2} ${cy+s*.12} C${cx-w*.15} ${cy-s*.2} ${cx+w*.1} ${cy+s*.32} ${cx+w/2} ${cy-s*.05} L${cx+w/2} ${cy+s*.05} C${cx+w*.1} ${cy+s*.42} ${cx-w*.15} ${cy-s*.08} ${cx-w/2} ${cy+s*.24} Z" fill="${c}"/>`;},
  globe(cx,cy,s){const r=s*.34;return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><path d="M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy} Q${cx} ${cy-r*.35} ${cx-r} ${cy}Z" fill="#E4002B"/><path d="M${cx-r} ${cy+r*.1} Q${cx} ${cy+r*.55} ${cx+r} ${cy} A${r} ${r} 0 0 1 ${cx-r} ${cy+r*.1}Z" fill="#004B93"/>`;},
  sunbulls(cx,cy,s){const r=s*.3;return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F7C600"/><path d="M${cx-r*1.6} ${cy+r*.5} q${r*.5} ${-r*.9} ${r*1.4} ${-r*.2} l${-r*.2} ${r*.5}z" fill="#C8102E"/><path d="M${cx+r*1.6} ${cy+r*.5} q${-r*.5} ${-r*.9} ${-r*1.4} ${-r*.2} l${r*.2} ${r*.5}z" fill="#C8102E"/>`;},
  lemon(cx,cy,s,c="#F5D90A"){const r=s*.3;return `<path d="M${cx-r} ${cy} A${r} ${r} 0 0 0 ${cx+r} ${cy} Z" fill="${c}"/><path d="M${cx-r*.8} ${cy+r*.05} A${r*.8} ${r*.8} 0 0 0 ${cx+r*.8} ${cy+r*.05} Z" fill="#FFF6B0"/>`+[-.5,0,.5].map(k=>`<line x1="${cx}" y1="${cy+r*.05}" x2="${cx+r*.7*Math.sin(k)}" y2="${cy+r*.7*Math.cos(k)}" stroke="${c}" stroke-width="${s*.02}"/>`).join("");},
  moon(cx,cy,s,c){const r=s*.28;return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><circle cx="${cx-r*.3}" cy="${cy-r*.25}" r="${r*.18}" fill="#fff" opacity=".35"/>`;},
  bowtie(cx,cy,s,c){const w=s*.6,h=s*.3;return `<path d="M${cx-w/2} ${cy-h/2} L${cx-w*.08} ${cy-h*.18} L${cx+w*.08} ${cy-h*.18} L${cx+w/2} ${cy-h/2} L${cx+w/2} ${cy+h/2} L${cx+w*.08} ${cy+h*.18} L${cx-w*.08} ${cy+h*.18} L${cx-w/2} ${cy+h/2} Z" fill="${c}" stroke="#fff" stroke-width="${s*.03}"/>`;},
  claw(cx,cy,s,c){return [-1,0,1].map(i=>`<path d="M${cx+i*s*.16-s*.04} ${cy-s*.38} l${s*.05} ${s*.2} l${-s*.04} ${s*.08} l${s*.06} ${s*.22} l${-s*.03} ${s*.26}" fill="none" stroke="${c}" stroke-width="${s*.06}" stroke-linecap="round"/>`).join("");},
  swirl(cx,cy,s,c){return `<path d="M${cx-s*.4} ${cy+s*.2} C${cx-s*.1} ${cy-s*.4} ${cx+s*.3} ${cy+s*.3} ${cx+s*.45} ${cy-s*.25}" fill="none" stroke="${c}" stroke-width="${s*.08}" stroke-linecap="round"/>`;},
  slash(cx,cy,s,c){return `<path d="M${cx-s*.4} ${cy+s*.15} L${cx+s*.4} ${cy-s*.15}" stroke="${c}" stroke-width="${s*.1}" stroke-linecap="round"/>`;},
  fruit(cx,cy,s,c){const r=s*.28;return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><ellipse cx="${cx-r*.35}" cy="${cy-r*.35}" rx="${r*.3}" ry="${r*.18}" fill="#fff" opacity=".45"/><path d="M${cx} ${cy-r} q${r*.5} ${-r*.6} ${r} ${-r*.2} q${-r*.5} ${r*.4} ${-r} ${r*.2}z" fill="#3F8F2E"/>`;},
  checks(x,y,w,h,c){let o="";const q=w/8;for(let i=0;i<8;i++)for(let j=0;j<Math.ceil(h/q);j++)if((i+j)%2)o+=`<rect x="${x+i*q}" y="${y+j*q}" width="${q}" height="${q}" fill="${c}"/>`;return o;},
};

/* --- brand styles: body color, lettering, mark --- */
const BRAND_STYLES = [
  [/bud light/i, {body:"#1E5BC6",ink:"#FFFFFF",font:"lb",w1:"BUD",w2:"LIGHT",mark:(c,y,s)=>MARK.crest(c,y,s,"#FFFFFF","#C8102E"),lime:/lime/i}],
  [/budweiser|^bud (?!light)|^bud \d|bud zero/i, {body:"#C8102E",ink:"#FFFFFF",font:"lsr",w1:"Budweiser",small:"KING OF BEERS",mark:(c,y,s)=>MARK.bowtie(c,y,s,"#C8102E")}],
  [/coors light/i, {body:"#C5CED8",ink:"#0F3F84",font:"ls",w1:"Coors",w2:"LIGHT",w2font:"lt",mark:(c,y,s)=>MARK.mountains(c,y,s,"#2E5FA8")}],
  [/coors/i, {body:"#E7C46B",ink:"#7A2E1B",font:"ls",w1:"Coors",w2:"BANQUET",w2font:"lt",mark:(c,y,s)=>MARK.crest(c,y,s,"#7A2E1B","#F4E2B0")}],
  [/miller lite/i, {body:"#F7F5F0",ink:"#0A3C7D",font:"ls",w1:"Miller",w2:"LITE",w2font:"lb",w2scale:1.25,mark:(c,y,s)=>MARK.crest(c,y,s,"#C9A14A","#C8102E")}],
  [/miller high life|high life/i, {body:"#F4E7C5",ink:"#C8102E",font:"ls",w1:"Miller",w2:"HIGH LIFE",w2font:"lt",mark:(c,y,s)=>MARK.crest(c,y,s,"#C8102E","#F4E7C5")}],
  [/michelob ultra/i, {body:"#EEF2F6",ink:"#1B2E59",font:"lb",w1:"ULTRA",vertical:true,small:"Michelob",smallFont:"ls"}],
  [/michelob/i, {body:"#1B2E59",ink:"#D4AF37",font:"ls",w1:"Michelob"}],
  [/white claw/i, {body:"#F7F7F5",ink:"#111111",font:"lt",w1:"WHITE CLAW",small:"HARD SELTZER",mark:(c,y,s)=>MARK.wave(c,y,s,"#111111"),flavorBand:true}],
  [/truly/i, {body:"#F1EEE8",ink:"#1F1F1F",font:"lb",w1:"TRULY",small:"HARD SELTZER",flavorBand:true}],
  [/high noon/i, {body:"#F3E7D3",ink:"#1B4D3E",font:"lsr",w1:"High Noon",small:"VODKA & SODA",flavorBand:true}],
  [/twisted tea/i, {body:"#151A3A",ink:"#E8B84A",font:"lb",w1:"TWISTED",w2:"TEA",mark:(c,y,s)=>MARK.lemon(c,y,s)}],
  [/heineken/i, {body:"#0B6A36",ink:"#FFFFFF",font:"lsr",w1:"Heineken",small:"LAGER BEER",mark:(c,y,s)=>MARK.star(c,y,s,"#E4002B"),glass:"#1F5E2C"}],
  [/modelo/i, {body:"#D9B35C",split:"#151515",ink:"#0C2340",font:"ls",w1:"Modelo",w2:"ESPECIAL",w2font:"lt",mark:(c,y,s)=>MARK.crest(c,y,s,"#0C2340","#E9CF8C")}],
  [/corona premier/i, {body:"#E9EAEC",ink:"#1A1A1A",font:"lsr",w1:"Corona",w2:"PREMIER",w2font:"lt",mark:(c,y,s)=>MARK.crown(c,y,s,"#C9A14A")}],
  [/corona light/i, {body:"#F6F2E4",ink:"#2F6DB5",font:"lsr",w1:"Corona",w2:"LIGHT",w2font:"lt",mark:(c,y,s)=>MARK.crown(c,y,s,"#C9A14A"),glass:"#EDE6C4",painted:true}],
  [/corona|coronita/i, {body:"#F6F2E4",ink:"#0E3B7D",font:"lsr",w1:"Corona",w2:"EXTRA",w2font:"lt",mark:(c,y,s)=>MARK.crown(c,y,s,"#C9A14A"),glass:"#EDE6C4",painted:true}],
  [/guinness/i, {body:"#121212",ink:"#D8B46A",font:"lsr",w1:"GUINNESS",small:"DRAUGHT",mark:(c,y,s)=>MARK.harp(c,y,s,"#D8B46A")}],
  [/pacifico/i, {body:"#F2E14C",ink:"#C8102E",font:"lsr",w1:"Pacifico",small:"CLARA",mark:(c,y,s)=>MARK.crest(c,y,s,"#C8102E","#F2E14C"),glass:"#EDE6C4"}],
  [/stella/i, {body:"#F2EDE1",ink:"#B01E23",font:"lsr",w1:"Stella",w2:"ARTOIS",w2font:"lt",mark:(c,y,s)=>MARK.crest(c,y,s,"#C9A14A","#B01E23"),glass:"#1F5E2C"}],
  [/narragansett/i, {body:"#F4F1E8",ink:"#C8102E",font:"ls",w1:"Narragansett",w2:"LAGER",w2font:"lt"}],
  [/pabst|pbr/i, {body:"#F5F5F5",ink:"#1D3F87",font:"lsr",w1:"Pabst",w2:"BLUE RIBBON",w2font:"lt",band:"#C8102E"}],
  [/yuengling/i, {body:"#F2EAD8",ink:"#7B1E1E",font:"lsr",w1:"Yuengling",w2:"LAGER",w2font:"lt"}],
  [/natural (?:ice|light)|natty/i, {body:"#2E6DB4",ink:"#FFFFFF",font:"lb",w1:"NATURAL",w2:n=>/ice/i.test(n)?"ICE":"LIGHT"}],
  [/busch/i, {body:"#2B5DA8",ink:"#FFFFFF",font:"lb",w1:"BUSCH",mark:(c,y,s)=>MARK.mountains(c,y,s,"#FFFFFF")}],
  [/sam adams|samuel adams/i, {body:"#0C2E55",ink:"#E1B12C",font:"lsr",w1:"Samuel",w2:"Adams",w2font:"lsr"}],
  [/blue moon/i, {body:"#0F2F5F",ink:"#F2EDE1",font:"lsr",w1:"Blue Moon",mark:(c,y,s)=>MARK.moon(c,y,s,"#F28C28")}],
  [/angry orchard/i, {body:"#E8DCC0",ink:"#8C1D18",font:"lsr",w1:"Angry",w2:"Orchard",w2font:"lsr",mark:(c,y,s)=>MARK.fruit(c,y,s,"#C8102E")}],
  [/smirnoff/i, {body:"#E4002B",ink:"#FFFFFF",font:"lsr",w1:"Smirnoff",w2:"ICE",w2font:"lb",glass:"#E6EEF2"}],
  [/diet coke/i, {body:"#D5D9DE",ink:"#E4002B",font:"lsr",w1:"Diet Coke",mark:(c,y,s)=>MARK.ribbon(c,y,s,"#E4002B")}],
  [/coke zero|coca-cola zero|zero sugar/i, {body:"#151515",ink:"#E4002B",font:"ls",w1:"Coca-Cola",small:"ZERO SUGAR",mark:(c,y,s)=>MARK.ribbon(c,y,s,"#E4002B")}],
  [/coca-cola|^coke|mexican coke/i, {body:"#E4002B",ink:"#FFFFFF",font:"ls",w1:"Coca-Cola",mark:(c,y,s)=>MARK.ribbon(c,y,s,"#FFFFFF")}],
  [/diet pepsi/i, {body:"#C9D3DC",ink:"#004B93",font:"lb",w1:"pepsi",small:"DIET",mark:(c,y,s)=>MARK.globe(c,y,s)}],
  [/pepsi/i, {body:"#004B93",ink:"#FFFFFF",font:"lb",w1:"pepsi",mark:(c,y,s)=>MARK.globe(c,y,s)}],
  [/red bull/i, {body:"#D3D9E0",split:"#1E3A8A",splitAt:.6,checks:"#1E3A8A",checksAt:.2,ink:"#C8102E",font:"lb",w1:"Red Bull",mark:(c,y,s)=>MARK.sunbulls(c,y,s)}],
  [/mtn dew|mountain dew/i, {body:"#1E7A2E",ink:"#FFFFFF",font:"lb",w1:"MTN",w2:"DEW",mark:(c,y,s)=>MARK.slash(c,y,s,"#E4002B")}],
  [/sprite/i, {body:"#00A04A",ink:"#FFFFFF",font:"lsr",w1:"Sprite",mark:(c,y,s)=>MARK.swirl(c,y,s,"#FFF200")}],
  [/canada dry/i, {body:"#0B6A3A",ink:"#F2E3A6",font:"ls",w1:"Canada Dry",small:"GINGER ALE",mark:(c,y,s)=>MARK.crown(c,y,s,"#E6C05C")}],
  [/monster/i, {body:"#141414",ink:"#7AC943",font:"lb",w1:"MONSTER",small:"ENERGY",mark:(c,y,s)=>MARK.claw(c,y,s,"#7AC943")}],
  [/dr pepper/i, {body:"#701B2E",ink:"#FFFFFF",font:"lsr",w1:"Dr Pepper"}],
  [/fanta/i, {body:"#FF8200",ink:"#FFFFFF",font:"lb",w1:"FANTA",mark:(c,y,s)=>MARK.fruit(c,y,s,"#FFB000")}],
  [/poland spring/i, {body:"#E8F4EC",ink:"#00704A",font:"lsr",w1:"Poland",w2:"Spring",w2font:"lsr",mark:(c,y,s)=>MARK.mountains(c,y,s,"#00704A")}],
];
function brandStyle(p,L){
  for(const [re,st] of BRAND_STYLES) if(re.test(p.name)){
    const s={...st}; if(typeof s.w2==="function") s.w2=s.w2(p.name);
    if(s.lime&&s.lime.test(p.name)) s.band="#7BC043";
    if(!s.small&&!s.w2) s.small=L.sub;
    else if(!s.small) s.small=L.sub&&!new RegExp(s.w2,"i").test(L.sub)?L.sub:"";
    return s;
  }
  const words=L.brand.split(" ");
  return {body:p.body,ink:p.ink,font:"lb",w1:words.length>1&&L.brand.length>9?words[0]:L.brand,w2:words.length>1&&L.brand.length>9?words.slice(1).join(" "):"",
    small:L.sub,mark:p.flv?(c,y,s)=>MARK.fruit(c,y,s,p.flv):null,flavorBand:!!p.flv};
}

/* --- label art inside a rectangle (x, y, w, h) --- */
function labelArt(p,st,x,y,w,h){
  const cx=x+w/2; let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.body}"/>`;
  if(st.split){const at=y+h*(st.splitAt||.62);o+=`<rect x="${x}" y="${at}" width="${w}" height="${y+h-at}" fill="${st.split}"/>`;}
  if(st.checks) o+=`<g opacity=".5">${MARK.checks(x,y,w,h*(st.checksAt||st.splitAt||.55),st.checks)}</g>`;
  if(st.band) o+=`<rect x="${x}" y="${y+h*.8}" width="${w}" height="${h*.07}" fill="${st.band}"/>`;
  if(st.flavorBand&&p.flv) o+=`<rect x="${x}" y="${y+h*.78}" width="${w}" height="${h*.1}" fill="${p.flv}"/>`;
  if(st.vertical){
    o+=TX(st.w1,cx+w*.08,y+h*.5,w*.42,h*.78,st.ink,st.font,{rotate:-90,extra:` dominant-baseline="middle"`});
    if(st.small) o+=TX(st.small,cx-w*.24,y+h*.5,w*.16,h*.5,st.ink,st.smallFont||"lt",{rotate:-90});
    return o;
  }
  if(st.mark) o+=st.mark(cx,y+h*.2,w*.62);
  const f1=st.font==="ls"?w*.36:st.font==="lsr"?w*.26:w*.36;
  o+=TX(st.w1,cx,y+h*.5,f1,w*.88,st.ink,st.font);
  if(st.w2){const f=st.w2font||st.font, sz=(f==="lt"?w*.15:f==="lsr"?w*.24:w*.27)*(st.w2scale||1);o+=TX(st.w2,cx,y+h*.5+sz*1.15,sz,w*.86,st.ink,f);}
  if(st.small) o+=TX(st.small,cx,y+h*.74,w*.11,w*.82,st.split&&!st.splitAt?"#F2EDE1":st.ink,st.smallFont||"lt");
  return o;
}

/* --- condensation, bubbles, light sweep --- */
function drops(seed,x,y,w,h,n=12){
  const r=rng(seed);let o="";
  for(let i=0;i<n;i++){const dx=x+w*(.08+r()*.84),dy=y+h*(.05+r()*.9),s=.7+r()*1.3;
    o+=`<ellipse cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" rx="${(s*.75).toFixed(2)}" ry="${s.toFixed(2)}" fill="url(#drop)"/>`;}
  for(let i=0;i<2;i++){const dx=x+w*(.2+r()*.6),dy=y+h*(.1+r()*.3);
    o+=`<ellipse class="drip" style="animation-delay:${(r()*3).toFixed(1)}s" cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" rx="1" ry="1.6" fill="url(#drop)"/>`;}
  return o;
}
function bubbles(seed,x,y,w,h,n=7){
  const r=rng(seed+7);let o="";
  for(let i=0;i<n;i++) o+=`<circle class="bub" style="animation-delay:${(r()*2.5).toFixed(2)}s" cx="${(x+w*(.2+r()*.6)).toFixed(1)}" cy="${(y+h*(.6+r()*.38)).toFixed(1)}" r="${(.5+r()*.7).toFixed(2)}" fill="#FFF8E0" opacity=".7"/>`;
  return o;
}
const sweep=(x,y,w,h)=>`<g class="sweep"><rect x="${x-w*.6}" y="${y-10}" width="${w*.35}" height="${h+20}" fill="url(#sweepG)" transform="skewX(-14)"/></g>`;

/* --- containers --- */
let CLIP=0;
function canPath(x,t,w,h){
  return `M${x+w*.11} ${t} C${x+w*.11} ${t+h*.035} ${x} ${t+h*.05} ${x} ${t+h*.1} L${x} ${t+h*.93} C${x} ${t+h*.975} ${x+w*.07} ${t+h} ${x+w*.15} ${t+h} L${x+w*.85} ${t+h} C${x+w*.93} ${t+h} ${x+w} ${t+h*.975} ${x+w} ${t+h*.93} L${x+w} ${t+h*.1} C${x+w} ${t+h*.05} ${x+w*.89} ${t+h*.035} ${x+w*.89} ${t} Z`;
}
function canSVG(p,st,x,t,w,h,fx=true,dim=0){
  const id="cl"+(++CLIP), d=canPath(x,t,w,h), cx=x+w/2, by=t+h*.1, bh=h*.82;
  return `<g><clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="url(#alu)"/>
    <g clip-path="url(#${id})">${labelArt(p,st,x,by,w,bh)}<rect x="${x}" y="${t}" width="${w}" height="${h}" fill="url(#wrap)"/>
    <rect x="${x}" y="${by-.6}" width="${w}" height="1.2" fill="#fff" opacity=".35"/>
    <rect x="${x+w*.25}" y="${t}" width="${w*.05}" height="${h}" fill="#fff" opacity=".38"/><rect x="${x+w*.33}" y="${t}" width="${w*.015}" height="${h}" fill="#fff" opacity=".3"/>
    ${fx?drops(p.id*7+Math.round(x),x,by,w,bh,Math.round(w/3))+sweep(x,t,w,h):""}${dim?`<rect x="${x}" y="${t}" width="${w}" height="${h}" fill="#0D1C40" opacity="${dim}"/>`:""}</g>
    <ellipse cx="${cx}" cy="${t+.5}" rx="${w*.39}" ry="${w*.075}" fill="url(#alu)" stroke="#8E98A4" stroke-width=".5"/>
    <ellipse cx="${cx}" cy="${t+.8}" rx="${w*.3}" ry="${w*.05}" fill="#C3CAD2"/>
    <rect x="${cx-w*.08}" y="${t-w*.02}" width="${w*.16}" height="${w*.06}" rx="${w*.03}" fill="#A9B2BC"/></g>`;
}
function bottlePath(){return "M10 0 h8 v3 c0 1.5 .8 2.5 .8 4 v20 c0 9 9.2 15 9.2 27 v76 c0 2.5 -1.5 4 -4 4 h-20 c-2.5 0 -4 -1.5 -4 -4 v-76 c0 -12 9.2 -18 9.2 -27 v-20 c0 -1.5 .8 -2.5 .8 -4 z";}
function bottleSVG(p,st,x,t,scale,fx=true){
  const id="cl"+(++CLIP), g=st.glass||glass(p), clear=lum(g)>.7, d=bottlePath();
  const cap=st.ink==="#FFFFFF"?shade(st.body,-.2):st.ink;
  const lab = st.painted
    ? TX(st.w1,14,88,9,24,st.ink,st.font)+TX(st.w2||"",14,96,4,22,st.ink,"lt")+(st.mark?st.mark(14,78,12):"")
    : `<rect x="0" y="74" width="28" height="34" fill="${st.body}"/>${st.mark?st.mark(14,81,13):""}${TX(st.w1,14,93,st.font==="ls"?9:7,24,st.ink,st.font)}${st.w2?TX(st.w2,14,100,4.6,22,st.ink,st.w2font||st.font):""}`;
  return `<g transform="translate(${x} ${t}) scale(${scale})"><clipPath id="${id}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="${g}" opacity="${clear?.75:.96}"/>
    <g clip-path="url(#${id})">${clear?`<rect x="0" y="34" width="28" height="100" fill="#E9A83A" opacity=".85"/>${fx?bubbles(p.id,0,34,28,100):""}`:""}
      <rect x="0" y="14" width="28" height="16" fill="${st.body}"/>${lab}
      <rect x="3.5" y="30" width="2.6" height="100" fill="#fff" opacity=".35"/><rect x="21" y="40" width="1.4" height="88" fill="#fff" opacity=".15"/>
      <rect x="0" y="0" width="28" height="134" fill="url(#wrap)" opacity=".7"/>${fx?sweep(0,0,28,134):""}</g>
    <path d="M9 -1 h10 l.8 4 h-11.6 z" fill="${cap}"/><path d="M8.4 3 h11.2" stroke="${shade(cap,-.3)}" stroke-width="1" stroke-dasharray="1 .8"/></g>`;
}
function petSVG(p,st,x,t,w,h,liq){
  const id="cl"+(++CLIP), cx=x+w/2;
  const d=`M${cx-w*.17} ${t} h${w*.34} v${h*.05} c0 ${h*.06} ${w*.33} ${h*.09} ${w*.33} ${h*.2} v${h*.66} c0 ${h*.05} -${w*.06} ${h*.08} -${w*.14} ${h*.08} c-${w*.06} 0 -${w*.08} -${h*.02} -${w*.18} -${h*.02} c-${w*.1} 0 -${w*.12} ${h*.02} -${w*.18} ${h*.02} c-${w*.08} 0 -${w*.14} -${h*.03} -${w*.14} -${h*.08} v-${h*.66} c0 -${h*.11} ${w*.33} -${h*.14} ${w*.33} -${h*.2} z`;
  return `<g><clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${liq}" opacity=".88"/>
    <g clip-path="url(#${id})"><rect x="${x}" y="${t+h*.06}" width="${w}" height="${h*.08}" fill="#fff" opacity=".25"/>
      ${labelArt(p,st,x,t+h*.4,w,h*.3)}
      ${[.76,.81,.86].map(k=>`<rect x="${x}" y="${t+h*k}" width="${w}" height="1" fill="#fff" opacity=".3"/>`).join("")}
      <rect x="${x}" y="${t}" width="${w}" height="${h}" fill="url(#wrap)" opacity=".65"/><rect x="${cx-w*.32}" y="${t+h*.25}" width="${w*.07}" height="${h*.62}" fill="#fff" opacity=".35"/>
      ${drops(p.id*3,x,t+h*.2,w,h*.7,8)}${sweep(x,t,w,h)}</g>
    <rect x="${cx-w*.19}" y="${t-h*.045}" width="${w*.38}" height="${h*.05}" rx="1.5" fill="${st.split||(lum(st.body)>.85?st.ink:st.body)}"/>
    <rect x="${cx-w*.22}" y="${t+h*.005}" width="${w*.44}" height="${h*.012}" fill="${shade(st.body,-.2)}"/></g>`;
}
const SHADOW_AT=(cx,cy,rx)=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3,rx*.12)}" fill="#0D1C40" opacity=".18"/>`;

/* --- pack renderers (return [viewBox, svg]) --- */
function singleCan(p,st,oz){
  if(oz&&oz<=8.5) return ["0 0 120 160",SHADOW_AT(60,150,18)+canSVG(p,st,46,48,28,100)];
  if(oz>=22) return ["0 0 120 160",SHADOW_AT(60,150,24)+canSVG(p,st,38,10,44,138)];
  if(oz>=15) return ["0 0 120 160",SHADOW_AT(60,150,23)+canSVG(p,st,39,22,42,126)];
  return ["0 0 120 160",SHADOW_AT(60,150,24)+canSVG(p,st,38,40,44,108)];
}
function singleBottle(p,st,oz){
  const s=oz>=20?1.1:oz&&oz<=8?.82:1.02;
  return ["0 0 120 160",SHADOW_AT(60,150,16*s)+bottleSVG(p,st,60-14*s,148-134*s,s)];
}
function canPack(p,st,count,oz){
  const tall=oz>=15, n=count<=4?2:count<=6?3:4, w=n===2?40:n===3?34:28, h=tall?(n===2?112:100):(n===2?96:86);
  const gap=w+2, x0=80-(n*gap)/2, back=[],front=[];
  for(let i=0;i<n;i++){back.push(canSVG(p,st,x0+i*gap+gap*.45,148-h-22,w*.94,h*.94,false,.22));front.push(canSVG(p,st,x0+i*gap,148-h,w,h,true));}
  const ringY=148-h+3, rings=`<rect x="${x0-2}" y="${ringY-3}" width="${n*gap+2}" height="7" rx="3.5" fill="#fff" opacity=".28" stroke="#fff" stroke-opacity=".6"/>`+
    Array.from({length:n},(_,i)=>`<ellipse cx="${x0+i*gap+w/2}" cy="${ringY}" rx="${w*.42}" ry="2.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>`).join("");
  return ["0 0 160 160",SHADOW_AT(80,150,n*gap*.55)+back.join("")+front.join("")+rings];
}
function bottleCarrier(p,st,count){
  const n=count<=4?2:3, s=.95, gap=n===2?34:30, x0=80-(n*gap)/2+2;
  const backB=Array.from({length:n},(_,i)=>bottleSVG(p,st,x0+i*gap+12,8,s,false)).join("");
  const frontB=Array.from({length:n},(_,i)=>bottleSVG(p,st,x0+i*gap,20,s,false)).join("");
  const cw=n*gap+16, cx0=80-cw/2, top=96;
  const carrier=`<path d="M${cx0} ${top} L${cx0+cw} ${top} L${cx0+cw} 148 L${cx0} 148 Z" fill="${st.split||st.body}"/>
    <path d="M${cx0+cw} ${top} l10 -6 v52 l-10 6 z" fill="${shade(st.split||st.body,-.3)}"/>
    <path d="M${cx0+cw*.36} ${top} L${cx0+cw*.4} 52 L${cx0+cw*.6} 52 L${cx0+cw*.64} ${top}" fill="${shade(st.split||st.body,-.15)}"/>
    <rect x="${cx0+cw*.44}" y="57" width="${cw*.12}" height="7" rx="3.5" fill="#0D1C40" opacity=".5"/>
    <g>${st.mark?st.mark(cx0+cw/2,top+12,22):""}${TX(st.w1,cx0+cw/2,top+32,st.font==="ls"?18:14,cw*.84,st.ink,st.font)}${st.w2?TX(st.w2,cx0+cw/2,top+42,8,cw*.7,st.ink,st.w2font||st.font):""}${TX((count||6)+" BOTTLES",cx0+cw/2,146,5,cw*.5,st.ink,"lt")}</g>
    <rect x="${cx0}" y="${top}" width="${cw}" height="${148-top}" fill="url(#card)"/>`;
  return ["0 0 160 160",SHADOW_AT(80,150,cw*.6)+backB+frontB.replace(/<g transform/g,'<g transform')+carrier];
}
function caseBox(p,st,count,mat){
  const dims={12:[112,52,30],15:[116,54,34],18:[118,58,36],20:[118,58,36],24:[120,64,42],30:[122,70,46],36:[124,76,48]};
  const k=Object.keys(dims).map(Number).reduce((a,b)=>Math.abs(b-count)<Math.abs(a-count)?b:a,12);
  const [fw,fh,d]=dims[k], x0=8, yb=150, yt=yb-fh, dx=d*.62, dy=d*.42, body=st.body, side=shade(body,-.28), top=shade(body,.14);
  const id="cl"+(++CLIP);
  const mini = mat==="bottle" ? bottleSVG(p,st,x0+fw-27,yb-92,.66,false) : canSVG(p,st,x0+fw-30,yb-66,27,68,false);
  const art=`<clipPath id="${id}"><rect x="${x0}" y="${yt}" width="${fw}" height="${fh}"/></clipPath><g clip-path="url(#${id})">
      ${labelArtBox(p,st,x0,yt,fw,fh)}<rect x="${x0}" y="${yt}" width="${fw}" height="${fh}" fill="url(#card)"/>${sweep(x0,yt,fw,fh)}</g>`;
  const badge=`<g transform="translate(${x0+5} ${yt+5})"><rect width="30" height="15" rx="2.5" fill="${st.ink}"/>${TX(count+"",9,12,12,14,body,"lb")}${TX(mat==="bottle"?"BTL":"PK",23,10,5.5,10,body,"lt")}</g>`;
  return ["0 0 160 160",SHADOW_AT(x0+fw/2+dx/2,yb,fw*.62)+
    `<path d="M${x0} ${yt} L${x0+fw} ${yt} L${x0+fw+dx} ${yt-dy} L${x0+dx} ${yt-dy} Z" fill="${top}"/>
     <rect x="${x0+fw*.42}" y="${yt-dy*.62}" width="${fw*.18}" height="${Math.max(3,dy*.28)}" rx="2" fill="#0D1C40" opacity=".45" transform="skewX(-34)" style="transform-box:fill-box"/>
     <path d="M${x0+fw} ${yt} L${x0+fw+dx} ${yt-dy} L${x0+fw+dx} ${yb-dy} L${x0+fw} ${yb} Z" fill="${side}"/>
     ${mat==="can"?Array.from({length:Math.min(4,Math.round(fh/16))},(_,i)=>`<ellipse cx="${x0+fw+dx*.5}" cy="${yt+8+i*14-dy*.5}" rx="${dx*.32}" ry="5" fill="none" stroke="#fff" stroke-opacity=".25"/>`).join(""):""}
     ${TX(st.w1,x0+fw+dx*.5,yt+fh*.55-dy*.5,9,fh*.7,st.ink,st.font,{rotate:-90})}
     ${art}${badge}`+mini];
}
function labelArtBox(p,st,x,y,w,h){
  let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${st.body}"/>`;
  if(st.split) o+=`<rect x="${x}" y="${y+h*.68}" width="${w}" height="${h*.32}" fill="${st.split}"/>`;
  if(st.checks) o+=`<g opacity=".5">${MARK.checks(x,y,w*.6,h*.55,st.checks)}</g>`;
  if(st.band) o+=`<rect x="${x}" y="${y+h*.78}" width="${w}" height="${h*.08}" fill="${st.band}"/>`;
  if(st.flavorBand&&p.flv) o+=`<rect x="${x}" y="${y+h*.74}" width="${w}" height="${h*.12}" fill="${p.flv}"/>`;
  const lx=x+w*.38;
  if(st.mark) o+=st.mark(lx+w*.2,y+h*.26,h*.42);
  const f1=st.font==="lb"?h*.3:st.font==="ls"?h*.38:h*.27;
  o+=TX(st.w1,lx,y+h*.56,f1,w*.6,st.ink,st.font);
  if(st.w2){const f=st.w2font||st.font, sz=f==="lt"?h*.13:h*.2;o+=TX(st.w2,lx,y+h*.56+sz*1.25,sz,w*.5,st.ink,f);}
  else if(st.small) o+=TX(st.small,lx,y+h*.8,h*.1,w*.5,st.ink,"lt");
  return o;
}
function shrinkPack(p,st,count){
  const cols=count>=24?6:count>=12?4:3, rows=3, bw=17, gap=19, x0=80-(cols*gap)/2;
  let o="";
  for(let r=rows-1;r>=0;r--) for(let c=0;c<cols;c++){
    const x=x0+c*gap+r*6, t=64-r*14;
    o+= r===0 ? petSVG(p,st,x,t+10,bw,76,"#D9EEF8") : `<rect x="${x+bw*.3}" y="${t+4}" width="${bw*.4}" height="5" rx="1.5" fill="${st.split||(lum(st.body)>.85?st.ink:st.body)}"/><path d="M${x} ${t+30} q${bw/2} -22 ${bw} 0 v40 h-${bw}z" fill="#D9EEF8" opacity=".8"/>`;
  }
  const fw=cols*gap+12, fx=x0-6;
  o+=`<rect x="${fx}" y="40" width="${fw+18}" height="112" rx="10" fill="#fff" opacity=".18" stroke="#fff" stroke-opacity=".5"/>
     <rect x="${fx}" y="104" width="${fw}" height="24" fill="${lum(st.body)>.85?st.ink:st.body}" opacity=".92"/>
     ${TX(st.w1+(st.w2?" "+st.w2:""),fx+fw/2,121,13,fw*.8,lum(st.body)>.85?"#fff":st.ink,st.font==="lsr"?"lsr":"lb")}
     ${TX(count+" PK",fx+fw-12,113,5,18,lum(st.body)>.85?"#fff":st.ink,"lt")}${sweep(fx,40,fw,112)}`;
  return ["0 0 160 160",SHADOW_AT(80,152,fw*.62)+o];
}
function singlePet(p,st){
  const n=p.name.toLowerCase(), big=/2 ?l\b|3 ?l\b|1\.5 ?l|liter|1 ?l\b|33\.8|gal/.test(n);
  const liq=liquid(p);
  return big?["0 0 120 160",SHADOW_AT(60,152,26)+petSVG(p,st,34,14,52,138,liq)]:["0 0 120 160",SHADOW_AT(60,152,19)+petSVG(p,st,42,30,36,122,liq)];
}

/* --- wine and spirits --- */
function wineReal(p,L){
  const sp=p.aisle==="Sparkling", g=wineGlass(p), id="cl"+(++CLIP);
  const d=sp?"M54 10 L66 10 L66 50 Q66 66 79 80 L79 146 Q79 151 74 151 L46 151 Q41 151 41 146 L41 80 Q54 66 54 50 Z":"M54 8 L66 8 L66 52 Q66 63 77 71 L77 146 Q77 151 72 151 L48 151 Q43 151 43 146 L43 71 Q54 63 54 52 Z";
  const foil=lum(p.body)>.82?(sp?"#C9A14A":"#7B1E3A"):p.body, wineC={"Red":"#5A0F1E","White":"#E8D9A0","Rosé":"#F4A3B5","Sangria":"#7A1830","Dessert and port":"#4A1A0A"}[p.aisle]||"#5A0F1E";
  const vint=2016+((p.id*7)%8);
  return ["0 0 120 160",SHADOW_AT(60,151,20)+`<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${g}"/>
   <g clip-path="url(#${id})"><rect x="40" y="${sp?72:68}" width="40" height="84" fill="${wineC}" opacity="${lum(g)>.6?.8:.35}"/>${sp?bubbles(p.id,42,78,36,70,9):""}
    <path d="${sp?"M52 6 h16 v44 q0 12 8 22 h-32 q8 -10 8 -22z":"M53 6 h14 v34 h-14z"}" fill="${foil}"/><rect x="40" y="${sp?36:36}" width="40" height="2" fill="#fff" opacity=".3"/>
    <rect x="44" y="92" width="32" height="44" fill="#F7F2E6"/><rect x="44" y="92" width="32" height="44" fill="url(#paper)"/>
    <rect x="46" y="94" width="28" height="40" fill="none" stroke="${foil}" stroke-width=".6"/>
    ${TX(L.brand,60,108,L.brand.length>10?6.5:8,26,"#2A1A12","lsr")}${TX(L.sub||p.aisle,60,117,4.4,25,"#5A4636","lt")}${TX(String(vint),60,127,4.2,16,foil,"lt")}
    <rect x="46.5" y="74" width="3" height="70" fill="#fff" opacity=".28"/><rect x="72" y="80" width="1.4" height="60" fill="#fff" opacity=".12"/>
    <rect x="40" y="0" width="40" height="160" fill="url(#wrap)" opacity=".75"/>${sweep(40,0,40,152)}</g>`];
}
function spiritReal(p,L){
  const n=p.name.toLowerCase(), liq=spiritLiquid(p), clear=lum(liq)>.85, id="cl"+(++CLIP);
  const ml=+((n.match(/(\d+(?:\.\d+)?)\s*ml/)||[])[1]||0), big=/1\.75|1,75|handle/.test(n), nip=ml&&ml<=100, small=ml>100&&ml<=375;
  const square=/Whiskey|Gin/.test(p.aisle), lab=lum(p.body)>.85?p.ink:p.body, labInk=lum(p.body)>.85?"#F5F0E4":p.ink;
  let d;
  if(big) d="M50 10 h12 v18 q0 6 10 10 q14 6 14 18 v88 q0 7 -7 7 h-38 q-7 0 -7 -7 v-88 q0 -12 14 -18 q2 -1 2 -10z";
  else if(square) d="M53 12 h14 v26 q0 6 12 10 q4 1 4 6 v90 q0 7 -6 7 h-34 q-6 0 -6 -7 v-90 q0 -5 4 -6 q12 -4 12 -10z";
  else d="M54 10 h12 v30 q0 8 9 14 q6 4 6 12 v80 q0 6 -6 6 h-30 q-6 0 -6 -6 v-80 q0 -8 6 -12 q9 -6 9 -14z";
  const handle=big?`<path d="M86 52 q12 2 12 20 q0 16 -12 20" fill="none" stroke="${clear?"#C8D6E0":shade(liq,-.2)}" stroke-width="6" opacity=".75"/>`:"";
  const body=`<clipPath id="${id}"><path d="${d}"/></clipPath>${handle}<path d="${d}" fill="${clear?"#E3ECF1":liq}" opacity="${clear?.75:.95}"/>
    <g clip-path="url(#${id})">${clear?"":`<rect x="30" y="20" width="70" height="20" fill="#fff" opacity=".12"/>`}
     <rect x="${square?37:39}" y="${big?84:82}" width="${square?46:42}" height="46" rx="2" fill="${lab}"/>
     <rect x="${square?39:41}" y="${big?86:84}" width="${square?42:38}" height="42" fill="none" stroke="${labInk}" stroke-opacity=".5" stroke-width=".6"/>
     ${TX(L.brand,60,105,L.brand.length>10?8:10,36,labInk,"lsr")}${TX(L.sub,60,115,5,34,labInk,"lt")}${TX(p.aisle.split(" ")[0].replace("Liqueurs","Liqueur"),60,123,4.4,30,labInk,"lt")}
     <rect x="44" y="58" width="3.2" height="88" fill="#fff" opacity=".3"/><rect x="74" y="64" width="1.6" height="78" fill="#fff" opacity=".14"/>
     <rect x="30" y="0" width="70" height="160" fill="url(#wrap)" opacity=".7"/>${sweep(30,0,70,152)}</g>
    <rect x="${big?48:51}" y="${big?2:2}" width="${big?16:18}" height="${big?10:12}" rx="2" fill="${p.ink==="#FFFFFF"?"#1A1A1A":p.ink}"/><rect x="${big?48:51}" y="${big?9:11}" width="${big?16:18}" height="2" fill="#C9A14A"/>`;
  if(nip) return ["0 0 120 160",SHADOW_AT(60,151,12)+`<g transform="translate(34 74) scale(.52)">${body}</g>`];
  if(small) return ["0 0 120 160",SHADOW_AT(60,151,17)+`<g transform="translate(18 40) scale(.72)">${body}</g>`];
  return ["0 0 120 160",SHADOW_AT(60,151,big?30:24)+body];
}

/* --- choose the right package for a product --- */
function realArt(p){
  const L=labelOf(p), n=p.name.toLowerCase();
  if(p.dept==="Wine"){ if(p.shape==="boxwine"||p.shape==="pack") return null; return wineReal(p,L); }
  if(p.dept==="Spirits"){ if(p.aisle==="Seltzers, ciders and cocktails") return null; return spiritReal(p,L); }
  const bev = p.dept==="Beer" || (p.dept==="Soft drinks" && !/^ice \d/.test(n) && p.shape!=="carton" && p.shape!=="jug");
  if(!bev) return null;
  const st=brandStyle(p,L), k=pack(p);
  if(p.dept==="Soft drinks"){
    const pet = !/\bcans?\b/.test(n) && (p.shape==="pet" || /water|spring|dasani|aquafina|smart ?water|essentia|fiji|voss|propel|gatorade|gatorlyte|vitamin water|body ?armor|core|\d(?:\.\d)? ?l\b|16\.9|20 oz|bottle/.test(n));
    if(pet && k.count>=6) return shrinkPack(p,st,k.count);
    if(pet) return singlePet(p,st);
  }
  if(k.count>=10) return caseBox(p,st,k.count,k.mat);
  if(k.count>=2) return k.mat==="bottle"?bottleCarrier(p,st,k.count):canPack(p,st,k.count,k.oz);
  if(k.mat==="bottle"||/bottle/.test(n)) return singleBottle(p,st,k.oz);
  return singleCan(p,st,k.oz);
}

const SUB_DEFAULT = {bread:["Sub roll"],meat:["Italian cold cuts"],cheese:["Provolone"],top:["Lettuce","Tomato","Onion","Oil & vinegar"],size:["Large"]};
function subSVG(s,animate){
  const wrap = s.bread[0]==="Wrap", L=[];
  const g=(c,inner)=>`<g class="${animate?"layer":""}">${inner}</g>`;
  const meatC={"Italian cold cuts":"#C9485B","Turkey":"#E9CBA7","Ham":"#F2A1A8","Roast beef":"#8E3B32","Chicken cutlet":"#C98A3E","Tuna salad":"#E6D3A3"};
  const chC={"Provolone":"#F6EBC5","American":"#F6B83C","Swiss":"#F7E7A1","Cheddar":"#F29A26"};
  if(wrap){
    L.push(`<path d="M12 120 Q60 140 108 120 L104 96 Q60 112 16 96 Z" fill="#E8C690"/>`);
  } else L.push(`<path d="M10 116 Q10 128 24 130 L96 130 Q110 128 110 116 Z" fill="#C98B43"/>`);
  let y=112;
  s.meat.forEach((m,i)=>{L.push(g(0,`<path d="M14 ${y} q10 -6 20 0 q10 -6 20 0 q10 -6 20 0 q10 -6 20 0 q6 -4 12 0 v6 h-92z" fill="${meatC[m]}"/>`));y-=6;});
  if(chC[s.cheese[0]]){L.push(g(0,`<path d="M14 ${y+2} l12 6 l12 -6 l12 6 l12 -6 l12 6 l12 -6 l12 6 l8 -4 v-6 h-92z" fill="${chC[s.cheese[0]]}"/>`));y-=6;}
  if(s.top.includes("Tomato")){L.push(g(0,[22,44,66,88].map(x=>`<ellipse cx="${x}" cy="${y+3}" rx="10" ry="3.5" fill="#D7262E"/>`).join("")));y-=4;}
  if(s.top.includes("Onion")){L.push(g(0,[30,56,82].map(x=>`<ellipse cx="${x}" cy="${y+3}" rx="9" ry="2.5" fill="none" stroke="#C99BD0" stroke-width="2"/>`).join("")));y-=3;}
  if(s.top.includes("Pickles")){L.push(g(0,[26,52,78,98].map(x=>`<ellipse cx="${x}" cy="${y+3}" rx="7" ry="3" fill="#7DA33A"/>`).join("")));y-=3;}
  if(s.top.includes("Hots")){L.push(g(0,[36,62,90].map(x=>`<circle cx="${x}" cy="${y+3}" r="3" fill="#E04A1A"/>`).join("")));}
  if(s.top.includes("Lettuce")){L.push(g(0,`<path d="M10 ${y+4} q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 v4 h-96z" fill="#6DBA3E"/>`));y-=6;}
  if(wrap) L.push(`<path d="M16 96 Q60 ${y-30} 104 96 L108 120 Q60 ${y-10} 12 120 Z" fill="#F0D5A4" opacity=".92"/>`);
  else {
    const top = s.bread[0]==="Bulkie roll"?`<path d="M18 ${y+4} Q60 ${y-44} 102 ${y+4} Z" fill="#D9A45B"/>`:s.bread[0]==="Scali"?`<path d="M10 ${y+4} Q12 ${y-26} 60 ${y-28} Q108 ${y-26} 110 ${y+4} Z" fill="#E2B56E"/>`+[30,48,66,84].map(x=>`<ellipse cx="${x}" cy="${y-14}" rx="1.6" ry="1" fill="#FFF5DD"/>`).join(""):`<path d="M8 ${y+4} Q10 ${y-24} 60 ${y-26} Q110 ${y-24} 112 ${y+4} Z" fill="#D9A45B"/><path d="M30 ${y-14} l10 -4 M54 ${y-18} l10 -4 M78 ${y-14} l10 -4" stroke="#B9823A" stroke-width="2"/>`;
    L.push(g(0,top));
  }
  return L.join("");
}

const CACHE = new Map();
/** SVG markup for a product, or the deli sandwich drawing. */
export function packageArt(p) {
  if (CACHE.has(p.id)) return CACHE.get(p.id);
  let svg;
  if (p.aisle === "Deli sandwiches" || p.shape === "sandwich") {
    svg = `<svg viewBox="0 0 120 160" aria-hidden="true" focusable="false">${SHADOW(48)}${subSVG(SUB_DEFAULT, false)}</svg>`;
  } else {
    const ra = realArt(p);
    if (ra) svg = `<svg viewBox="${ra[0]}" aria-hidden="true" focusable="false">${ra[1]}</svg>`;
    else {
      const fn = SHAPES[p.shape] || SHAPES.box;
      svg = `<svg viewBox="0 0 120 160" aria-hidden="true" focusable="false">${fn(p, labelOf(p))}</svg>`;
    }
  }
  CACHE.set(p.id, svg);
  return svg;
}
