import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, addDoc, collection, increment } from "firebase/firestore";

// ── Design tokens ──────────────────────────────────────────────────────────
var B90 = "#0f47ff", B80 = "#4268ff", B30 = "#dee5ff", B20 = "#f0f3ff";
var L70 = "#d7f6a4", L80 = "#c6ee6f", L50 = "#e7fac8";
var O50 = "#f9f6ec";
var D = "#262626", M = "#606060", G5 = "#9a9a9a", G2 = "#e6e6e6", W = "#ffffff";

var FONT_DISPLAY = '"Crapcase Display", system-ui, sans-serif';
var FONT_TEXT    = '"Crapcase Text", system-ui, sans-serif';
var FONT_BODY    = '"GTStandard-M", system-ui, sans-serif';

// ── Data ───────────────────────────────────────────────────────────────────
var CHARITIES = [
  {
    id: "freshlife",
    name: "Fresh Life",
    desc: "Eco-friendly, waterless toilets in Kenya",
    long: "Fresh Life provides eco-friendly, waterless toilets to communities in densely populated urban settlements in Kenya. They work with residents and partners to ensure safe waste removal and treatment, then convert the waste into useful products like organic fertiliser and biofuel.",
    img: "/fresh-life.jpg",
    imgFallback: "https://us.whogivesacrap.org/cdn/shop/files/impact-section-partners-octavias-story.jpg?v=1722968356&width=690",
  },
  {
    id: "wateraid",
    name: "WaterAid",
    desc: "Sanitation through practical solutions worldwide",
    long: "WaterAid tackles the sanitation crisis through practical solutions, advocacy, education and systemic change. They work all over the world to ensure communities have access to clean water and safe toilets. In Timor-Leste, for example, installing toilets in schools means girls no longer miss class when they get their period.",
    img: "https://us.whogivesacrap.org/cdn/shop/files/impact-section-partners-octavias-story.jpg?v=1722968356&width=690",
    imgFallback: null,
  },
  {
    id: "waterforpeople",
    name: "Water For People",
    desc: "Everyone Forever model for lasting access",
    long: "Known for its 'Everyone Forever' model, Water For People partners with districts lacking clean water and sanitation and does not leave until every household, health clinic and school can access these services sustainably and forever.",
    img: "https://us.whogivesacrap.org/cdn/shop/files/impact-section-partners-aishas-story-water-for-people.jpg?v=1722968356&width=690",
    imgFallback: null,
  },
];

var FARTS = [
  "The Thunderclap","The Squeaky Clean","The Morning Glory","The Brass Section",
  "The Bubble Bath","The Trombone Solo","The Polite Whisper","The Grand Finale",
  "The Rolling Thunder","The Tiny Toot","The Foghorn","The Duckling","The Rumbler",
  "The Staccato","The Jazz Improv","The Whoopee Cushion Classic",
  "The One You Blame on the Dog","The Silent But Deadly","The After-Shower Surprise",
  "The Bathtub Bubbler","The Barking Spider","The Barn Owl","The Lead Balloon",
];

var REACT = [
  "Beautiful. $0.001 to clean water.","The planet thanks your intestines.",
  "Someone just got closer to a toilet.","Your butt just changed the world.",
  "Excuse you. And thank you.","Gross. Also: heroic.",
  "That's the sound of generosity.","Magnificent.",
  "You farted so someone could flush.","One small toot for humankind...",
  "$0.001 well spent.","That was beautiful and disgusting.",
  "A tiny donation for a mighty wind.","The world is marginally better now.",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function td() { return new Date().toISOString().slice(0, 10); }

// ── Real fart sounds ──────────────────────────────────────────────────────
var SOUNDS = [
  ...Array.from({length:23}, (_,i) => `/sounds/fart-${String(i+1).padStart(2,'0')}.mp3`),
  '/sounds/fart-25.mp3',
  '/sounds/fart-26.wav',
  '/sounds/fart-27.wav',
  '/sounds/fart-29.mp3',
  '/sounds/fart-30.mp3',
  '/sounds/fart-31.wav',
  ...Array.from({length:8}, (_,i) => `/sounds/fart-${String(i+32).padStart(2,'0')}.mp3`),
  '/sounds/fart-49.mp3',
];
function playFart() {
  var src = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
  var a = new Audio(src);
  a.volume = 0.8;
  a.play().catch(() => {});
}

// ── Improved fart synthesis (pink noise with baked-in flutter) ─────────────
// Pink noise generator using Voss-McCartney algorithm.
// Flutter and envelope are baked directly into the buffer for a natural sound.
function makePinkFart(ctx, opts) {
  var dur    = opts.dur    ?? (0.4 + Math.random() * 0.7);
  var fStart = opts.fStart ?? (70  + Math.random() * 80);
  var fEnd   = opts.fEnd   ?? (40  + Math.random() * 40);
  var flutter= opts.flutter?? (18  + Math.random() * 18);
  var Q      = opts.Q      ?? (3   + Math.random() * 5);
  var vol    = opts.vol    ?? 0.65;
  var attack = opts.attack ?? 0.03;

  var t  = ctx.currentTime;
  var sr = ctx.sampleRate;
  var sz = Math.floor(sr * dur);
  var buf = ctx.createBuffer(1, sz, sr);
  var d   = buf.getChannelData(0);

  // Pink noise (Voss-McCartney approximation)
  var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (var i = 0; i < sz; i++) {
    var w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179;
    b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520;
    b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522;
    b5 = -0.7616*b5 - w*0.0168980;
    var pink = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) / 5.5;
    b6 = w * 0.115926;

    // Flutter: rapid AM at flutter Hz
    var fl = 0.5 + 0.5 * Math.sin(2 * Math.PI * flutter * i / sr);

    // Main envelope: quick attack, gentler decay
    var p   = i / sz;
    var att = Math.min(1, i / (sr * attack));
    var env = att * Math.pow(1 - p, 0.35);

    d[i] = pink * fl * env * 3.5;
  }

  var src = ctx.createBufferSource();
  src.buffer = buf;

  // Bandpass sweep: starts higher, drifts lower
  var bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(fStart, t);
  bp.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
  bp.Q.value = Q;

  var g = ctx.createGain();
  g.gain.value = vol;

  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t);
}

