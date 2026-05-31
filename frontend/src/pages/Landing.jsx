import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const HERO_STOCKS = [
    { ticker: "RELIANCE", name: "RELIANCE IND.", basePrice: 2934.50, change: "+1.24%", changeColor: "text-[#007552]", verdict: "Strong accumulation detected in the last 45 minutes. Options chain suggests resistance at 3000." },
    { ticker: "INFY", name: "INFOSYS LTD.", basePrice: 1495.65, change: "+0.85%", changeColor: "text-[#007552]", verdict: "Volume breakout. RSI crossing 60 indicates bullish momentum building." },
    { ticker: "TCS", name: "TATA CONS. SVC.", basePrice: 3980.00, change: "-0.45%", changeColor: "text-[#ba1a1a]", verdict: "Profit booking seen at higher levels. Support holding strong at 3950." },
    { ticker: "HDFCBANK", name: "HDFC BANK", basePrice: 1450.20, change: "+2.10%", changeColor: "text-[#007552]", verdict: "Institutional buying spotted. MACD divergence signals trend reversal." }
  ];

  const [currentStockIndex, setCurrentStockIndex] = useState(0);
  const currentStock = HERO_STOCKS[currentStockIndex];

  // Hero Card Mockup Price count-up
  const [heroPrice, setHeroPrice] = useState(0);
  // Chart animation draw offset
  const [chartOffset, setChartOffset] = useState(1000);

  // Pipeline Animation State Machine
  const [isPipelineVisible, setIsPipelineVisible] = useState(false);
  const pipelineRef = useRef(null);

  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 (idle), 1, 2, 3, 4, 5
  const [pipelineQueryText, setPipelineQueryText] = useState("");
  const [pipelineChipsActive, setPipelineChipsActive] = useState([false, false, false, false, false, false, false]); // NSE, BSE, SCR, ET, MC, ST, TR
  const [pipelinePrice, setPipelinePrice] = useState("₹2,847.50");
  const [pipelineScoreWidth, setPipelineScoreWidth] = useState("0%");
  const [pipelineGrokStatus, setPipelineGrokStatus] = useState("Arbitrage · Predict");
  const [pipelineDecision, setPipelineDecision] = useState(""); // "", "avoid", "wait", "buy"
  const [pipelineLatency, setPipelineLatency] = useState(3.2);

  // Timer reference for cleanup
  const timelineTimers = useRef([]);

  // Rotate stocks in hero section
  useEffect(() => {
    const rotateTimer = setInterval(() => {
      setCurrentStockIndex((prev) => (prev + 1) % HERO_STOCKS.length);
    }, 5000);
    return () => clearInterval(rotateTimer);
  }, []);

  // Hero section animations on mount and on stock change
  useEffect(() => {
    const duration = 1200; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    const targetPrice = currentStock.basePrice;
    const increment = targetPrice / totalFrames;
    let frame = 0;

    // reset chart
    setChartOffset(1000);

    const priceTimer = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setHeroPrice(targetPrice);
        clearInterval(priceTimer);
      } else {
        setHeroPrice((prev) => {
          // If previous price is way off (new stock), jump to 80% to make animation look good
          if (Math.abs(prev - targetPrice) > targetPrice * 0.5) {
            return targetPrice * 0.8;
          }
          return Math.min(targetPrice, prev + increment);
        });
      }
    }, frameRate);

    // 2. Animate the SVG chart line draw-in
    const chartTimer = setTimeout(() => {
      setChartOffset(0);
    }, 400);

    return () => {
      clearInterval(priceTimer);
      clearTimeout(chartTimer);
    };
  }, [currentStockIndex]);

  // Observer for pipeline section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPipelineVisible) {
          setIsPipelineVisible(true);
          triggerPipelineRun(true);
        }
      },
      { threshold: 0.6 }
    );
    if (pipelineRef.current) {
      observer.observe(pipelineRef.current);
    }
    return () => {
      if (pipelineRef.current) observer.unobserve(pipelineRef.current);
    };
  }, [isPipelineVisible]);

  // Pipeline random price fluctuations
  useEffect(() => {
    if (!isPipelineVisible) return;
    const fluctuate = setInterval(() => {
      setPipelinePrice(prev => {
        const current = parseFloat(prev.replace(/[^0-9.-]+/g,""));
        const change = current * (Math.random() * 0.01 - 0.005);
        return "₹" + (current + change).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      });
      // Small flash effect via DOM (bypassing React state for perf)
      const priceEl = document.getElementById("pipeline-price-display");
      if (priceEl) {
        priceEl.style.color = "#6C3FF5";
        setTimeout(() => priceEl.style.color = "", 200);
      }
    }, 3000);
    return () => clearInterval(fluctuate);
  }, [isPipelineVisible]);

  // Pipeline latency fluctuations
  useEffect(() => {
    if (!isPipelineVisible) return;
    const fluctuate = setInterval(() => {
      setPipelineLatency((2.8 + Math.random() * 0.8).toFixed(1));
    }, 4000);
    return () => clearInterval(fluctuate);
  }, [isPipelineVisible]);

  // Run search redirect
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/stock/${searchQuery.trim().toUpperCase()}`);
    } else {
      navigate("/analyse");
    }
  };

  // Orcherstrate the pipeline animation steps
  const triggerPipelineRun = (autoRun = false) => {
    if (isPipelineRunning) return;

    // Clear any previous timers
    timelineTimers.current.forEach(t => clearTimeout(t));
    timelineTimers.current = [];

    // Reset all states to beginning
    setIsPipelineRunning(true);
    setPipelineStep(1);
    setPipelineQueryText("");
    setPipelineChipsActive([false, false, false, false, false, false, false]);
    setPipelineScoreWidth("0%");
    setPipelineDecision("");

    // Timeline configuration
    const queries = ["RELIANCE", "INFY", "TATAMOTORS"];
    const queryStr = queries[Math.floor(Math.random() * queries.length)];

    // Step 1: Type "RELIANCE"
    for (let i = 0; i <= queryStr.length; i++) {
      const charTimer = setTimeout(() => {
        setPipelineQueryText(queryStr.substring(0, i));
      }, i * 80); // types over 80ms per char
      timelineTimers.current.push(charTimer);
    }

    const typeDuration = queryStr.length * 80;

    // Step 2: Anakin Wire
    const step2Timer = setTimeout(() => {
      setPipelineStep(2);
      // light up chips one by one
      [0, 1, 2, 3, 4, 5, 6].forEach((index) => {
        const chipTimer = setTimeout(() => {
          setPipelineChipsActive((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
          // Flash off
          setTimeout(() => {
            setPipelineChipsActive((prev) => {
              const next = [...prev];
              next[index] = false;
              return next;
            });
          }, 300);
        }, index * 40);
        timelineTimers.current.push(chipTimer);
      });
    }, typeDuration + 200);
    timelineTimers.current.push(step2Timer);

    // Step 3: Structured Data
    const step3Timer = setTimeout(() => {
      setPipelineStep(3);
      setPipelineScoreWidth("92%");
    }, typeDuration + 800);
    timelineTimers.current.push(step3Timer);

    // Step 4: Grok + Gemini AI
    const step4Timer = setTimeout(() => {
      setPipelineStep(4);
    }, typeDuration + 1400);
    timelineTimers.current.push(step4Timer);

    // Step 5: Your Decision
    const step5Timer = setTimeout(() => {
      setPipelineStep(5);
      setPipelineDecision("buy");
    }, typeDuration + 2200);
    timelineTimers.current.push(step5Timer);

    // End/Reset running state
    const endTimer = setTimeout(() => {
      setIsPipelineRunning(false);
      setPipelineDecision("buy-pulse");
    }, typeDuration + 3700);
    timelineTimers.current.push(endTimer);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timelineTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="bg-[#fcf9f8] text-[#1c1b1b] font-body-md text-body-md antialiased overflow-x-hidden select-none">

      {/* 1. Live Ticker Bar (Top) */}
      <div className="fixed top-0 left-0 w-full h-[40px] bg-purple-night z-50 overflow-hidden flex items-center shadow-md font-data-mono text-data-mono">
        <div className="absolute inset-0 w-1/4 bg-gradient-to-r from-white/10 to-transparent opacity-20 animate-scanline pointer-events-none"></div>
        <div className="flex whitespace-nowrap animate-marquee items-center text-[#e9e1ff] gap-16">
          <div className="flex items-center gap-8 px-4">
            <span className="flex items-center gap-2">
              <span className="text-white/70">NIFTY 50</span>
              <span className="text-[#63fcc0]">22,453.30</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">SENSEX</span>
              <span className="text-[#63fcc0]">73,903.91</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">RELIANCE</span>
              <span className="text-[#ffdad6]">2,934.50</span>
              <span className="material-symbols-outlined text-[16px] text-[#ffdad6]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">HDFCBANK</span>
              <span className="text-[#63fcc0]">1,450.20</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">TCS</span>
              <span className="text-[#ffdad6]">3,980.00</span>
              <span className="material-symbols-outlined text-[16px] text-[#ffdad6]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">INFY</span>
              <span className="text-[#63fcc0]">1,495.65</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
          </div>
          <div className="flex items-center gap-8 px-4">
            <span className="flex items-center gap-2">
              <span className="text-white/70">NIFTY 50</span>
              <span className="text-[#63fcc0]">22,453.30</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">SENSEX</span>
              <span className="text-[#63fcc0]">73,903.91</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">RELIANCE</span>
              <span className="text-[#ffdad6]">2,934.50</span>
              <span className="material-symbols-outlined text-[16px] text-[#ffdad6]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">HDFCBANK</span>
              <span className="text-[#63fcc0]">1,450.20</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">TCS</span>
              <span className="text-[#ffdad6]">3,980.00</span>
              <span className="material-symbols-outlined text-[16px] text-[#ffdad6]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-white/70">INFY</span>
              <span className="text-[#63fcc0]">1,495.65</span>
              <span className="material-symbols-outlined text-[16px] text-[#63fcc0]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Navbar */}
      <nav className="fixed top-[40px] left-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-[#cac3d9]/30 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center w-full px-8 h-[72px] max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#0d0d0d] tracking-tight font-title-md">ZeroOne</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-[#5317dd] font-bold border-b-2 border-[#5317dd] pb-1 font-label-caps text-[11px] tracking-widest" href="#">Home</a>
            <a className="text-[#484456] hover:text-[#5317dd] transition-colors duration-300 font-label-caps text-[11px] tracking-widest" href="#features">Features</a>
            <a className="text-[#484456] hover:text-[#5317dd] transition-colors duration-300 font-label-caps text-[11px] tracking-widest" href="#how-it-works">How it works</a>
          </div>
          <div className="flex items-center gap-4">
            <a
              className="hidden md:block font-label-caps text-xs tracking-wider text-[#484456] hover:text-[#5317dd] transition-colors font-semibold"
              href="#/analyse"
            >
              Login
            </a>
            <button
              onClick={() => navigate("/analyse")}
              className="bg-[#5317dd] text-white px-6 py-2.5 rounded font-label-caps text-xs tracking-wider btn-shimmer hover:opacity-90 transition-all shadow-md font-bold"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <header className="relative min-h-[920px] pt-[150px] pb-16 flex items-center justify-center overflow-hidden bg-white text-[#0d0d0d]">
        <div className="hero-bg-fx"></div>
        <div className="max-w-[1440px] mx-auto px-8 w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8 text-left">
            <h1 className="font-display-hero text-display-hero tracking-tight text-charcoal headline-reveal md:text-7xl md:leading-[1.1] flex flex-col gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {"The market speaks.".split(" ").map((word, i) => (
                  <span key={`w1-${i}`} className="overflow-hidden inline-flex pb-2">
                    <span className="inline-block animate-mask-up" style={{ animationDelay: `${i * 0.15}s`, transform: 'translateY(120%) rotate(4deg)' }}>
                      {word}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {"We translate.".split(" ").map((word, i) => (
                  <span key={`w2-${i}`} className="overflow-hidden inline-flex pb-2">
                    <span className="inline-block text-primary animate-mask-up" style={{ animationDelay: `${0.45 + i * 0.15}s`, transform: 'translateY(120%) rotate(4deg)' }}>
                      {word}
                    </span>
                  </span>
                ))}
              </div>
            </h1>
            <p className="font-body-md text-lg text-[#484456] mt-6 leading-relaxed max-w-xl animate-fade-up" style={{animationDelay: '0.8s', opacity: 0}}>
              Real-time NSE data fused with institutional-grade AI analysis. Stop reading noise, start reading signals.
            </p>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-up" style={{animationDelay: '1s', opacity: 0}}>
              <div className="relative group flex-grow max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#797487]">search</span>
                </div>
                <input
                  type="text"
                  placeholder="Search a stock (e.g., RELIANCE)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#cac3d9] text-[#0d0d0d] placeholder-[#0d0d0d]/50 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-[#5317dd] focus:ring-1 focus:ring-[#5317dd] transition-all shadow-sm font-data-mono text-sm"
                />
              </div>
              <button
                type="submit"
                className="bg-[#5317dd] text-white px-8 py-3 rounded-lg font-label-caps text-xs tracking-wider btn-shimmer hover:bg-[#5317dd]/90 transition-colors shadow-md font-bold uppercase"
              >
                Analyze
              </button>
            </form>
          </div>

          {/* Dashboard Mockup (RELIANCE Stock Card Mock) */}
          <div className="relative hidden md:block perspective-[1000px] w-full max-w-[500px] justify-self-center animate-fade-up" style={{animationDelay: '0.4s', opacity: 0}}>
            <div
              onClick={() => navigate(`/stock/${currentStock.ticker}`)}
              className="cinematic-card w-full aspect-[4/3] transform rotate-y-[-10deg] rotate-x-[5deg] shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0 p-6 flex flex-col gap-4 border border-[#cac3d9]/50 cursor-pointer"
            >
              {/* Card Header */}
              <div className="flex justify-between items-center border-b border-[#cac3d9]/30 pb-4">
                <div className="text-left transition-all duration-300">
                  <h3 className="font-title-md text-lg text-[#0d0d0d] font-bold">{currentStock.name}</h3>
                  <span className="font-data-mono text-xs text-[#0d0d0d]/60">NSE: {currentStock.ticker}</span>
                </div>
                <div className="text-right">
                  <div className="font-data-mono text-xl font-bold text-[#0d0d0d] transition-all duration-300">
                    {heroPrice > 0 ? heroPrice.toFixed(2) : "0.00"}
                  </div>
                  <div className={`font-data-mono text-xs font-bold transition-all duration-300 ${currentStock.changeColor}`}>
                    {currentStock.change}
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="flex-grow bg-[#fafafa] rounded border border-[#cac3d9]/20 relative overflow-hidden h-28">
                <svg className="w-full h-full absolute bottom-0" preserveAspectRatio="none" viewBox="0 0 400 200">
                  <path
                    className="chart-path transition-opacity duration-1000"
                    d={currentStockIndex % 2 === 0 ? "M0,150 C50,140 100,180 150,120 C200,60 250,100 300,40 C350,-20 400,20 400,20 L400,200 L0,200 Z" : "M0,180 C50,160 100,120 150,140 C200,100 250,80 300,60 C350,20 400,40 400,40 L400,200 L0,200 Z"}
                    fill="url(#chart-gradient)"
                  />
                  <path
                    className="chart-line"
                    d={currentStockIndex % 2 === 0 ? "M0,150 C50,140 100,180 150,120 C200,60 250,100 300,40 C350,-20 400,20 400,20" : "M0,180 C50,160 100,120 150,140 C200,100 250,80 300,60 C350,20 400,40 400,40"}
                    fill="none"
                    stroke={currentStock.changeColor.includes("ba1a1a") ? "#ba1a1a" : "#6C3FF5"}
                    strokeDasharray="1000"
                    strokeDashoffset={chartOffset}
                    strokeWidth="2"
                    style={{ transition: "stroke-dashoffset 2s ease-out" }}
                  />
                  <defs>
                    <linearGradient id="chart-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor={currentStock.changeColor.includes("ba1a1a") ? "#ba1a1a" : "#6C3FF5"} stopOpacity="0.1"></stop>
                      <stop offset="100%" stopColor={currentStock.changeColor.includes("ba1a1a") ? "#ba1a1a" : "#6C3FF5"} stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* AI Verdict Panel */}
              <div className="bg-[#5317dd]/5 rounded p-4 border border-[#5317dd]/20 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[#5317dd] text-[18px]">auto_awesome</span>
                  <span className="font-label-caps text-xs text-[#5317dd] font-bold">AI Verdict</span>
                </div>
                <p className="font-body-md text-xs text-[#0d0d0d]/70 leading-relaxed transition-opacity duration-300" key={currentStock.ticker}>
                  {currentStock.verdict}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 4. Trust Bar / Data Sources */}
      <div className="bg-[#fafafa] border-b border-[#cac3d9] py-4 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-8 flex items-center gap-8 font-data-mono text-xs text-[#0d0d0d]/50 tracking-wider">
          <span className="uppercase font-bold shrink-0">Data Sources</span>
          <div className="w-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#fafafa] to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#fafafa] to-transparent z-10"></div>
            <div className="flex whitespace-nowrap animate-marquee gap-16 items-center opacity-85">
              <div className="flex items-center gap-12">
                <span>NSE REAL-TIME</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>BSE TICKER</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>SCREENER.IN API</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>ECONOMIC TIMES NEWS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>MONEYCONTROL PRO</span>
              </div>
              <div className="flex items-center gap-12">
                <span>NSE REAL-TIME</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>BSE TICKER</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>SCREENER.IN API</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>ECONOMIC TIMES NEWS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#cac3d9]/80"></span>
                <span>MONEYCONTROL PRO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-[#cac3d9]/40 py-8">
        <div className="max-w-[1100px] mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "NSE Stocks Covered" },
            { value: "8",    label: "Live Wire Connectors" },
            { value: "3.2s", label: "Avg Analysis Time" },
            { value: "4",    label: "AI Models in Stack" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-[36px] font-bold text-[#5317dd] leading-none mb-1" style={{ fontFamily: 'monospace' }}>{value}</div>
              <div className="text-[13px] text-[#797487]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-[90px] bg-[#fcf9f8] border-b border-[#cac3d9]/30">
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[11px] font-bold text-[#5317dd] tracking-[0.2em] uppercase block mb-3">What ZeroOne Does</span>
            <h2 className="text-[36px] md:text-[44px] font-bold text-[#0d0d0d] tracking-tight leading-tight">
              Every edge. One terminal.
            </h2>
            <p className="text-[16px] text-[#797487] mt-4 max-w-2xl mx-auto">
              Built for the Indian retail investor who is tired of switching between 7 tabs to get a full picture.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: "auto_awesome",
                color: "#5317dd",
                bg: "#f0ebff",
                title: "AI Verdict",
                desc: "Groq Llama 3.3 reads 16 data points and gives you BULLISH / CAUTIOUS / AVOID in plain English. No jargon."
              },
              {
                icon: "campaign",
                color: "#0070f3",
                bg: "#e8f0ff",
                title: "MarketPulse",
                desc: "Narrative detection across ET, Moneycontrol, and StockTwits. See when a story is shifting before the price does."
              },
              {
                icon: "radar",
                color: "#00875a",
                bg: "#e3f5ec",
                title: "Options Pulse",
                desc: "Live PCR, Max Pain, IV percentile and highest OI strikes for any NSE stock. Know where the smart money sits."
              },
              {
                icon: "groups",
                color: "#d97706",
                bg: "#fef3e2",
                title: "Promoter Intel",
                desc: "Promoter holding %, pledging %, insider trades, and bulk deals in one panel. The most reliable signal in India."
              },
            ].map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="bg-white border border-[#e8e4f0] rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <span className="material-symbols-outlined text-[22px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <h3 className="text-[15px] font-bold text-[#0d0d0d] mb-2">{title}</h3>
                <p className="text-[13px] text-[#797487] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How It Works Under The Hood */}
      <section className="py-[100px] bg-[#F5F3FF] relative overflow-hidden border-b border-[#cac3d9]/50" id="how-it-works" ref={pipelineRef}>
        <div className="absolute inset-0 opacity-4" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="max-w-[1440px] mx-auto px-8 relative z-10">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className={`font-body-md text-[11px] text-[#9B98B8] tracking-[0.2em] uppercase font-medium block mb-4 transition-all duration-1000 ${isPipelineVisible ? 'opacity-100' : 'opacity-0'}`}>
              How It Works Under The Hood
            </span>
            <h2 className="font-display-hero text-3xl md:text-[40px] md:leading-[48px] text-[#0D0D0D] mb-6 font-bold tracking-tight">
              {"One search. Seven sources. One truth.".split(" ").map((word, i) => (
                <span
                  key={i}
                  className={`inline-block mr-2 transition-all duration-700 ease-out ${isPipelineVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-[30px] blur-[12px]'}`}
                  style={{ transitionDelay: `${i * 0.07}s` }}
                >
                  {word}
                </span>
              ))}
            </h2>
            <p className={`font-body-md text-[#5A5A72] text-[17px] transition-all duration-1000 delay-300 ${isPipelineVisible ? 'opacity-100' : 'opacity-0'}`}>
              The market speaks from seven directions at once. We translate it into a single signal.
            </p>
          </div>

          <div className={`bg-white rounded-[24px] border-[1.5px] border-[#EEEBFF] p-8 md:p-12 relative max-w-[1200px] mx-auto transition-all duration-1000 delay-500 ${isPipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[40px]'}`} style={{ boxShadow: '0 8px 40px rgba(108,63,245,0.08)' }}>

            {/* Pipeline Visual Container */}
            <div className="relative w-full mx-auto mb-8 flex flex-col md:flex-row items-start justify-between gap-12 md:gap-4 min-h-[300px] pt-4">

              {/* Desktop Connectors */}
              <svg className="hidden md:block absolute top-[60px] left-[10%] right-[10%] w-[80%] h-10 z-0 pointer-events-none" style={{ overflow: 'visible' }}>
                {/* Conn 1 -> 2 */}
                <path d="M0,20 L220,20" stroke="#6C3FF5" strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={pipelineStep >= 1 ? "0" : "100%"} className="transition-all duration-700 ease-out" />
                {pipelineStep >= 1 && <circle cx="0" cy="20" r="4" fill="#6C3FF5" className="animate-packet-travel" style={{ offsetPath: "path('M0,20 L220,20')" }} />}

                {/* Conn 2 -> 3 */}
                <path d="M220,20 L480,20" stroke="#6C3FF5" strokeWidth="3" strokeDasharray="6 4" strokeDashoffset={pipelineStep >= 2 ? "0" : "100%"} className="transition-all duration-700 ease-out delay-200" />
                {pipelineStep >= 2 && <circle cx="0" cy="20" r="4" fill="#6C3FF5" className="animate-packet-travel" style={{ offsetPath: "path('M220,20 L480,20')" }} />}
                {pipelineStep >= 2 && <foreignObject x="310" y="0" width="80" height="20" className="animate-fade-up"><div className="bg-white border border-[#EEEBFF] text-[#9B98B8] text-[10px] px-2 rounded-full text-center shadow-sm">~15KB payload</div></foreignObject>}

                {/* Conn 3 -> 4 */}
                <path d="M480,20 L740,20" stroke="#6C3FF5" strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={pipelineStep >= 3 ? "0" : "100%"} className="transition-all duration-700 ease-out delay-200" />
                {pipelineStep >= 3 && <circle cx="0" cy="20" r="4" fill="#6C3FF5" className="animate-packet-travel" style={{ offsetPath: "path('M480,20 L740,20')" }} />}
                {pipelineStep >= 3 && <foreignObject x="570" y="0" width="80" height="20" className="animate-fade-up"><div className="bg-white border border-[#EEEBFF] text-[#9B98B8] text-[10px] px-2 rounded-full text-center shadow-sm">AI reasoning</div></foreignObject>}

                {/* Conn 4 -> 5 */}
                <path d="M740,20 L980,20" stroke="#6C3FF5" strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={pipelineStep >= 4 ? "0" : "100%"} className="transition-all duration-700 ease-out delay-200" />
                {pipelineStep >= 4 && <circle cx="0" cy="20" r="4" fill="#6C3FF5" className="animate-packet-travel" style={{ offsetPath: "path('M740,20 L980,20')" }} />}
                {pipelineStep >= 4 && <foreignObject x="830" y="0" width="60" height="20" className="animate-fade-up"><div className="bg-white border border-[#EEEBFF] text-[#9B98B8] text-[10px] px-2 rounded-full text-center shadow-sm">verdict</div></foreignObject>}
              </svg>

              {/* Node 1: Your Query */}
              <div className={`relative z-10 flex flex-col items-center gap-3 w-[160px] group transition-transform duration-500 ${isPipelineVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: '700ms', marginTop: '30px' }}>
                <div className="w-[56px] h-[56px] rounded-full bg-[#EDE9FF] flex items-center justify-center transition-all group-hover:shadow-[0_0_0_4px_rgba(108,63,245,0.1)]">
                  <span className="material-symbols-outlined text-[28px] text-[#6C3FF5]">search</span>
                </div>
                <div className="text-center mt-2">
                  <span className="font-title-md text-[14px] text-[#0D0D0D] font-semibold block">Your Query</span>
                  <span className="font-body-md text-[12px] text-[#9B98B8] block mb-3">NSE ticker or company</span>
                  <div className="border-[1.5px] border-[#EEEBFF] rounded-lg px-3 py-1.5 h-[32px] w-[150px] flex items-center group-hover:border-[#6C3FF5] transition-colors bg-white mx-auto shadow-sm">
                    <span className="font-data-mono text-[12px] text-[#0D0D0D] font-bold tracking-wider">
                      {pipelineQueryText}
                    </span>
                    {(pipelineStep === 1 || !isPipelineVisible) && (
                      <span className="animate-blink text-[#0D0D0D] font-bold">|</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Node 2: Anakin Wire */}
              <div className={`relative z-10 flex flex-col items-center gap-3 w-[180px] transition-transform duration-500 ${isPipelineVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: '1100ms', marginTop: '22px' }}>
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#6C3FF5] to-[#4B2AB3] flex items-center justify-center shadow-lg relative animate-pulse-glow">
                  <span className={`material-symbols-outlined text-[32px] text-white ${pipelineStep === 2 ? 'animate-rotate-once' : ''}`}>bolt</span>
                  <div className="absolute -top-1 -right-4 bg-[#00C48C]/10 text-[#00C48C] font-title-md font-semibold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#00C48C]/20 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 bg-[#00C48C] rounded-full animate-pulse-green"></span> LIVE
                  </div>
                </div>
                <div className="text-center w-full mt-2 bg-white/80 backdrop-blur-sm rounded-xl py-2 px-1">
                  <span className="font-title-md text-[14px] text-[#0D0D0D] font-bold block">Anakin Wire</span>
                  <span className="font-body-md text-[12px] text-[#9B98B8] block mb-3">Parallel fetch engine</span>
                  <div className="flex flex-wrap justify-center gap-1.5 w-[160px] mx-auto">
                    {["NSE", "BSE", "Screener", "ET", "Moneycontrol", "StockTwits", "Trends"].map((chip, idx) => (
                      <span
                        key={chip}
                        className={`text-[10px] font-title-md font-medium px-2 py-1 rounded-md border transition-all duration-300 ${
                          pipelineChipsActive[idx]
                            ? "border-[#6C3FF5] bg-[#6C3FF5]/5 text-[#6C3FF5]"
                            : "border-[#EEEBFF] bg-white text-[#5A5A72]"
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Node 3: Structured Data */}
              <div className={`relative z-20 flex flex-col items-center w-[160px] transition-all duration-800 ease-out ${isPipelineVisible ? 'opacity-100 translate-y-[-12px]' : 'opacity-0 translate-y-[-30px]'}`} style={{ transitionDelay: '1600ms', marginTop: '10px' }}>
                <div className="bg-white border-2 border-[#6C3FF5] rounded-[16px] w-[150px] h-[170px] p-4 flex flex-col shadow-[0_12px_40px_rgba(108,63,245,0.2)] hover:-translate-y-2 hover:shadow-[0_16px_50px_rgba(108,63,245,0.3)] transition-all cursor-default z-10 relative">
                  <div className="flex flex-col items-center border-b border-[#EEEBFF] pb-2 mb-3">
                    <div className="w-[40px] h-[40px] bg-[#EDE9FF] rounded-[12px] flex items-center justify-center mb-2">
                      <span className="material-symbols-outlined text-[24px] text-[#6C3FF5]">database</span>
                    </div>
                    <span className="font-title-md text-[13px] text-[#0D0D0D] font-bold text-center">Structured Data</span>
                    <span className="font-body-md text-[10px] text-[#9B98B8]">Price · Stock · ETA</span>
                  </div>
                  <div className="flex-grow flex flex-col justify-center gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-body-md text-[10px] text-[#9B98B8]">Price</span>
                      <span id="pipeline-price-display" className="font-data-mono text-[12px] font-semibold text-[#0D0D0D] transition-colors">{pipelinePrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-body-md text-[10px] text-[#9B98B8]">Sources</span>
                      <span className="font-data-mono text-[12px] font-semibold text-[#6C3FF5]">14</span>
                    </div>
                    <div className="mt-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-body-md text-[10px] text-[#9B98B8]">AI Score</span>
                        <span className="font-data-mono text-[10px] font-semibold text-[#0D0D0D]">92/100</span>
                      </div>
                      <div className="w-full bg-[#EEEBFF] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#6C3FF5] h-full transition-all duration-1000 ease-out" style={{ width: pipelineScoreWidth }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Node 4: Grok + Gemini */}
              <div className={`relative z-10 flex flex-col items-center gap-3 w-[160px] transition-transform duration-500 ${isPipelineVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: '2100ms', marginTop: '26px' }}>
                <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-[#EDE9FF] to-[#C4B5FD] border-2 border-[#6C3FF5] flex items-center justify-center shadow-sm">
                  <span className={`material-symbols-outlined text-[28px] text-[#6C3FF5] ${pipelineStep === 4 ? 'animate-rotate-once' : ''}`}>psychology</span>
                </div>
                <div className="text-center mt-2 bg-white/80 backdrop-blur-sm rounded-xl py-2 px-1">
                  <span className="font-title-md text-[14px] text-[#0D0D0D] font-semibold block">Claude + Gemini</span>
                  <span className="font-body-md text-[12px] text-[#9B98B8] block mb-3">{pipelineGrokStatus}</span>
                  <div className="bg-[#F5A623]/10 text-[#F5A623] font-title-md font-semibold text-[10px] px-3 py-1 rounded-full inline-flex items-center gap-1 border border-[#F5A623]/20 animate-heartbeat-pulse">
                    ⚡ Alert
                  </div>
                </div>
              </div>

              {/* Node 5: Decision */}
              <div className={`relative z-10 flex flex-col items-center gap-3 w-[160px] transition-transform duration-500 ${isPipelineVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: '2600ms', marginTop: '30px' }}>
                <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#00C48C] to-[#00A070] flex items-center justify-center shadow-md animate-heartbeat-pulse">
                  <span className="material-symbols-outlined text-[28px] text-white">check_circle</span>
                </div>
                <div className="text-center w-full mt-2 bg-white/80 backdrop-blur-sm rounded-xl py-2 px-1">
                  <span className="font-title-md text-[14px] text-[#0D0D0D] font-semibold block">Your Decision</span>
                  <span className="font-body-md text-[12px] text-[#9B98B8] block mb-3">Buy · Wait · Negotiate</span>
                  <div className="flex flex-col gap-2 w-full items-center">
                    <span className={`text-[11px] font-title-md font-bold px-4 py-1.5 rounded-[20px] transition-all duration-300 w-fit shadow-sm ${pipelineDecision.includes("buy") ? "bg-[#00C48C]/10 text-[#00C48C] border border-[#00C48C]/30 scale-105" : "bg-white border border-[#EEEBFF] text-[#5A5A72] opacity-60"} ${pipelineDecision === "buy-pulse" ? "animate-ring-pulse" : ""}`}>
                      ● BUY NOW
                    </span>
                    <div className="flex gap-2 justify-center">
                      <span className={`text-[9px] font-title-md font-bold px-2.5 py-1 rounded-[20px] transition-all bg-white border border-[#EEEBFF] text-[#5A5A72] opacity-60 shadow-sm`}>
                        ◐ WAIT
                      </span>
                      <span className={`text-[9px] font-title-md font-bold px-2.5 py-1 rounded-[20px] transition-all bg-white border border-[#EEEBFF] text-[#5A5A72] opacity-60 shadow-sm`}>
                        ✕ AVOID
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Pipeline Status Bar */}
            <div className={`mt-12 border-t border-[#EEEBFF] pt-4 flex flex-col md:flex-row justify-between items-center transition-opacity duration-1000 ${isPipelineVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '2900ms' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00C48C] animate-pulse-green"></span>
                <span className="font-body-md text-[12px] text-[#5A5A72]">Pipeline active · Avg response time: <span className="font-data-mono font-medium">{pipelineLatency}s</span></span>
              </div>
              <div className="flex items-center gap-1 font-title-md text-[12px] text-[#6C3FF5] font-medium mt-4 md:mt-0">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                Powered by Anakin Wire
              </div>
              <div className="flex gap-1 mt-4 md:mt-0 opacity-50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A72] animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A72] animate-pulse" style={{ animationDelay: '200ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A72] animate-pulse" style={{ animationDelay: '400ms' }}></span>
              </div>
            </div>

            {/* Action Trigger Button */}
            <div className={`absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-20 transition-transform duration-500 ${isPipelineVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: '3100ms' }}>
              <button
                onClick={() => triggerPipelineRun(false)}
                className="bg-white text-[#6C3FF5] hover:bg-[#F5F3FF] px-5 py-2 rounded-lg font-title-md text-[13px] font-semibold border-[1.5px] border-[#6C3FF5]/30 hover:border-[#6C3FF5] transition-all duration-300 flex items-center gap-2 shadow-sm"
              >
                <span className={`material-symbols-outlined text-[16px] ${isPipelineRunning ? "animate-spin" : ""}`}>
                  {isPipelineRunning ? "sync" : "play_arrow"}
                </span>
                {isPipelineRunning ? "Running..." : pipelineStep === 5 ? "✓ Analysis Complete" : "Watch Pipeline Run"}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* AI Stack */}
      <section className="py-[80px] bg-white border-b border-[#cac3d9]/30">
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="text-center mb-12">
            <span className="text-[11px] font-bold text-[#5317dd] tracking-[0.2em] uppercase block mb-3">Powered By</span>
            <h2 className="text-[32px] font-bold text-[#0d0d0d] tracking-tight">Four AI models. One answer.</h2>
            <p className="text-[15px] text-[#797487] mt-3 max-w-xl mx-auto">Each model does what it does best. You get the combined output in seconds.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: "Groq Llama 3.3", role: "Primary Analysis", badge: "70B", detail: "Reads all 16 data points, generates the verdict, risks, and promoter trust score.", color: "#f97316", bg: "#fff7ed" },
              { name: "Gemini Flash", role: "Fallback + PDF", badge: "1.5", detail: "Generates full equity research PDF reports and acts as fallback when Groq is slow.", color: "#0070f3", bg: "#eff6ff" },
              { name: "GPT-4o", role: "Stock Compare", badge: "4o", detail: "The most rigorous comparison engine. Used only for head-to-head stock analysis.", color: "#16a34a", bg: "#f0fdf4" },
              { name: "ElevenLabs", role: "Voice TTS", badge: "V2", detail: "Converts your stock analysis to natural-sounding voice narration for the morning briefing.", color: "#7c3aed", bg: "#faf5ff" },
            ].map(({ name, role, badge, detail, color, bg }) => (
              <div key={name} className="border border-[#e8e4f0] rounded-2xl p-5 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px]" style={{ background: bg, color }}>
                    {badge}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{role}</span>
                </div>
                <h4 className="text-[14px] font-bold text-[#0d0d0d] mb-2">{name}</h4>
                <p className="text-[12px] text-[#797487] leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="bg-white text-[#0d0d0d] relative overflow-hidden border-t border-[#cac3d9]/30 py-[100px]">
        <div className="absolute inset-0 bg-[#fafafa] opacity-50"></div>
        <div className="max-w-4xl mx-auto px-8 text-center relative z-10 space-y-8">
          <h2 className="font-display-hero text-4xl md:text-[54px] md:leading-[60px] font-bold tracking-tight text-[#0d0d0d]">
            ZeroOne Financial Intelligence
          </h2>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => navigate("/analyse")}
              className="bg-[#5317dd] text-white px-10 py-4 rounded-full font-label-caps text-sm font-bold shadow-md hover:scale-105 transition-transform duration-300 uppercase tracking-wider btn-shimmer"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-[#0d0d0d] text-white py-12">
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#5317dd] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                </div>
                <span className="text-[16px] font-bold">ZeroOne</span>
              </div>
              <p className="text-[13px] text-white/50 leading-relaxed max-w-xs">India's AI-powered equity intelligence terminal. Built for retail investors who want institutional-grade signals.</p>
              <p className="text-[11px] text-white/30 mt-4 italic">The market speaks. We translate.</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-4">Product</p>
              <div className="space-y-2">
                {["Analyse Stock", "MarketPulse", "Sector Rotation", "Compare Stocks", "AI Assistant"].map(l => (
                  <button key={l} onClick={() => navigate("/analyse")} className="block text-[13px] text-white/60 hover:text-white transition-colors text-left">{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-4">Data Stack</p>
              <div className="space-y-2 text-[13px] text-white/60">
                {["NSE India (live)", "BSE India", "Screener.in", "Economic Times", "Moneycontrol", "StockTwits", "Fear & Greed", "Google Trends"].map(s => (
                  <p key={s}>{s}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[12px] text-white/30">© 2026 ZeroOne Financial Intelligence. Built by Hardik Hinduja.</p>
            <p className="text-[12px] text-white/30">Not SEBI registered. For informational purposes only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
