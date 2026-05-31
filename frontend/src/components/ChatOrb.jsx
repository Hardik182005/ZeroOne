import React, { useState, useRef, useEffect } from "react";
import { api } from "../api/client";

// Browser SpeechRecognition (voice input) — Chrome/Edge expose it prefixed.
const SpeechRecognition =
  typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

// Floating AI chat orb — rendered once at the app layout level so it appears
// on every route. Two-way voice: the bot can speak its replies (ElevenLabs TTS
// via /api/voice/speak) and you can dictate questions with the mic.
export default function ChatOrb() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);   // auto-speak bot replies
  const [speakingIdx, setSpeakingIdx] = useState(null); // message currently playing
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm ZeroOne AI. Ask me anything about Indian markets — stocks, sectors, options, or strategy." }
  ]);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);   // current HTMLAudioElement
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Stop any audio + mic when the panel closes or the component unmounts.
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingIdx(null);
  };
  useEffect(() => {
    if (!open) { stopAudio(); stopListening(); }
    return () => { stopAudio(); stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Text-to-speech ─────────────────────────────────────────────────────────
  const speak = async (text, idx) => {
    // Toggle: clicking the speaker on the message that's already playing stops it.
    if (speakingIdx === idx) { stopAudio(); return; }
    stopAudio();
    try {
      const url = await api.speak(text);
      const audio = new Audio(url);
      audioRef.current = audio;
      setSpeakingIdx(idx);
      const cleanup = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; setSpeakingIdx(s => (s === idx ? null : s)); };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play().catch(() => cleanup()); // autoplay policy / load failure
    } catch {
      setSpeakingIdx(s => (s === idx ? null : s));
    }
  };

  // ── Voice input (mic) ──────────────────────────────────────────────────────
  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setListening(false);
  };
  const startListening = () => {
    if (!SpeechRecognition) return;
    if (listening) { stopListening(); return; }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      recognitionRef.current = null;
      sendMessage(transcript);   // auto-send the dictated question
    };
    rec.onerror = () => stopListening();
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { stopListening(); }
  };

  const sendMessage = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || loading) return;
    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const data = await api.chat(trimmed);
      const reply = data?.reply || "I couldn't process that. Try again.";
      let replyIdx = -1;
      setMessages(prev => { replyIdx = prev.length; return [...prev, { role: "assistant", text: reply }]; });
      if (voiceOn && replyIdx >= 0) speak(reply, replyIdx);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "AI assistant unavailable right now. Try again shortly." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[340px] max-w-[calc(100vw-3rem)] h-[460px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-[#e8e4f0] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#6434ed] text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              <div>
                <p className="text-[13px] font-bold leading-tight">ZeroOne AI</p>
                <p className="text-[10px] text-white/70 leading-none">{listening ? "Listening…" : "Always here to help"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Auto-speak toggle */}
              <button
                onClick={() => { const next = !voiceOn; setVoiceOn(next); if (!next) stopAudio(); }}
                aria-label={voiceOn ? "Turn off voice replies" : "Turn on voice replies"}
                title={voiceOn ? "Voice replies: on" : "Voice replies: off"}
                className="hover:opacity-80 p-0.5"
              >
                <span className="material-symbols-outlined text-[20px]" style={voiceOn ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {voiceOn ? "volume_up" : "volume_off"}
                </span>
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="hover:opacity-80 p-0.5">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fcf9f8]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#6434ed] text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm border border-[#e8e4f0]"
                }`}>
                  {msg.text}
                  {msg.role === "assistant" && idx !== 0 && (
                    <button
                      onClick={() => speak(msg.text, idx)}
                      aria-label={speakingIdx === idx ? "Stop" : "Play voice"}
                      title={speakingIdx === idx ? "Stop" : "Play voice"}
                      className="ml-1.5 align-middle text-[#6434ed] hover:opacity-70"
                    >
                      <span className="material-symbols-outlined text-[15px] align-middle">
                        {speakingIdx === idx ? "stop_circle" : "volume_up"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e8e4f0] px-3 py-2 rounded-xl rounded-bl-sm">
                  <span className="text-[12px] text-gray-400 animate-pulse">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#e8e4f0] bg-white shrink-0">
            <div className="flex gap-2 items-center">
              {SpeechRecognition && (
                <button
                  onClick={startListening}
                  aria-label={listening ? "Stop listening" : "Speak your question"}
                  title={listening ? "Stop listening" : "Speak your question"}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    listening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-[#6434ed] hover:bg-gray-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{listening ? "mic" : "mic_none"}</span>
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) sendMessage(input); }}
                placeholder="Ask about any stock or market..."
                className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 border border-[#e8e4f0] focus:outline-none focus:border-[#6434ed]"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="w-9 h-9 rounded-lg bg-[#6434ed] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating orb button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-[#6434ed] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {open ? "close" : "smart_toy"}
        </span>
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-tertiary border-2 border-white animate-pulse" />
        )}
      </button>
    </>
  );
}
