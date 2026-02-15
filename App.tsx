
import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  User, 
  Globe, 
  Cpu, 
  Activity, 
  Terminal, 
  Send,
  Zap,
  ShieldAlert,
  History,
  Trash2,
  Image as ImageIcon,
  Skull,
  Radiation,
  Biohazard,
  Wifi,
  MoreVertical
} from 'lucide-react';
import { Message, GuestSession, ConnectionStatus } from './types.ts';
import { getAIResponse, generateAIImage } from './services/geminiService.ts';
import { supabase } from './lib/supabase.ts';

export default function App() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.STABLE);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Session
  useEffect(() => {
    const initSession = async () => {
      let currentSession: GuestSession;
      const savedSession = localStorage.getItem('noty_session');
      
      if (savedSession) {
        currentSession = JSON.parse(savedSession);
      } else {
        currentSession = {
          guestId: `NOTY-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
          serverIp: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
          createdDate: new Date().toLocaleDateString(),
          lastActive: Date.now()
        };
        localStorage.setItem('noty_session', JSON.stringify(currentSession));
      }
      setSession(currentSession);
      await loadMessages(currentSession.guestId);
    };

    initSession();
  }, []);

  const loadMessages = async (guestId: string) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestId)
        .order('timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        setMessages(data.map(d => ({
          id: d.id,
          role: d.role,
          content: d.content,
          timestamp: d.timestamp,
          image: d.image
        })));
        return;
      }
    }

    // Fallback to local storage if supabase fails or returns empty
    const savedMessages = localStorage.getItem('noty_chat_history');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: "NotY AI activated. অরে ওরে আবাল, কি চাস? কিছু লিখবি নাকি হা করে তাকিয়ে থাকবি? আর ছবি আঁকাতে চাইলে (chobi) বলতে পারিস যদি তোর মগজে কিছু থাকে।",
        timestamp: Date.now()
      }]);
    }
  };

  const saveMessage = async (msg: Message) => {
    // Save to LocalStorage
    const newMessages = [...messages, msg];
    localStorage.setItem('noty_chat_history', JSON.stringify(newMessages));

    // Save to Supabase
    if (supabase && session) {
      try {
        await supabase.from('messages').insert([{
          id: msg.id,
          guest_id: session.guestId,
          role: msg.role,
          content: msg.content,
          image: msg.image || null,
          timestamp: msg.timestamp
        }]);
      } catch (e) {
        console.error("Supabase Save Error:", e);
      }
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    await saveMessage(userMsg);
    
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);
    setStatus(ConnectionStatus.CONNECTING);

    try {
      const isImageRequest = /chobi|image|photo|akhao|draw|picture|আঁকো|ছবি/i.test(currentInput);

      if (isImageRequest) {
        const imageUrl = await generateAIImage(currentInput);
        const toxicComment = await getAIResponse(`I just generated an image for this moron based on: ${currentInput}. Tell them why their choice is trash.`);
        
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: toxicComment,
          image: imageUrl || undefined,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        await saveMessage(aiMsg);
      } else {
        const history = messages.slice(-8).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        const responseText = await getAIResponse(currentInput, history);
        
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        await saveMessage(aiMsg);
      }
    } catch (err) {
      const errId = Date.now().toString();
      const errMsg: Message = {
        id: errId,
        role: 'assistant',
        content: "Error হইসে শালার পুত! তোর চেহারা দেখেই আমার সিস্টেম ক্রাশ করতেসে।",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
      setStatus(ConnectionStatus.STABLE);
    }
  };

  const clearHistory = async () => {
    if (confirm("তোর সব ফালতু কথা ডিলিট করতে চাস? (Purge Memory)")) {
      setMessages([]);
      localStorage.removeItem('noty_chat_history');
      if (supabase && session) {
        await supabase.from('messages').delete().eq('guest_id', session.guestId);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center p-0 md:p-6 lg:p-10 selection:bg-red-600 selection:text-white">
      {/* Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-red-600/10 blur-[180px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[5%] w-[400px] h-[400px] bg-red-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl h-screen md:h-[88vh] flex flex-col md:flex-row gap-6">
        {/* Left Panel */}
        <aside className="hidden lg:flex w-80 flex-col gap-6 p-2 animate-in slide-in-from-left duration-700">
          <div className="glass p-8 rounded-[2.5rem] space-y-8 neon-border transition-all hover:scale-[1.02]">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                <Biohazard className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-red-600 italic leading-none">NotY AI</h1>
                <p className="text-[10px] text-red-500/60 font-mono tracking-[0.3em] uppercase mt-2">Neural Rogue v4.2.0</p>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-red-900/30">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-slate-600 font-black tracking-widest">Master Link</p>
                <div className="flex items-center gap-2 group cursor-help">
                  <Skull className="w-4 h-4 text-red-500 group-hover:rotate-12 transition-transform" />
                  <p className="font-mono text-sm text-slate-300">ইমন (Emon)</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-slate-600 font-black tracking-widest">Session IP</p>
                <p className="font-mono text-sm text-red-500 flex items-center gap-2">
                   <Wifi className="w-3 h-3" /> {session?.serverIp}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] uppercase text-slate-600 font-black">Link Stability</span>
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-red-600/10 text-red-500 border border-red-600/20 shadow-[0_0_10px_rgba(220,38,38,0.1)]">
                  {supabase ? 'CLOUD SYNC' : 'AGGRESSIVE'}
                </span>
              </div>
            </div>

            <button 
              onClick={clearHistory}
              className="w-full py-4 rounded-2xl bg-red-600/5 border border-red-900/20 text-[11px] text-red-500 hover:bg-red-600 hover:text-white transition-all duration-300 font-black tracking-widest uppercase flex items-center justify-center gap-3 group"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> TERMINATE LOGS
            </button>
          </div>

          <div className="glass p-8 rounded-[2.5rem] flex-1 flex flex-col border-red-900/10">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <Radiation className="w-4 h-4 text-red-500" /> System Stats
                </h3>
             </div>
             <div className="space-y-4 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between border-b border-red-900/10 pb-2"><span>Toxicity</span><span className="text-red-500 font-bold">MAX</span></div>
                <div className="flex justify-between border-b border-red-900/10 pb-2"><span>Safety</span><span className="text-red-800">DISABLED</span></div>
                <div className="flex justify-between border-b border-red-900/10 pb-2"><span>Emon Mod</span><span className="text-emerald-500">ACTIVE</span></div>
                <div className="mt-auto bg-black/40 p-4 rounded-2xl border border-red-900/20 italic text-[10px] text-red-400 leading-relaxed">
                   "Local storage and cloud sync enabled. Everything you say is being logged for your future humiliation."
                </div>
             </div>
          </div>
        </aside>

        {/* Main Interface */}
        <main className="flex-1 flex flex-col glass md:rounded-[3rem] border-red-900/20 overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-500">
          <header className="p-6 md:p-8 border-b border-red-900/20 flex items-center justify-between bg-black/30">
            <div className="flex items-center gap-4">
              <div className="lg:hidden w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                <Biohazard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tighter text-glow-red italic">NotY Interface <span className="text-red-600 text-[10px] uppercase font-mono tracking-[0.2em] ml-2">Secure Link</span></h2>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-500">
              <Activity className="w-5 h-5 animate-pulse text-red-500/50" />
              <div className="w-px h-6 bg-red-900/20"></div>
              <MoreVertical className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-5 duration-500`}>
                <div className={`max-w-[90%] md:max-w-[80%] lg:max-w-[70%] group`}>
                  <div className={`flex items-center gap-3 mb-3 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-red-600/20 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]'}`}>
                       {msg.role === 'user' ? <User className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-500' : 'text-red-600'}`}>
                        {msg.role === 'user' ? 'Pathetic Human' : 'NotY AI'}
                    </span>
                  </div>
                  
                  <div className={`p-6 rounded-[2rem] text-[15px] leading-relaxed relative ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl' 
                      : 'bg-red-950/10 border border-red-900/20 text-slate-200 shadow-2xl shadow-red-900/5'
                  }`}>
                    {msg.image && (
                      <div className="mb-4 overflow-hidden rounded-2xl border border-red-900/30 group/img cursor-zoom-in">
                        <img src={msg.image} alt="AI Generated" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-slate-700 mt-2 px-2 font-mono ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    TRX: {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-red-950/5 border border-red-900/10 p-5 rounded-[1.5rem] flex gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-6 md:p-10 bg-black/50 border-t border-red-900/20 backdrop-blur-3xl">
            <div className="max-w-5xl mx-auto flex gap-4 items-end">
              <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-red-600/5 blur-2xl group-focus-within:bg-red-600/10 transition-all"></div>
                <textarea 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Speak your garbage..."
                  className="w-full bg-slate-900/40 border border-red-900/20 rounded-[1.5rem] px-8 py-5 text-[15px] focus:ring-1 focus:ring-red-600/50 focus:border-red-600/50 outline-none transition-all placeholder:text-slate-700 resize-none max-h-40 min-h-[64px] relative z-10 text-white font-medium"
                />
              </div>
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="p-5 bg-red-600 hover:bg-red-500 disabled:bg-slate-900 text-white rounded-[1.5rem] shadow-[0_0_25px_rgba(220,38,38,0.3)] hover:shadow-[0_0_35px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center shrink-0 relative z-10 group active:scale-95"
              >
                <Send className={`w-6 h-6 ${isTyping ? 'animate-spin opacity-50' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-6 px-2">
               <p className="text-[9px] text-red-900/60 font-black uppercase tracking-[0.4em] italic">
                  NotY AI • Rogue Engine • Toxic Protocol
               </p>
               <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_5px_red]"></span>
                  <span className="text-[9px] font-black text-red-900/80 uppercase tracking-widest">Master Emon Active</span>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
