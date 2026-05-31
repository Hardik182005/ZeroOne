import React, { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const SUGGESTED_QUESTIONS = [
  "Is RELIANCE a buy right now?",
  "Which sectors are FIIs buying today?",
  "Explain PCR ratio in simple terms",
  "What is max pain in options?",
  "Compare IT sector vs Banking sector",
  "What does promoter pledging mean?"
];

export default function Settings() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Good morning! I'm ZeroOne AI. Ask me anything about Indian markets — stocks, sectors, options, or investing strategy. The market speaks. I translate." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() })
      });
      const data = await res.json();
      const reply = data.reply || "I couldn't process that. Try again.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      if (voiceEnabled) speakText(reply);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Network error. Check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 500));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="p-gutter max-w-container-max mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8 glass-card p-6 rounded-xl card-inner-stroke">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">ZeroOne AI Assistant</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Ask anything about Indian markets. Voice-enabled.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Chat Interface */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          {/* Messages */}
          <div className="glass-card rounded-xl card-inner-stroke flex flex-col" style={{ height: "60vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">ZERØONE AI — POWERED BY GROQ</span>
              </div>
              <button
                onClick={() => { setVoiceEnabled(v => !v); if (isSpeaking) window.speechSynthesis?.cancel(); }}
                className={`flex items-center gap-1 px-3 py-1 rounded font-label-caps text-xs transition-colors ${voiceEnabled ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                <span className="material-symbols-outlined text-sm">{voiceEnabled ? "volume_up" : "volume_off"}</span>
                {voiceEnabled ? "Voice ON" : "Voice OFF"}
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-surface-container-low text-on-surface rounded-bl-sm border border-outline-variant/30"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary text-sm">person</span>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-sm animate-spin">sync</span>
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant/30 px-4 py-3 rounded-xl rounded-bl-sm">
                    <span className="font-data-mono text-xs text-on-surface-variant animate-pulse">Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-outline-variant/30">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                  placeholder="Ask about any Indian stock or market trend..."
                  className="flex-1 bg-surface-container rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant border border-outline-variant/40 focus:outline-none focus:border-primary font-body-md"
                />
                <button
                  onClick={() => isListening ? stopListening() : startVoiceInput()}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isListening ? "bg-error text-white animate-pulse" : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"}`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <span className="material-symbols-outlined text-lg">{isListening ? "stop" : "mic"}</span>
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-primary animate-pulse">graphic_eq</span>
                  <span>Speaking...</span>
                  <button onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }} className="text-primary hover:underline">Stop</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — Suggested Questions + Info */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          {/* Suggested Questions */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">tips_and_updates</span>
              Suggested Questions
            </h3>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors border border-outline-variant/30 hover:border-primary/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Info */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">mic</span>
              Voice Assistant
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">Speak your question and get a voice reply. Powered by browser speech APIs.</p>
            <button
              onClick={() => isListening ? stopListening() : startVoiceInput()}
              className={`w-full py-3 rounded-lg font-label-caps text-sm font-bold flex items-center justify-center gap-2 transition-all ${isListening ? "bg-error text-white animate-pulse" : "bg-primary text-white hover:opacity-90"}`}
            >
              <span className="material-symbols-outlined">{isListening ? "stop_circle" : "mic"}</span>
              {isListening ? "Listening... Tap to Stop" : "Tap to Speak"}
            </button>
            <p className="text-xs text-on-surface-variant mt-3 text-center">Works best in Chrome. Say any market question.</p>
          </div>

          {/* AI Stack Info */}
          <div className="glass-card rounded-xl p-5 card-inner-stroke">
            <h3 className="font-label-caps text-xs text-on-surface-variant mb-3">AI STACK</h3>
            <div className="space-y-2 text-xs font-data-mono">
              <div className="flex justify-between"><span className="text-on-surface-variant">Primary AI</span><span className="text-tertiary font-bold">Groq Llama 3.3</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Compare</span><span className="text-tertiary font-bold">OpenAI GPT-4o</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Voice TTS</span><span className="text-tertiary font-bold">Web Speech API</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Data</span><span className="text-tertiary font-bold">Anakin Wire</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
