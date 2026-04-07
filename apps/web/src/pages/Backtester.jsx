import { useState, useMemo } from "react";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateData(seed, base, vol, label) {
  const rand = mulberry32(seed);
  const phases = [
    { s: 0,   e: 40,  d:  0.0004, v: 0.9 },
    { s: 40,  e: 80,  d:  0.0008, v: 1.4 },
    { s: 80,  e: 120, d:  0.0002, v: 1.1 },
    { s: 120, e: 160, d: -0.0006, v: 1.8 },
    { s: 160, e: 200, d: -0.0003, v: 1.5 },
    { s: 200, e: 252, d:  0.0001, v: 1.2 },
  ];
  const data = []; let price = base;
  const baseVol = label === "BANKNIFTY" ? 800000 : label === "SENSEX" ? 120000 : 350000;
  for (let i = 0; i < 252; i++) {
    const ph = phases.find(p => i >= p.s && i < p.e) || phases[0];
    const v2 = vol * ph.v;
    const daily = (rand() - 0.5) * 2 * v2 + ph.d;
    const open = price, close = price * (1 + daily);
    const er = v2 * (0.5 + rand() * 1.0);
    const high = Math.max(open, close) * (1 + er);
    const low  = Math.min(open, close) * (1 - er * 0.8);
    const vs = Math.abs(daily) > v2 ? (1.5 + rand() * 2) : (0.6 + rand() * 0.8);
    const dt = new Date("2024-04-01");
    dt.setDate(dt.getDate() + i + Math.floor(i / 5) * 2);
    data.push({ date: dt.toISOString().slice(0,10), open: +open.toFixed(2),
      high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2),
      volume: Math.round(baseVol * vs), idx: i });
    price = close;
  }
  return data;
}