// 9 distinct variants
function fBub(c){makePinkFart(c,{dur:.3, fStart:130,fEnd:85, flutter:32,Q:4});}
function fBra(c){makePinkFart(c,{dur:.7, fStart:170,fEnd:60, flutter:14,Q:6});}
function fSq(c) {makePinkFart(c,{dur:.14,fStart:500,fEnd:220,flutter:55,Q:8,vol:.5});}
function fRum(c){makePinkFart(c,{dur:1.0,fStart:80, fEnd:38, flutter:7, Q:3});}
function fCla(c){makePinkFart(c,{dur:.55,fStart:110,fEnd:65, flutter:22,Q:5});}
function fLo(c) {makePinkFart(c,{dur:1.3,fStart:90, fEnd:42, flutter:11,Q:4,attack:.01});}
function fWe(c) {makePinkFart(c,{dur:.5, fStart:220,fEnd:110,flutter:38,Q:7,vol:.55});}
function fQu(c) {makePinkFart(c,{dur:.1, fStart:200,fEnd:95, flutter:65,Q:5,vol:.5});}
function fTu(c) {makePinkFart(c,{dur:.85,fStart:72, fEnd:48, flutter:9, Q:3,attack:.04});}

function makeFart(ctx) { pick([fBub,fBra,fSq,fRum,fCla,fLo,fWe,fQu,fTu])(ctx); }

var CENT = 0.001, CAP = 10, COOL = 2500;

