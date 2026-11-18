// Puts a line icon before every field label inside form modals.
// Labels are matched by keyword; the icon is drawn by CSS from a data
// attribute, so React never sees or removes it.
const RULES = [
  [/password/i, 0xf023],
  [/e-?mail/i, 0xf0e0],
  [/phone|whatsapp|mobile|contact no/i, 0xf095],
  [/address|location|storage/i, 0xf3c5],
  [/vehicle|driver|waybill|dispatch/i, 0xf0d1],
  [/photo|drawing|preview|artwork file|file/i, 0xf03e],
  [/price|rate|cost|amount|total|gst|tax|₹/i, 0xf156],
  [/weight|reel/i, 0xf5cd],
  [/date|day|week|expected/i, 0xf133],
  [/time|shift|hours|hrs|interval|changeover|lead/i, 0xf017],
  [/size|width|height|length|dimension|measure|gsm|ups\b|capacity/i, 0xf546],
  [
    /qty|quantity|stock|sheets|reorder|batch|available|received|issued/i,
    0xf468,
  ],
  [/vendor|supplier|company|client|customer|division|brand/i, 0xf1ad],
  [/machine|die|plate|tool|part|compatible/i, 0xf013],
  [/paper|material|category|type|module|group/i, 0xf5fd],
  [/status|stage|process|priority|rank|score/i, 0xf05a],
  [
    /remark|note|description|reason|comment|defect|checklist|condition/i,
    0xf249,
  ],
  [
    /name|operator|inspector|approver|owner|recipient|person|username|lead|by\b/i,
    0xf007,
  ],
  [
    /#|no\.?$|number|code|reference|ref\b|version|invoice|\bpo\b|\bso\b|order|job|sample/i,
    0xf292,
  ],
];
const DEFAULT_ICON = 0xf044;

export function iconForLabel(text) {
  for (const [re, code] of RULES)
    if (re.test(text)) return String.fromCodePoint(code);
  return String.fromCodePoint(DEFAULT_ICON);
}

const SELECTOR = ".anim-panel label, .lg-modal label";

function apply() {
  document.querySelectorAll(SELECTOR).forEach((el) => {
    if (el.querySelector("input[type=checkbox],input[type=radio],i,svg"))
      return;
    const text = el.textContent.trim();
    if (!text) return;
    const ico = iconForLabel(text);
    if (el.dataset.ico !== ico) el.dataset.ico = ico;
  });
}

export function startLabelIcons() {
  let queued = false;
  const run = () => {
    queued = false;
    apply();
  };
  const obs = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  });
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  apply();
  return () => obs.disconnect();
}