function calcATR(data, p = 200) {
  const a = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(data[i].high - data[i].low,
      Math.abs(data[i].high - data[i-1].close), Math.abs(data[i].low - data[i-1].close));
    a[i] = i < p ? tr : (a[i-1] * (p-1) + tr) / p;
  }
  return a;
}
function calcVolSMA(data, p = 50) {
  return data.map((_, i) => {
    if (i < p) return data[i].volume;
    return data.slice(i-p, i).reduce((s, d) => s + d.volume, 0) / p;
  });
}
function calcEMA(data, p) {
  const k = 2/(p+1); const e = [data[0].close];
  for (let i = 1; i < data.length; i++) e.push(data[i].close * k + e[i-1] * (1-k));
  return e;
}
function calcRSI(data, p = 14) {
  const rsi = new Array(data.length).fill(50);
  let gains = 0, losses = 0;
  for (let i = 1; i <= p; i++) {
    const d = data[i].close - data[i-1].close;
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains/p, al = losses/p;
  rsi[p] = al === 0 ? 100 : 100 - 100/(1 + ag/al);
  for (let i = p+1; i < data.length; i++) {
    const d = data[i].close - data[i-1].close;
    ag = (ag * (p-1) + Math.max(d,0)) / p;
    al = (al * (p-1) + Math.max(-d,0)) / p;
    rsi[i] = al === 0 ? 100 : 100 - 100/(1 + ag/al);
  }
  return rsi;
}

function runV1(data) {
  const P = { consec: 3, lookback: 6, volMult: 1.0, volSMALen: 50,
    atrMult: 1.5, maxZones: 8, cooldown: 10, maxTouches: 4,
    minScore: 40, sigCooldown: 5 };
  return runEngine(data, P, false);
}

function runV2(data, filterSet) {
  const P = { consec: 3, lookback: 8, volMult: 1.3, volSMALen: 50,
    atrMult: 1.2, maxZones: 5, cooldown: 15, maxTouches: 1,
    minScore: 65, sigCooldown: 8,
    useBOS: filterSet.includes("BOS"),
    useRSI: filterSet.includes("RSI"),
    useCandle: filterSet.includes("CANDLE"),
    useMTF: filterSet.includes("MTF"),
    useSweep: filterSet.includes("SWEEP"),
    useRR: filterSet.includes("RR"),
    minRR: 1.5 };
  return runEngine(data, P, true);
}

function runEngine(data, P) {
  const atrs    = calcATR(data, 200);
  const volSMAs = calcVolSMA(data, P.volSMALen);
  const emaS    = calcEMA(data, 200);
  const rsis    = calcRSI(data, 14);
  const weeklyEmaF = calcEMA(data.filter((_, i) => i % 5 === 0), 21);
  const weeklyEmaS = calcEMA(data.filter((_, i) => i % 5 === 0), 50);
  const supplyZ = [], demandZ = [];
  const signals = [];
  let lastSup = -999, lastDem = -999, lastBull = -999, lastBear = -999;
  let bullStruct = true;

  for (let i = Math.max(P.lookback + P.consec + 5, 200); i < data.length; i++) {
    const atr = atrs[i], vSMA = volSMAs[i], bar = data[i];
    const bull = j => data[j].close > data[j].open;
    const bear = j => data[j].close < data[j].open;
    const eVol = j => data[j].volume > vSMA * P.volMult;
    const sH20 = Math.max(...data.slice(Math.max(0,i-20),i).map(d=>d.high));
    const sL20 = Math.min(...data.slice(Math.max(0,i-20),i).map(d=>d.low));
    if (bar.close > sH20) bullStruct = true;
    if (bar.close < sL20) bullStruct = false;

    let supConsec = true;
    for (let j = 0; j < P.consec; j++) if (!bear(i-j)) { supConsec = false; break; }
    if (supConsec && eVol(i-1) && i - lastSup >= P.cooldown) {
      for (let k = P.consec; k <= P.consec + P.lookback; k++) {
        if (i-k >= 0 && bull(i-k)) {
          const zT = data[i-k].high + atr*0.2, zB = data[i-k].low;
          const vR = data[i-k].volume / vSMA;
          const dV = Math.abs(bar.close - data[i-k].high) / atr;
          if (!supplyZ.some(z=>!z.broken && zT>=z.bot && zB<=z.top) && supplyZ.filter(z=>!z.broken).length < P.maxZones) {
            supplyZ.push({ top:zT, bot:zB, birth:i, touches:0, vR, dV, broken:false, swept:false });
            lastSup = i;
          }
          break;
        }
      }
    }
    let demConsec = true;
    for (let j = 0; j < P.consec; j++) if (!bull(i-j)) { demConsec = false; break; }
    if (demConsec && eVol(i-1) && i - lastDem >= P.cooldown) {
      for (let k = P.consec; k <= P.consec + P.lookback; k++) {
        if (i-k >= 0 && bear(i-k)) {
          const zT = data[i-k].high, zB = data[i-k].low - atr*0.2;
          const vR = data[i-k].volume / vSMA;
          const dV = Math.abs(bar.close - data[i-k].low) / atr;
          if (!demandZ.some(z=>!z.broken && zT>=z.bot && zB<=z.top) && demandZ.filter(z=>!z.broken).length < P.maxZones) {
            demandZ.push({ top:zT, bot:zB, birth:i, touches:0, vR, dV, broken:false, swept:false });
            lastDem = i;
          }
          break;
        }
      }
    }

    const strength = (z, isBull) => {
      let s = z.touches===0?30:z.touches===1?18:z.touches===2?8:2;
      const vr = z.vR;
      s += vr>3?20:vr>2?16:vr>1.5?12:vr>1?7:3;
      const dv = z.dV;
      s += dv>3?20:dv>2?15:dv>1?10:dv>0.5?5:2;
      const age = i - z.birth;
      s += age<20?15:age<50?12:age<100?8:age<200?4:1;
      if (isBull) s += bar.close < emaS[i] ? 10 : 6;
      else        s += bar.close > emaS[i] ? 10 : 6;
      if (z.swept) s += 10;
      return Math.min(100, Math.max(0, s));
    };

    let demTouch=false, supTouch=false, demSweep=false, supSweep=false;
    let bestDem=0, bestSup=0, nearSupBot=Infinity, nearDemTop=-Infinity;

    for (const z of supplyZ.filter(z=>!z.broken)) {
      if (bar.high > z.top && bar.close < z.top && !z.swept) { z.swept=true; supSweep=true; }
      if (bar.close > z.top) { z.broken=true; continue; }
      if (bar.high >= z.bot && bar.high <= z.top && bar.close < z.top && data[i-1]?.close < z.bot) { z.touches++; supTouch=true; }
      const sc = strength(z, false);
      if (sc > bestSup) bestSup = sc;
      if (z.bot < nearSupBot) nearSupBot = z.bot;
    }
    for (const z of demandZ.filter(z=>!z.broken)) {
      if (bar.low < z.bot && bar.close > z.bot && !z.swept) { z.swept=true; demSweep=true; }
      if (bar.close < z.bot) { z.broken=true; continue; }
      if (bar.low <= z.top && bar.low >= z.bot && bar.close > z.bot && data[i-1]?.close > z.top) { z.touches++; demTouch=true; }
      const sc = strength(z, true);
      if (sc > bestDem) bestDem = sc;
      if (z.top > nearDemTop) nearDemTop = z.top;
    }

    const body = Math.abs(bar.close - bar.open);
    const lWick = Math.min(bar.open, bar.close) - bar.low;
    const uWick = bar.high - Math.max(bar.open, bar.close);
    const mid = (bar.high + bar.low) / 2;
    const isHammer = lWick >= body * 2 && bar.close > mid && body > 0;
    const isBullEngulf = bull(i) && bear(i-1) && bar.open <= data[i-1].close && bar.close >= data[i-1].open;
    const isShoot = uWick >= body * 2 && bar.close < mid && body > 0;
    const isBearEngulf = bear(i) && bull(i-1) && bar.open >= data[i-1].close && bar.close <= data[i-1].open;
    const rsi5Lo = Math.min(...rsis.slice(Math.max(0,i-5),i));
    const price5Lo = Math.min(...data.slice(Math.max(0,i-5),i).map(d=>d.low));
    const bullDiv = bar.low < price5Lo && rsis[i] > rsi5Lo;
    const wk = Math.floor(i / 5);
    const wBull = wk < weeklyEmaF.length && wk < weeklyEmaS.length ? weeklyEmaF[wk] > weeklyEmaS[wk] : true;

    let rrBull=true, rrBear=true;
    if (P.useRR) {
      if (nearSupBot < Infinity && nearDemTop > -Infinity) {
        const stopB = atr * 1.5;
        rrBull = stopB > 0 ? (nearSupBot - bar.close) / stopB >= P.minRR : true;
        rrBear = stopB > 0 ? (bar.close - nearDemTop) / stopB >= P.minRR : true;
      }
    }

    const filters_bull = {
      base: demTouch && bull(i) && bestDem >= P.minScore,
      bos:  !P.useBOS    || bullStruct,
      rsi:  !P.useRSI    || rsis[i] < 45 || bullDiv,
      candle:!P.useCandle|| isHammer || isBullEngulf,
      mtf:  !P.useMTF    || wBull,
      sweep:!P.useSweep  || demSweep,
      rr:   rrBull,
      cool: i - lastBull >= P.sigCooldown,
    };
    const filters_bear = {
      base: supTouch && bear(i) && bestSup >= P.minScore,
      bos:  !P.useBOS    || !bullStruct,
      rsi:  !P.useRSI    || rsis[i] > 55,
      candle:!P.useCandle|| isShoot || isBearEngulf,
      mtf:  !P.useMTF    || !wBull,
      sweep:!P.useSweep  || supSweep,
      rr:   rrBear,
      cool: i - lastBear >= P.sigCooldown,
    };

    const simulate = (isBull2) => {
      const entry = bar.close;
      const stopD = atr * 1.5;
      const sl = isBull2 ? entry - stopD : entry + stopD;
      const tp = isBull2 ? (nearSupBot < Infinity ? nearSupBot : entry + stopD*2)
                         : (nearDemTop > -Infinity ? nearDemTop : entry - stopD*2);
      let outcome = "OPEN", pnl = 0;
      for (let f = 1; f <= Math.min(20, data.length - i - 1); f++) {
        const fd = data[i + f];
        if (isBull2) {
          if (fd.low <= sl)  { outcome="LOSS"; pnl=-1; break; }
          if (fd.high >= tp) { outcome="WIN";  pnl=(tp-entry)/stopD; break; }
        } else {
          if (fd.high >= sl) { outcome="LOSS"; pnl=-1; break; }
          if (fd.low <= tp)  { outcome="WIN";  pnl=(entry-tp)/stopD; break; }
        }
        if (f === Math.min(20, data.length - i - 1)) {
          const ep = isBull2 ? (fd.close-entry)/stopD : (entry-fd.close)/stopD;
          outcome = ep > 0 ? "WIN" : "LOSS"; pnl = +ep.toFixed(2);
        }
      }
      return { outcome, pnl: +pnl.toFixed(2) };
    };

    if (Object.values(filters_bull).every(Boolean)) {
      lastBull = i;
      const tier = bestDem>=75?"S":bestDem>=55?"A":"B";
      signals.push({ i, date:bar.date, type:"DEMAND", tier, score:bestDem,
        entry:bar.close, rsi:rsis[i], bosOK:bullStruct, candleOK:isHammer||isBullEngulf,
        mtfOK:wBull, sweepOK:!P.useSweep||demSweep, bullDiv, ...simulate(true) });
    }
    if (Object.values(filters_bear).every(Boolean)) {
      lastBear = i;
      const tier = bestSup>=75?"S":bestSup>=55?"A":"B";
      signals.push({ i, date:bar.date, type:"SUPPLY", tier, score:bestSup,
        entry:bar.close, rsi:rsis[i], bosOK:!bullStruct, candleOK:isShoot||isBearEngulf,
        mtfOK:!wBull, sweepOK:!P.useSweep||supSweep, ...simulate(false) });
    }
  }

  const closed = signals.filter(s=>s.outcome!=="OPEN");
  const wins   = closed.filter(s=>s.outcome==="WIN");
  const wr     = closed.length ? wins.length/closed.length*100 : 0;
  const totalR = closed.reduce((a,s)=>a+s.pnl,0);
  const avgW   = wins.length ? wins.reduce((a,s)=>a+s.pnl,0)/wins.length : 0;
  const losses = closed.filter(s=>s.outcome==="LOSS");
  const avgL   = losses.length ? losses.reduce((a,s)=>a+s.pnl,0)/losses.length : 0;
  const pf     = avgL!==0 ? Math.abs(avgW/avgL) : 99;
  let eq=0; const equity=[0];
  for (const s of closed) { eq+=s.pnl; equity.push(+eq.toFixed(2)); }
  let peak=0, maxDD=0;
  for (const e of equity) { if(e>peak)peak=e; if(peak-e>maxDD)maxDD=peak-e; }
  const byTier = {S:{w:0,l:0},A:{w:0,l:0},B:{w:0,l:0}};
  for (const s of closed) {
    if(byTier[s.tier]) s.outcome==="WIN"?byTier[s.tier].w++:byTier[s.tier].l++;
  }
  return { signals, closed, wins, losses, wr, totalR, avgW, avgL, pf, equity, maxDD, byTier };
}

const INDICES = [
  { key:"NIFTY50",   seed:42,  base:22000, vol:0.010, label:"NIFTY 50" },
  { key:"BANKNIFTY", seed:137, base:47000, vol:0.013, label:"BANK NIFTY" },
  { key:"SENSEX",    seed:999, base:73000, vol:0.009, label:"SENSEX" },
];

const FILTER_LAYERS = [
  { id:"BASE",   label:"V1 Original",          filters:[],                                        color:"#555555" },
  { id:"BOS",    label:"+ BOS Direction",       filters:["BOS"],                                   color:"#ff9800" },
  { id:"RSI",    label:"+ RSI Confirm",         filters:["BOS","RSI"],                             color:"#64b5f6" },
  { id:"CANDLE", label:"+ Candle Pattern",      filters:["BOS","RSI","CANDLE"],                    color:"#ab47bc" },
  { id:"MTF",    label:"+ Weekly MTF",          filters:["BOS","RSI","CANDLE","MTF"],              color:"#4caf50" },
  { id:"RR",     label:"+ Min R:R 1.5",         filters:["BOS","RSI","CANDLE","MTF","RR"],         color:"#ffd700" },
  { id:"SWEEP",  label:"+ Liquidity Sweep ⚡",  filters:["BOS","RSI","CANDLE","MTF","RR","SWEEP"], color:"#c8e624" },
];

function Sparkline({ data, color, w=400, h=50 }) {
  if (!data || data.length < 2) return null;
  const mn=Math.min(...data), mx=Math.max(...data), range=mx-mn||1;
  const pts = data.map((v,i) => `${((i/(data.length-1))*w).toFixed(1)},${(h-((v-mn)/range)*h).toFixed(1)}`).join(" ");
  const zeroY = h - ((0-mn)/range)*h;
  return (
    <svg width={w} height={h} style={{display:"block",width:"100%"}}>
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#333" strokeWidth="0.5" strokeDasharray="3,3"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Backtester() {
  const [activeIdx, setActiveIdx] = useState("NIFTY50");
  const [showAll, setShowAll] = useState(false);

  const allData = useMemo(() => {
    const r = {};
    for (const cfg of INDICES) r[cfg.key] = generateData(cfg.seed, cfg.base, cfg.vol, cfg.key);
    return r;
  }, []);

  const results = useMemo(() => {
    const r = {};
    for (const cfg of INDICES) {
      r[cfg.key] = {};
      for (const layer of FILTER_LAYERS) {
        r[cfg.key][layer.id] = layer.id === "BASE"
          ? runV1(allData[cfg.key])
          : runV2(allData[cfg.key], layer.filters);
      }
    }
    return r;
  }, [allData]);

  const idxResults = results[activeIdx];
  const v1 = idxResults["BASE"];
  const v2 = idxResults["SWEEP"];
  const idx = INDICES.find(c=>c.key===activeIdx);

  const summaryRows = INDICES.map(cfg => ({
    label: cfg.label,
    v1: results[cfg.key]["BASE"],
    v2: results[cfg.key]["SWEEP"],
  }));

  return (
    <div style={{ fontFamily: 'var(--font-mono)', color: '#bbb', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#c8e624', color: '#111', fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 4, letterSpacing: 2 }}>ALPHAX OB</div>
        <h1 style={{ margin: 0, fontSize: 22, color: '#fff', fontWeight: 900 }}>V1 vs V2 — Backtest Results</h1>
      </div>
      <div style={{ color: '#444', fontSize: 11, marginBottom: 24, letterSpacing: 1 }}>
        NIFTY 50 · BANK NIFTY · SENSEX · APR 2024–APR 2025 · DAILY · FILTER-BY-FILTER BREAKDOWN
      </div>

      {/* Summary scoreboard */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 12 }}>OVERALL SCOREBOARD — ALL 3 INDICES</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {["INDEX","V1 SIGNALS","V1 WIN%","V1 TOTAL R","V2 SIGNALS","V2 WIN%","V2 TOTAL R","IMPROVEMENT","PROFIT FACTOR","MAX DD"].map(h=>(
                <th key={h} style={{ padding: '8px 10px', fontSize: 9, color: '#555', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #222', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(({label,v1,v2},ri)=>{
              const wrDelta = v2.wr - v1.wr;
              const wrColor = v2.wr >= 65 ? "#c8e624" : v2.wr >= 55 ? "#ffd700" : "#ff9800";
              return (
                <tr key={label} style={{ background: ri%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', color: '#c8e624', fontWeight: 700 }}>{label}</td>
                  <td style={{ padding: '8px 10px', color: '#555' }}>{v1.closed.length}</td>
                  <td style={{ padding: '8px 10px', color: '#666' }}>{v1.wr.toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px', color: v1.totalR>=0?'#666':'#ff5252' }}>{v1.totalR>=0?'+':''}{v1.totalR.toFixed(1)}R</td>
                  <td style={{ padding: '8px 10px' }}>{v2.closed.length}</td>
                  <td style={{ padding: '8px 10px', color: wrColor, fontWeight: 800, fontSize: 14 }}>{v2.wr.toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px', color: v2.totalR>=0?'#c8e624':'#ff5252', fontWeight: 700 }}>{v2.totalR>=0?'+':''}{v2.totalR.toFixed(1)}R</td>
                  <td style={{ padding: '8px 10px', color: wrDelta>0?'#c8e624':'#ff5252', fontWeight: 800 }}>{wrDelta>0?'+':''}{wrDelta.toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px', color: '#64b5f6' }}>{v2.pf>10?'10+':v2.pf.toFixed(2)}×</td>
                  <td style={{ padding: '8px 10px', color: '#ff6b6b' }}>{v2.maxDD.toFixed(1)}R</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Index tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {INDICES.map(cfg => (
          <button key={cfg.key}
            onClick={() => setActiveIdx(cfg.key)}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 1,
              background: activeIdx===cfg.key ? '#111' : 'transparent',
              borderBottom: activeIdx===cfg.key ? '2px solid #c8e624' : '2px solid transparent',
              color: activeIdx===cfg.key ? '#c8e624' : '#444' }}>
            {cfg.label}
            <span style={{ marginLeft: 6, fontSize: 9, color: activeIdx===cfg.key?'#9ab81c':'#333' }}>
              {results[cfg.key]["SWEEP"].wr.toFixed(0)}% WR v2
            </span>
          </button>
        ))}
      </div>

      {/* Filter progression */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 12 }}>FILTER-BY-FILTER WIN RATE — {idx.label}</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {FILTER_LAYERS.map((layer, li) => {
            const res = idxResults[layer.id];
            const wr = res.wr;
            const isV2Full = layer.id === "SWEEP";
            return (
              <div key={layer.id} style={{ background: isV2Full?'rgba(200,230,36,0.05)':'rgba(255,255,255,0.02)', border: `1px solid ${isV2Full?layer.color+'55':'#1a1a1a'}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px 70px 70px 90px', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ color: layer.color, fontSize: 11, fontWeight: 700 }}>{layer.label}</div>
                    <div style={{ color: '#333', fontSize: 9, marginTop: 2 }}>{layer.filters.join(' + ') || 'baseline'}</div>
                  </div>
                  <div style={{ position: 'relative', height: 28, background: '#111', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8, zIndex: 2 }}>
                      <span style={{ color: layer.color, fontSize: 13, fontWeight: 900 }}>{wr.toFixed(1)}%</span>
                      <span style={{ color: '#333', fontSize: 9, marginLeft: 6 }}>({res.closed.length} trades)</span>
                    </div>
                    <div style={{ height: '100%', width: `${Math.min(wr,100)}%`, background: `${layer.color}22` }}/>
                    <div style={{ position: 'absolute', top: 0, left: `${Math.min(wr,100)}%`, width: 2, height: '100%', background: layer.color, opacity: 0.7 }}/>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#333', fontSize: 8 }}>SIGNALS</div>
                    <div style={{ color: '#888', fontSize: 13, fontWeight: 700 }}>{res.closed.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#333', fontSize: 8 }}>TOTAL R</div>
                    <div style={{ color: res.totalR>=0?'#c8e624':'#ff5252', fontSize: 13, fontWeight: 700 }}>{res.totalR>=0?'+':''}{res.totalR.toFixed(1)}R</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#333', fontSize: 8 }}>P. FACTOR</div>
                    <div style={{ color: '#64b5f6', fontSize: 13, fontWeight: 700 }}>{res.pf>10?'10+':res.pf.toFixed(1)}×</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#333', fontSize: 8 }}>MAX DD</div>
                    <div style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 700 }}>{res.maxDD.toFixed(1)}R</div>
                  </div>
                </div>
                {li > 0 && (
                  <div style={{ marginTop: 6, fontSize: 9, color: '#333' }}>
                    vs v1: <span style={{ color: wr>v1.wr?'#c8e624':'#ff5252', fontWeight: 700 }}>{wr>v1.wr?'+':''}{(wr-v1.wr).toFixed(1)}%</span>
                    {' · '}{res.closed.length} signals vs {v1.closed.length} (v1)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* V1 vs V2 side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[{label:`V1 Original — ${idx.label}`, res:v1, color:'#555'}, {label:`V2 Elite — ${idx.label}`, res:v2, color:'#c8e624'}].map(({label, res, color}) => (
          <div key={label} style={{ background: 'var(--color-card)', border: `1px solid ${color}33`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color, letterSpacing: 2, marginBottom: 12 }}>{label.toUpperCase()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                ["Win Rate", `${res.wr.toFixed(1)}%`, res.wr>=65?'#c8e624':res.wr>=50?'#ffd700':'#ff9800'],
                ["Signals",  res.closed.length, '#888'],
                ["Total R",  `${res.totalR>=0?'+':''}${res.totalR.toFixed(1)}R`, res.totalR>=0?color:'#ff5252'],
                ["Max DD",   `${res.maxDD.toFixed(1)}R`, '#ff6b6b'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ color: '#444', fontSize: 9, marginBottom: 3 }}>{l}</div>
                  <div style={{ color: c, fontSize: 18, fontWeight: 800 }}>{v}</div>
                </div>
              ))}
            </div>
            <Sparkline data={res.equity} color={res.totalR>=0?color:'#ff5252'} />
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
              {["S","A","B"].map(t => {
                const {w,l} = res.byTier[t]; const tot=w+l;
                return (
                  <div key={t} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#444', fontSize: 8 }}>TIER {t}</div>
                    <div style={{ color: t==='S'?'#ffd700':t==='A'?'#c8e624':'#64b5f6', fontSize: 13, fontWeight: 700 }}>{tot?((w/tot)*100).toFixed(0):'-'}%</div>
                    <div style={{ color: '#333', fontSize: 8 }}>{w}W/{l}L</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Signal log */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>V2 SIGNAL LOG — {idx.label} ({v2.closed.length} trades)</span>
          <button onClick={() => setShowAll(x=>!x)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #333', background: 'transparent', color: '#555', fontSize: 10, cursor: 'pointer' }}>
            {showAll ? 'SHOW LESS' : 'SHOW ALL'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {["DATE","TYPE","TIER","SCORE","RSI","BOS","CANDLE","MTF","SWEEP","RESULT","P&L"].map(h=>(
                  <th key={h} style={{ padding: '8px 10px', fontSize: 9, color: '#555', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #222', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(showAll ? v2.closed : v2.closed.slice(0,25)).map((s,i) => {
                const tick = v => v ? <span style={{color:'#c8e624'}}>✓</span> : <span style={{color:'#333'}}>✗</span>;
                return (
                  <tr key={i} style={{ background: i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                    <td style={{ padding: '7px 10px', color: '#555', fontSize: 10 }}>{s.date}</td>
                    <td style={{ padding: '7px 10px', color: s.type==="DEMAND"?'#c8e624':'#ff1744', fontWeight: 700 }}>{s.type==="DEMAND"?"▲ DEM":"▼ SUP"}</td>
                    <td style={{ padding: '7px 10px', color: s.tier==="S"?'#ffd700':s.tier==="A"?'#c8e624':'#64b5f6', fontWeight: 700 }}>{s.tier}</td>
                    <td style={{ padding: '7px 10px', color: '#777' }}>{s.score?.toFixed(0)||'-'}</td>
                    <td style={{ padding: '7px 10px', color: s.rsi<45?'#c8e624':s.rsi>55?'#ff5252':'#888', fontSize: 10 }}>{s.rsi?.toFixed(0)||'-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{tick(s.bosOK)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{tick(s.candleOK)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{tick(s.mtfOK)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{tick(s.sweepOK)}</td>
                    <td style={{ padding: '7px 10px', color: s.outcome==="WIN"?'#c8e624':'#ff1744', fontWeight: 700 }}>{s.outcome}</td>
                    <td style={{ padding: '7px 10px', color: s.pnl>=0?'#c8e624':'#ff5252', fontWeight: 700 }}>{s.pnl>=0?'+':''}{s.pnl?.toFixed(2)||'-'}R</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!showAll && v2.closed.length > 25 && (
            <div style={{ color: '#333', fontSize: 10, textAlign: 'center', padding: 10 }}>
              +{v2.closed.length-25} more — click SHOW ALL
            </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 12, marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#222', fontSize: 9, letterSpacing: 2 }}>ALPHAX OB v2 · SYNTHETIC DATA MODELED ON NSE 2024–25</span>
        <span style={{ color: '#222', fontSize: 9 }}>⚠ INDICATIVE ONLY — BACKTEST ≠ LIVE TRADING</span>
      </div>
    </div>
  );
}