// ── Logo SVG ───────────────────────────────────────────────────────────────
function Logo({ fill, style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 42" fill={fill || B90} style={style}>
      <path d="M17.4566 22.0401C17.1011 22.0401 17.0477 22.1116 16.7092 22.1116C16.3355 22.1116 16.1582 21.9334 16.1582 21.4714C16.1582 20.4226 17.0124 19.2671 17.0124 18.0049C17.0124 16.956 16.2116 16.4588 14.6826 16.4588C13.7579 16.4588 12.7436 16.7256 11.0715 16.7256C9.39939 16.7256 8.36795 16.4941 6.81971 16.4941C3.40398 16.4941 1.50125 17.8448 1.50125 20.2977C1.50125 21.56 2.34264 22.3794 3.32177 22.9481C1.84507 23.3034 .853131 23.9841 .853131 25.1577C.853131 25.7936 1.35177 26.3495 2.06289 26.5906C1.09444 26.6419 0 27.0356 0 28.1196C0 29.7552 2.64161 30.2343 5.02483 30.2343C8.20992 30.2343 10.9199 28.8931 10.9199 26.6184C10.9199 22.9641 4.30623 25.2473 4.48561 23.5424C4.49095 23.4869 4.51444 23.4229 4.53686 23.3908C5.21275 23.569 5.90892 23.6416 6.70973 23.6416C9.62362 23.6416 11.3235 22.5191 11.3235 20.6893C11.3235 19.872 11.0032 19.25 10.3454 18.8051C12.4446 18.9118 12.7115 19.2671 12.7115 20.1377C12.7115 20.8846 12.2311 22.2887 12.2311 23.3727C12.2311 24.652 13.0319 25.3818 14.8812 25.3818C16.3216 25.3818 18.1902 24.4578 18.1902 23.1422C18.1902 22.5021 17.9585 22.0401 17.4609 22.0401H17.4566ZM5.04938 27.0708C6.66809 27.1775 7.07704 27.2127 7.07704 27.569C7.07704 27.9606 6.64994 28.2626 5.47648 28.2626C4.30303 28.2626 3.30682 27.9425 3.30682 27.3023C3.30682 27.1423 3.34205 27.0174 3.41359 26.9107C3.96455 26.9993 4.53473 27.0356 5.05045 27.0708H5.04938ZM6.50793 21.4362C5.90358 21.4362 5.45833 21.1161 5.45833 20.4407C5.45833 19.7301 5.92067 19.1433 6.6147 19.1433C7.21905 19.1433 7.6643 19.4634 7.6643 20.1388C7.6643 20.8494 7.20196 21.4362 6.50793 21.4362ZM12.2631 9.189C12.2631 6.932 13.2945 4.444 15.0734 4.444C16.2479 4.444 17.0306 5.066 17.0306 5.955C17.0306 7.022 16.0696 7.679 16.0696 9.03C16.0696 9.83 16.532 10.203 17.1011 10.203C17.8122 10.203 18.2927 9.723 18.2927 8.799C18.2927 8.266 18.2393 8.017 18.2393 7.662C18.2393 6.702 18.7379 6.169 20.0363 6.169C21.2461 6.169 21.6016 6.649 21.6016 7.573C21.6016 7.982 21.3881 8.427 21.3881 9.084C21.3881 9.813 21.7265 10.258 22.3843 10.258C23.1851 10.258 23.5407 9.494 23.5407 8.675C23.5407 7.555 23.1136 6.738 23.1136 6.098C23.1136 5.084 24.0382 4.445 25.3366 4.445C26.7418 4.445 27.4358 5.582 27.4358 7.858C27.4358 11.093 25.5854 13.279 22.7932 13.333C21.7084 13.333 20.3385 13.119 19.5024 11.715C18.6311 12.888 17.4919 13.333 16.532 13.333C13.6683 13.333 12.2631 11.91 12.2631 9.191V9.189Z"/>
      <path d="M28.0775 10.949C28.0775 4.497 30.9241 0 33.5743 0C34.6239 0 35.3179.96 35.3179 1.742C35.3179 2.062 35.2293 2.364 34.7136 2.773C33.6106 3.662 32.9166 4.639 32.4371 6.24C33.38 4.764 34.5363 4.444 35.3905 4.444C36.7423 4.444 37.4716 5.154 37.4716 6.683C37.4716 7.75 37.0445 8.603 37.0445 9.456C37.0445 10.132 37.3648 10.434 37.9691 10.434C38.1944 10.434 38.4261 10.386 38.6589 10.298C38.581 9.958 38.5383 9.589 38.5383 9.19C38.5383 6.719 40.299 4.444 43.7681 4.444C46.3115 4.444 48.322 5.653 48.322 8.586C48.322 11.057 46.5613 13.332 43.0922 13.332C41.4938 13.332 40.1078 12.798 39.2964 11.71C38.4411 12.714 37.3093 13.332 36.0835 13.332C34.1263 13.332 33.38 12.211 33.38 10.879C33.38 9.777 33.665 9.136 33.665 8.354C33.665 7.839 33.4333 7.59 33.0073 7.59C32.4734 7.59 32.0997 8.177 31.993 9.35C31.9577 9.918 31.8862 10.789 31.8328 12.105C31.7976 12.958 31.2808 13.314 30.4447 13.314C29.0214 13.314 28.0786 12.656 28.0786 10.949H28.0775ZM42.3256 9.243C42.3256 9.9 42.6277 10.434 43.2865 10.434C43.9453 10.434 44.5497 9.812 44.5497 8.514C44.5497 7.857 44.2475 7.324 43.5887 7.324C42.9299 7.324 42.3256 7.946 42.3256 9.243Z"/>
      <path d="M24.3148 17.669C24.3148 18.682 24.3682 18.966 24.3682 20.353C24.3682 21.74 23.924 22.273 23.3186 22.273C22.8915 22.273 22.5359 22.024 22.5359 21.366C22.5359 20.246 23.2299 19.34 23.2299 18.273C23.2299 17.206 22.4825 16.477 20.8638 16.477C19.9925 16.477 19.0134 16.655 18.3557 17.046C17.8933 17.312 17.6616 17.668 17.6616 18.236C17.6616 18.574 17.715 18.965 17.9104 19.339C18.0706 19.641 18.3194 19.765 18.7817 19.765C19.1373 19.765 19.2088 19.89 19.2088 20.174C19.2088 20.956 18.8885 21.65 18.8885 22.716C18.8885 24.44 19.9915 25.364 22.001 25.364C25.0964 25.364 28.085 22.716 28.085 18.627C28.085 17.223 26.9286 16.476 25.4882 16.476C24.7942 16.476 24.3137 16.796 24.3137 17.667L24.3148 17.669ZM34.2406 21.899C33.4931 21.899 32.782 21.774 32.088 21.491C32.3549 22.238 33.1376 22.628 34.0452 22.628C34.7211 22.628 35.2368 22.343 35.7706 22.343C36.3931 22.343 36.785 22.877 36.785 23.534C36.785 23.907 36.6964 24.316 36.3227 24.601C35.7536 25.028 34.846 25.365 33.5124 25.365C30.7725 25.365 28.4961 24.121 28.4961 21.152C28.4961 18.415 30.6487 16.477 33.7793 16.477C36.0557 16.477 37.4972 17.472 37.4972 19.143C37.4972 20.814 36.359 21.898 34.2416 21.898L34.2406 21.899Z"/>
      <path d="M42.7612 18.842C43.5086 18.842 44.255 19.589 45.0558 19.606C45.6068 19.625 46.1406 18.966 46.1406 18.149C46.1406 17.172 44.8775 16.478 42.6363 16.478C40.1997 16.478 38.0823 17.562 38.0823 19.5C38.0823 22.201 41.5685 21.757 41.5685 22.7C41.5685 22.913 41.4265 23.038 41.1767 23.038C40.0021 23.038 39.4512 21.971 38.6151 21.971C37.9392 21.971 37.4235 22.681 37.4235 23.393C37.4235 24.53 38.7934 25.366 41.213 25.366C44.0233 25.366 45.8555 24.175 45.8555 22.184C45.8555 19.731 42.3159 19.998 42.3159 19.163C42.3159 18.984 42.4409 18.842 42.7601 18.842H42.7612ZM59.998 23.588C59.998 24.157 59.8025 24.477 59.3754 24.797C58.8415 25.189 58.077 25.366 57.2943 25.366C56.1561 25.366 55.0884 24.921 54.6442 23.89C54.1103 24.974 53.0789 25.366 52.1008 25.366C50.3401 25.366 49.0054 24.085 49.0054 21.669C49.0054 18.505 51.1398 16.478 53.5775 16.478C54.3783 16.478 55.1076 16.727 55.6233 17.278C56.0322 16.638 56.5309 16.478 57.1 16.478C57.794 16.478 59.0572 16.887 59.0572 17.917C59.0572 18.948 58.2211 20.672 58.2211 21.686C58.2211 22.095 58.3631 22.238 58.6835 22.238H58.8789C59.164 22.238 59.4843 22.256 59.7331 22.611C59.9285 22.896 60 23.251 60 23.588H59.998ZM54.8396 19.66C54.5374 19.535 54.3943 19.518 54.1818 19.518C53.2924 19.518 52.7051 20.3 52.7051 21.295C52.7051 21.953 53.0607 22.326 53.6298 22.326C54.1455 22.326 54.484 21.917 54.6079 21.029C54.6431 20.744 54.7499 20.175 54.8396 19.66Z"/>
      <path d="M17.226 31.516C17.9734 31.516 18.2403 31.871 18.7732 31.871C19.449 31.871 20.0011 30.894 20.0011 30.182C20.0011 29.755 19.716 29.4 19.2184 29.08C18.6845 28.76 17.8837 28.511 16.7818 28.511C14.2384 28.511 11.9609 30.289 11.9609 33.222C11.9609 35.96 13.7216 37.399 16.4262 37.399C17.5292 37.399 18.3834 37.15 18.9878 36.777C19.5216 36.439 19.6989 36.102 19.6989 35.621C19.6989 34.839 19.2899 34.129 18.6493 34.129C18.062 34.129 17.8133 34.377 17.1192 34.377C16.3718 34.377 15.7856 33.986 15.7856 33.045C15.7856 32.156 16.4262 31.516 17.226 31.516ZM26.494 28.512C25.4978 28.512 24.7867 29.348 24.3596 30.77C24.3949 30.503 24.413 30.218 24.413 29.935C24.413 29.064 24.0041 28.512 22.5807 28.512C21.5845 28.512 21.1404 28.921 20.82 30.308C20.4997 31.694 20.3748 33.348 20.3748 34.894C20.3748 36.796 21.4244 37.4 22.8648 37.4C23.5759 37.4 24.0564 37.045 24.0927 36.066C24.1279 35.018 24.1642 34.235 24.2347 33.809C24.4301 32.528 25.0174 32.333 25.8352 32.191C27.0269 31.978 27.7924 31.321 27.7924 30.005C27.7924 29.045 27.3472 28.512 26.494 28.512ZM48.498 32.067C48.498 35.054 46.808 37.4 44.158 37.4C43.517 37.4 42.841 37.24 42.165 36.848C42.077 37.719 42.005 38.715 41.97 39.817C41.935 40.812 41.383 41.096 40.6 41.096C39.284 41.096 38.234 40.492 38.252 38.678C38.257 37.866 38.294 37.055 38.359 36.247C37.696 36.924 36.863 37.398 35.796 37.398C34.568 37.398 33.769 36.918 33.235 35.922C32.684 37.006 31.669 37.398 30.691 37.398C28.931 37.398 27.596 36.118 27.596 33.701C27.596 30.537 29.73 28.51 32.168 28.51C32.951 28.51 33.662 28.759 34.179 29.274C34.641 28.634 35.175 28.51 35.584 28.51C36.705 28.51 37.63 29.025 37.63 30.074C37.63 30.998 36.794 32.581 36.794 33.629C36.794 34.198 37.132 34.393 37.594 34.393C37.908 34.393 38.246 34.313 38.598 34.149C38.773 32.96 39.013 31.778 39.32 30.607C39.747 28.954 40.191 28.509 41.224 28.509C42.754 28.509 43.198 29.06 43.198 29.931V30.198C43.678 29.043 44.585 28.509 45.778 28.509C47.575 28.509 48.499 29.985 48.499 32.064L48.498 32.067ZM33.431 31.694C33.129 31.569 32.986 31.552 32.774 31.552C31.884 31.552 31.297 32.334 31.297 33.33C31.297 33.987 31.652 34.36 32.168 34.36C32.737 34.36 33.076 33.952 33.2 33.063C33.235 32.778 33.342 32.209 33.431 31.694ZM44.762 32.778C44.762 32.049 44.477 31.676 43.873 31.676C43.357 31.676 42.965 31.996 42.735 33.062C42.699 33.187 42.61 33.666 42.486 34.413C42.771 34.554 43.055 34.608 43.322 34.608C44.246 34.608 44.762 33.772 44.762 32.777V32.778Z"/>
    </svg>
  );
}

// ── Accordion with per-charity donation stats ──────────────────────────────
function Acc({ name, desc, long, img, imgFallback, todayAmt, totalAmt }) {
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(img);

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 8, border: "1px solid " + G2 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ background: B20, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <strong style={{ color: B90, fontSize: 15, fontFamily: FONT_TEXT }}>{name}</strong>
          <span style={{ color: M, fontSize: 13 }}>{" — "}{desc}</span>
        </div>
        <span style={{ fontSize: 12, color: B90, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s", display: "inline-block" }}>{"▼"}</span>
      </div>
      {open && (
        <div style={{ padding: 18, background: W, animation: "fadeIn .2s ease-out" }}>
          <img
            src={imgSrc} alt={name}
            style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 200, objectFit: "cover" }}
            onError={(e) => {
              if (imgFallback && imgSrc !== imgFallback) {
                setImgSrc(imgFallback);
              } else {
                e.target.style.display = "none";
              }
            }}
          />
          <p style={{ fontSize: 14, color: D, lineHeight: 1.6, margin: "0 0 14px", fontFamily: FONT_BODY }}>{long}</p>
          {/* Per-charity donation stats */}
          <div style={{ background: O50, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: G5, fontFamily: FONT_BODY, marginBottom: 2 }}>Today</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: B90, fontFamily: FONT_TEXT }}>${todayAmt.toFixed(3)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: G5, fontFamily: FONT_BODY, marginBottom: 2 }}>All time</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: B90, fontFamily: FONT_TEXT }}>${totalAmt.toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default per-charity stats shape ───────────────────────────────────────
function defaultStats() {
  return Object.fromEntries(CHARITIES.map((c) => [c.id, { today: 0, total: 0 }]));
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [totalFarts, setTotalFarts] = useState(0);
  const [myFarts,    setMyFarts]    = useState(0);
  const [todayD,     setTodayD]     = useState(0);
  const [charityStats, setCharityStats] = useState(defaultStats);
  const [lastFart,   setLastFart]   = useState(null);
  const [reaction,   setReaction]   = useState(null);
  const [loaded,     setLoaded]     = useState(false);
  const [shaking,    setShaking]    = useState(false);
  const [showMore,   setShowMore]   = useState(false);
  const [charity,    setCharity]    = useState(() => CHARITIES[Math.floor(Math.random() * CHARITIES.length)].id);
  const [capped,     setCapped]     = useState(false);
  const [cooling,    setCooling]    = useState(false);
  const [clouds,     setClouds]     = useState([]);
  const [showProto,  setShowProto]  = useState(false);
  const [protoSeen,  setProtoSeen]  = useState(false);
  const [showShare,  setShowShare]  = useState(false);

  const ctxRef = useRef(null);
  const cidRef = useRef(0);
  const refs   = useRef({ total: 0, my: 0, today: 0, fsDate: "", lastDate: td(), csTotal: {}, csToday: {} });

  // ── Load persisted state ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // totalFarts is now seeded by the Firestore onSnapshot listener below
      try { const r = await window.storage.get("ffg6_my");           if (r) { const v = parseInt(r.value)||0; setMyFarts(v);    refs.current.my    = v; } } catch(e){}
      // Daily cap & todayD are now driven by the Firestore onSnapshot listener
      // Charity selection
      try {
        const r = await window.storage.get("ffg6_charity");
        if (r) { setCharity(r.value); }
        else {
          const rand = CHARITIES[Math.floor(Math.random() * CHARITIES.length)].id;
          setCharity(rand);
          window.storage.set("ffg6_charity", rand).catch(() => {});
        }
      } catch(e) {}
      // Proto seen flag — date-based (show once per calendar day)
      try { const r = await window.storage.get("ffg6_proto_seen"); if (r && r.value === td()) setProtoSeen(true); } catch(e) {}
      // Per-charity stats
      const csTotal = {};
      const csToday = {};
      for (const c of CHARITIES) {
        try { const r = await window.storage.get(`ffg6_ctotal_${c.id}`); csTotal[c.id] = r ? parseFloat(r.value)||0 : 0; } catch(e) { csTotal[c.id] = 0; }
        try {
          const r = await window.storage.get(`ffg6_cday_${c.id}`, true);
          if (r) { const p = JSON.parse(r.value); csToday[c.id] = p.date === td() ? parseFloat(p.amount)||0 : 0; }
          else { csToday[c.id] = 0; }
        } catch(e) { csToday[c.id] = 0; }
      }
      refs.current.csTotal = csTotal;
      refs.current.csToday = csToday;
      setCharityStats(Object.fromEntries(CHARITIES.map((c) => [c.id, { today: csToday[c.id], total: csTotal[c.id] }])));
      setLoaded(true);
    }
    init();
  }, []);

  // ── Midnight reset check (runs every 60s) — resets per-charity local stats ──
  useEffect(() => {
    const check = () => {
      if (refs.current.lastDate !== td()) {
        refs.current.lastDate = td();
        const newCsToday = Object.fromEntries(CHARITIES.map((c) => [c.id, 0]));
        refs.current.csToday = newCsToday;
        setCharityStats((prev) =>
          Object.fromEntries(CHARITIES.map((c) => [c.id, { ...prev[c.id], today: 0 }]))
        );
        for (const c of CHARITIES) {
          window.storage.set(`ffg6_cday_${c.id}`, JSON.stringify({ date: td(), amount: 0 }), true).catch(() => {});
        }
      }
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Live global counter from Firestore ───────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, "counters", "global"), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const farts = data.farts || 0;
      const isToday = data.dailyDate === td();
      const dailyAmt = isToday ? (data.dailyFarts || 0) * CENT : 0;
      refs.current.total   = farts;
      refs.current.today   = dailyAmt;
      refs.current.fsDate  = data.dailyDate || "";
      setTotalFarts(farts);
      setTodayD(dailyAmt);
      setCapped(dailyAmt >= CAP);
    });
    return () => unsub();
  }, []);

  // ── Fart handler ───────────────────────────────────────────────────────────
  const doFart = useCallback((e) => {
    if (capped || cooling) return;
    playFart();

    setLastFart(pick(FARTS));
    setReaction(pick(REACT));
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    setCooling(true);
    setTimeout(() => setCooling(false), COOL);

    const nT  = refs.current.total + 1;
    const nM  = refs.current.my    + 1;
    const nD  = refs.current.today + CENT;
    refs.current.total = nT; refs.current.my = nM; refs.current.today = nD;
    setTotalFarts(nT); setMyFarts(nM); setTodayD(nD);
    if (nD >= CAP) setCapped(true);

    // Per-charity tracking (using the charity state via closure — capture current)
    const currentCharity = charity; // captured from outer scope
    const newCsTotal = { ...refs.current.csTotal, [currentCharity]: (refs.current.csTotal[currentCharity] || 0) + CENT };
    const newCsToday = { ...refs.current.csToday, [currentCharity]: (refs.current.csToday[currentCharity] || 0) + CENT };
    refs.current.csTotal = newCsTotal;
    refs.current.csToday = newCsToday;
    setCharityStats((prev) => ({
      ...prev,
      [currentCharity]: { today: newCsToday[currentCharity], total: newCsTotal[currentCharity] },
    }));

    // Floating 💨 emoji
    const rect = e?.currentTarget?.getBoundingClientRect();
    const cx   = rect ? rect.left + rect.width / 2 : 200;
    const cy   = rect ? rect.top : 300;
    const id   = cidRef.current++;
    setClouds((prev) => [...prev, { id, x: cx + (Math.random() - .5) * 100, y: cy - 20 }]);
    setTimeout(() => setClouds((prev) => prev.filter((c) => c.id !== id)), 1400);

    // Persist per-device state in localStorage
    window.storage.set("ffg6_my",    String(nM)).catch(() => {});
    window.storage.set(`ffg6_ctotal_${currentCharity}`, String(newCsTotal[currentCharity])).catch(() => {});
    window.storage.set(`ffg6_cday_${currentCharity}`,   JSON.stringify({ date: td(), amount: newCsToday[currentCharity] }), true).catch(() => {});

    // Fire-and-forget: sync to Firestore (global counter + global daily cap)
    if (db) {
      const today = td();
      const isNewDay = refs.current.fsDate !== today;
      setDoc(doc(db, "counters", "global"), {
        farts:      increment(1),
        dailyFarts: isNewDay ? 1 : increment(1),
        dailyDate:  today,
      }, { merge: true }).catch(() => {});
      if (isNewDay) refs.current.fsDate = today;
      addDoc(collection(db, "fartLog"), {
        timestamp: new Date().toISOString(),
        date:      today,
        charity:   currentCharity,
        amount:    CENT,
      }).catch(() => {});
    }

    // Prototype disclaimer (first fart only)
    if (!protoSeen) {
      setShowProto(true);
      setProtoSeen(true);
      window.storage.set("ffg6_proto_seen", td()).catch(() => {});
    }
  }, [capped, cooling, protoSeen, charity]);

  function changeCharity(v) {
    setCharity(v);
    window.storage.set("ffg6_charity", v).catch(() => {});
  }

  function doShare() {
    if (navigator.share) {
      navigator.share({ title: "Fart for Good", text: "I'm farting for charity. Every toot donates $0.001 to water & sanitation. Yes, really.", url: window.location.href }).catch(() => {});
    } else {
      setShowShare(true);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShowShare(false);
  }

  const donated   = (totalFarts * CENT).toFixed(3);
  const todayStr  = todayD.toFixed(3);
  const sel       = CHARITIES.find((c) => c.id === charity) || CHARITIES[0];
  const off       = capped || cooling;

  // Marquee: total farts → by you → donated → charity
  const marqueeItem = `${totalFarts.toLocaleString()} global farts\u2003\u2003\u2003💨\u2003\u2003\u2003${myFarts.toLocaleString()} by you\u2003\u2003\u2003💨\u2003\u2003\u2003$${donated} donated\u2003\u2003\u2003💨\u2003\u2003\u2003Currently farting for ${sel.name}\u2003\u2003\u2003💨\u2003\u2003\u2003We can\u2019t believe we built this either\u2003\u2003\u2003💨\u2003\u2003\u2003`;

  const SHARE_TARGETS = [
    { name:"X",        bg:"#000",    color:W, icon:"𝕏",  fn:()=>window.open("https://twitter.com/intent/tweet?text="+encodeURIComponent("I'm farting for charity. Every toot donates $0.001 to water & sanitation. Yes, really. ")+"&url="+encodeURIComponent(window.location.href),"_blank") },
    { name:"Facebook", bg:"#1877F2", color:W, icon:"f",  fn:()=>window.open("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(window.location.href),"_blank") },
    { name:"LinkedIn", bg:"#0A66C2", color:W, icon:"in", fn:()=>window.open("https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(window.location.href),"_blank") },
    { name:"WhatsApp", bg:"#25D366", color:W, icon:"W",  fn:()=>window.open("https://wa.me/?text="+encodeURIComponent("I'm farting for charity. Every toot donates $0.001 to water & sanitation. Yes, really. "+window.location.href),"_blank") },
    { name:"Telegram", bg:"#26A5E4", color:W, icon:"T",  fn:()=>window.open("https://t.me/share/url?url="+encodeURIComponent(window.location.href)+"&text="+encodeURIComponent("I'm farting for charity. Every toot donates $0.001 to water & sanitation. Yes, really."),"_blank") },
    { name:"Reddit",   bg:"#FF4500", color:W, icon:"r/", fn:()=>window.open("https://www.reddit.com/submit?url="+encodeURIComponent(window.location.href)+"&title="+encodeURIComponent("Fart for Good - every toot donates $0.001 to charity"),"_blank") },
    { name:"Email",    bg:G2,        color:D, icon:"✉",  fn:()=>{ window.location.href="mailto:?subject="+encodeURIComponent("Fart for Good")+"&body="+encodeURIComponent("I'm farting for charity. Every toot donates $0.001 to water & sanitation. Yes, really. "+window.location.href); } },
    { name:"Copy link",bg:G2,        color:D, icon:"🔗", fn:copyLink },
  ];

  if (!loaded) {
    return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:W }}><p style={{ color:G5, fontFamily:FONT_BODY }}>Loading...</p></div>;
  }

  return (
    <div style={{ minHeight:"100vh", background:W, fontFamily:FONT_BODY }}>
      <style dangerouslySetInnerHTML={{ __html:`
        @keyframes floatUp  { 0%{opacity:.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-140px) scale(2) rotate(20deg)} }
        @keyframes shake    { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} 75%{transform:rotate(-1deg)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes scroll   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .fart-btn:active { transform: scale(0.93) !important; transition: transform 0.08s ease; }
      `}} />

      {/* Floating 💨 emojis */}
      {clouds.map((c) => (
        <div key={c.id} style={{ position:"fixed", left:c.x-20, top:c.y-20, fontSize:36, pointerEvents:"none", zIndex:9999, animation:"floatUp 1.4s ease-out forwards" }}>💨</div>
      ))}

      {/* ── More Info Modal ── */}
      {showMore && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setShowMore(false)}>
          <div style={{ background:W, borderRadius:20, padding:"32px 28px", maxWidth:540, width:"100%", maxHeight:"85vh", overflow:"auto" }} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{ fontSize:28, fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 20px", lineHeight:1.1, fontFamily:FONT_DISPLAY }}>How it works</h3>
            <div style={{ fontSize:15, color:D, lineHeight:1.7, fontFamily:FONT_BODY }}>
              <p style={{ margin:"0 0 8px" }}><strong style={{ fontFamily:FONT_TEXT }}>$0.001 per fart.</strong>{" "}Every button press triggers a micro-donation to your selected charity.</p>
              <p style={{ margin:"0 0 24px" }}>Choose which charity gets your farts from the dropdown below the button, then get tootin'.</p>
              <div style={{ background:O50, borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
                <p style={{ margin:"0 0 4px", fontSize:14, color:M }}>Global farts: <strong style={{ color:D }}>{totalFarts.toLocaleString()}</strong></p>
                <p style={{ margin:"0 0 4px", fontSize:14, color:M }}>Total donated: <strong style={{ color:D }}>${donated}</strong></p>
                <p style={{ margin:"0 0 4px", fontSize:14, color:M }}>Your farts: <strong style={{ color:D }}>{myFarts.toLocaleString()}</strong></p>
                <p style={{ margin:0,          fontSize:14, color:M }}>Today: <strong style={{ color:D }}>${todayStr} / ${CAP}</strong></p>
              </div>
              <h4 style={{ fontSize:18, fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 12px", fontFamily:FONT_DISPLAY }}>Our charity partners</h4>
              {CHARITIES.map((c) => (
                <Acc
                  key={c.id}
                  name={c.name}
                  desc={c.desc}
                  long={c.long}
                  img={c.img}
                  imgFallback={c.imgFallback}
                  todayAmt={charityStats[c.id]?.today || 0}
                  totalAmt={charityStats[c.id]?.total || 0}
                />
              ))}
            </div>
            <div style={{ marginTop:24, textAlign:"center" }}>
              <button onClick={()=>setShowMore(false)} style={{ background:L70, color:D, padding:"12px 32px", borderRadius:100, fontSize:15, fontWeight:700, cursor:"pointer", border:"none", fontFamily:FONT_TEXT }}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prototype Disclaimer ── */}
      {showProto && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setShowProto(false)}>
          <div style={{ background:W, borderRadius:20, padding:"32px 28px", maxWidth:420, width:"100%", textAlign:"center" }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ fontSize:40, marginBottom:12 }}>💨</div>
            <h3 style={{ fontSize:22, fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 16px", fontFamily:FONT_DISPLAY }}>Thanks for farting!</h3>
            <p style={{ fontSize:15, color:D, lineHeight:1.6, margin:"0 0 12px", fontFamily:FONT_BODY }}>This is just a prototype for now, so no real donations are being made yet. But if you're a fan, let me know and maybe we can make this a real thing!</p>
            <p style={{ fontSize:15, color:D, lineHeight:1.6, margin:"0 0 24px", fontFamily:FONT_BODY }}>Thaaaaanks,<br/>Danny</p>
            <button onClick={()=>setShowProto(false)} style={{ background:L70, color:D, padding:"12px 32px", borderRadius:100, fontSize:15, fontWeight:700, cursor:"pointer", border:"none", fontFamily:FONT_TEXT }}>Keep farting</button>
          </div>
        </div>
      )}

      {/* ── Share Bottom Sheet ── */}
      {showShare && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:10000, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={()=>setShowShare(false)}>
          <div style={{ background:W, borderRadius:"20px 20px 0 0", padding:"20px 24px 32px", maxWidth:480, width:"100%" }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ width:36, height:4, borderRadius:2, background:G2, margin:"0 auto 16px" }}/>
            <h3 style={{ fontSize:18, fontWeight:700, color:D, margin:"0 0 4px", textAlign:"center", fontFamily:FONT_TEXT }}>Share Fart for Good</h3>
            <p style={{ fontSize:13, color:G5, margin:"0 0 20px", textAlign:"center", fontFamily:FONT_BODY }}>Spread the word. Spread the wind.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
              {SHARE_TARGETS.map((s) => (
                <div key={s.name} onClick={s.fn} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:s.bg, color:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700 }}>{s.icon}</div>
                  <span style={{ fontSize:11, color:M, fontFamily:FONT_BODY }}>{s.name}</span>
                </div>
              ))}
            </div>
            <div onClick={()=>setShowShare(false)} style={{ textAlign:"center", padding:"12px 0", fontSize:15, fontWeight:700, color:B90, cursor:"pointer", borderTop:"1px solid "+G2, fontFamily:FONT_TEXT }}>Close</div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav style={{ borderBottom:"1px solid "+G2, padding:"12px 24px" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <button onClick={()=>window.open("https://whogivesacrap.org/collections/all","_blank")} style={{ background:B90, color:W, padding:"8px 20px", borderRadius:100, fontSize:14, fontWeight:700, cursor:"pointer", border:"none", fontFamily:FONT_TEXT }}>Shop</button>
          <a href="https://whogivesacrap.org" target="_blank" rel="noopener noreferrer" aria-label="Who Gives A Crap">
            <Logo style={{ width:70, height:"auto" }}/>
          </a>
          <button onClick={doShare} style={{ background:W, color:D, padding:"8px 20px", borderRadius:100, fontSize:14, fontWeight:700, cursor:"pointer", border:"2px solid "+D, fontFamily:FONT_TEXT }}>Share</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background:L70, padding:"48px 24px", textAlign:"center", animation:shaking?"shake .3s ease-in-out":"none" }}>
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <h1 style={{ fontSize:"clamp(32px, 6vw, 50px)", fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 12px", lineHeight:1.1, fontFamily:FONT_DISPLAY }}>
            {capped ? "We've hit our limit for today!" : (lastFart || "Fart for Good")}
          </h1>
          <p style={{ fontSize:18, color:D, margin:"0 0 28px", lineHeight:1.5, opacity:.8, fontFamily:FONT_BODY }}>
            {capped ? "$10 donated today. Come back tomorrow for more charitable flatulence." : (reaction || "Press the button. It farts. $0.001 goes to charity.")}
          </p>

          {/* The Button — real image from wgac.me/play_button.png (RGBA transparent) */}
          <div
            className="fart-btn"
            onClick={off ? undefined : doFart}
            role="button"
            aria-label="Fart for good"
            aria-disabled={off}
            tabIndex={off ? -1 : 0}
            onKeyDown={(e) => { if (!off && (e.key==="Enter"||e.key===" ")) doFart(e); }}
            style={{
              display:"inline-block",
              cursor:off?"not-allowed":"pointer",
              opacity:off?.4:1,
              animation:off?"none":"pulse 3s ease-in-out infinite",
              transition:"opacity .3s",
              width:"clamp(160px, 30vw, 220px)",
              height:"clamp(160px, 30vw, 220px)",
            }}
          >
            <img
              src="/button.png"
              alt="Fart button"
              style={{ width:"100%", height:"100%", objectFit:"contain", display:"block", userSelect:"none", WebkitUserDrag:"none" }}
              draggable={false}
            />
          </div>

          {cooling && !capped && (
            <p style={{ fontSize:13, color:D, marginTop:12, opacity:.4, fontFamily:FONT_BODY }}>Recharging...</p>
          )}
        </div>
      </section>

      {/* ── Marquee ── */}
      <div style={{ background:B90, padding:"10px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", width:"max-content", animation:"scroll 60s linear infinite" }}>
          {Array.from({length:6}).map((_, i) => (
            <span key={i} style={{ whiteSpace:"nowrap", flexShrink:0, color:W, fontSize:16, fontWeight:700, letterSpacing:.2, fontFamily:FONT_TEXT, paddingRight:0 }}>{marqueeItem}</span>
          ))}
        </div>
      </div>

      {/* ── Content Cards ── */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:24 }}>
          {/* Card A */}
          <div style={{ background:O50, borderRadius:12, padding:24 }}>
            <h3 style={{ fontSize:20, fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 12px", fontFamily:FONT_DISPLAY }}>Choose your charity</h3>
            <p style={{ fontSize:14, color:M, margin:"0 0 16px", lineHeight:1.5, fontFamily:FONT_BODY }}>Pick which partner gets your farts.</p>
            <select value={charity} onChange={(e)=>changeCharity(e.target.value)} style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:"2px solid "+G2, fontSize:15, fontWeight:600, color:D, background:W, cursor:"pointer", fontFamily:FONT_BODY }}>
              {CHARITIES.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.desc}</option>)}
            </select>
          </div>
          {/* Card B */}
          <div style={{ background:O50, borderRadius:12, padding:24 }}>
            <h3 style={{ fontSize:20, fontWeight:800, fontStyle:"italic", color:B90, margin:"0 0 12px", fontFamily:FONT_DISPLAY }}>Today's impact</h3>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:M, marginBottom:8, fontFamily:FONT_BODY }}>
              <span>${todayStr}</span>
              <span>Daily cap: ${CAP}</span>
            </div>
            <div style={{ height:12, borderRadius:6, background:G2, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:6, background:"linear-gradient(90deg,"+B90+","+L80+")", width:cl(todayD/CAP*100,0,100)+"%", transition:"width .3s" }}/>
            </div>
            {capped && <p style={{ margin:"10px 0 0", fontSize:13, color:B90, fontWeight:700, fontFamily:FONT_TEXT }}>Cap reached! Come back tomorrow.</p>}
            <div style={{ textAlign:"center", marginTop:16 }}>
              <button onClick={()=>setShowMore(true)} style={{ background:L70, color:D, padding:"10px 24px", borderRadius:100, fontSize:14, fontWeight:700, cursor:"pointer", border:"none", fontFamily:FONT_TEXT }}>More info</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop:"1px solid "+G2, padding:"32px 24px", textAlign:"center" }}>
        <a href="https://whogivesacrap.org" target="_blank" rel="noopener noreferrer" aria-label="Who Gives A Crap">
          <Logo style={{ width:50, height:"auto", margin:"0 auto 16px", display:"block" }}/>
        </a>
        <p style={{ fontSize:13, color:G5, lineHeight:1.7, maxWidth:480, margin:"0 auto", fontFamily:FONT_BODY }}>
          <strong style={{ color:B90 }}>Fart for Good</strong>{" is a project by Who Gives A Crap — the toilet paper company that donates 50% of profits to help everyone gain access to clean water and a toilet."}
        </p>
        <p style={{ fontSize:13, color:G5, lineHeight:1.7, maxWidth:480, margin:"8px auto 0", fontFamily:FONT_BODY }}>
          {"Well, actually, it's not yet a real Who Gives A Crap project — it's just a random experiment by some guy who works at Who Gives A Crap."}
        </p>
        <p style={{ fontSize:11, color:G5, marginTop:12, opacity:.5, fontFamily:FONT_BODY }}>We can't believe we built this either.</p>
        <p style={{ fontSize:11, color:G5, marginTop:8, opacity:.4, fontFamily:FONT_BODY }}>This is currently a prototype. No real donations are being made yet.</p>
      </footer>
    </div>
  );
}
