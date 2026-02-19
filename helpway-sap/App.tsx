
import React, { useState, useEffect, useRef } from 'react';
import { KBEntry, Message, MessageRole, ChatState } from './types';
import { getChatbotResponse } from './services/geminiService';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  TrashIcon,
  PlusIcon,
  ArrowLeftOnRectangleIcon,
  WrenchScrewdriverIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';

const ADMIN_PASSWORD = "KarinaADM@Valgroup2026";
const LOCAL_STORAGE_KEY = "valgroup_kb_data";

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    messages: [
      {
        id: '1',
        role: MessageRole.AGENT,
        content: 'Olá! Sou o HelpWay SAP, seu assistente especializado na base de conhecimento. Como posso ajudar hoje?',
        timestamp: new Date()
      }
    ],
    isLoading: false,
    kbLoaded: false,
    kbData: []
  });

  const [input, setInput] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [tempKBData, setTempKBData] = useState<KBEntry[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as KBEntry[];
        setState(prev => ({
          ...prev,
          kbData: parsedData,
          kbLoaded: parsedData.length > 0
        }));
        setTempKBData(parsedData);
      } catch (e) {
        console.error("Erro ao carregar base local", e);
      }
    }
  }, []);

  const handleAuth = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      alert("Senha incorreta!");
    }
  };

  const saveKBData = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempKBData));
    setState(prev => ({
      ...prev,
      kbData: tempKBData,
      kbLoaded: tempKBData.length > 0
    }));
    alert("Base de conhecimento salva com sucesso!");
    setIsAdminMode(false);
    setIsAuthenticated(false);
  };

  const addEntry = () => {
    setTempKBData([...tempKBData, { error: '', response: '' }]);
  };

  const removeEntry = (index: number) => {
    setTempKBData(tempKBData.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof KBEntry, value: string) => {
    const newData = [...tempKBData];
    newData[index][field] = value;
    setTempKBData(newData);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || state.isLoading) return;
    
    if (!state.kbLoaded) {
      const systemMsg: Message = {
        id: Date.now().toString(),
        role: MessageRole.SYSTEM,
        content: "Atenção: A base de conhecimento está vazia. Por favor, acesse o painel administrativo para configurar os dados.",
        timestamp: new Date()
      };
      setState(prev => ({...prev, messages: [...prev.messages, systemMsg]}));
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: input,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true
    }));
    setInput('');

    try {
      const response = await getChatbotResponse(input, state.kbData);
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.AGENT,
        content: response,
        timestamp: new Date()
      };
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, agentMessage],
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const listAllErrors = () => {
    if (!state.kbLoaded) return;
    setInput("Liste todos os problemas/erros documentados na base com seus números.");
  };

  if (isAdminMode) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 text-white p-4 md:p-10 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <WrenchScrewdriverIcon className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold uppercase tracking-tight">Painel HelpWay SAP</h1>
            </div>
            <button 
              onClick={() => { setIsAdminMode(false); setIsAuthenticated(false); }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-all text-sm font-bold"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" /> Sair
            </button>
          </header>

          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
                <LockClosedIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-center mb-6">Acesso Restrito</h2>
                <input 
                  type="password"
                  placeholder="Senha KarinaADM..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
                <button 
                  onClick={handleAuth}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  Entrar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-800 rounded-2xl border border-slate-700 shadow-xl">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <HashtagIcon className="w-5 h-5 text-blue-400" /> 
                    Gestão de Conhecimento SAP
                  </h3>
                  <p className="text-slate-400 text-xs">Total de {tempKBData.length} entradas configuradas.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={addEntry}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold transition-all text-xs"
                  >
                    <PlusIcon className="w-4 h-4" /> Nova Entrada
                  </button>
                  <button 
                    onClick={saveKBData}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold transition-all text-xs shadow-lg shadow-blue-500/20"
                  >
                    <CheckCircleIcon className="w-4 h-4" /> Salvar Tudo
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {tempKBData.length === 0 && (
                  <div className="text-center py-20 text-slate-500 italic">
                    Nenhuma entrada configurada. Clique em "Nova Entrada" para começar.
                  </div>
                )}
                {tempKBData.map((entry, index) => (
                  <div key={index} className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 relative group">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 border-4 border-slate-900 flex items-center justify-center font-bold text-xs shadow-lg z-10 group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    <div className="flex-1 ml-4">
                      <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 block tracking-widest">Dúvida / Erro</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none h-24 resize-none transition-colors"
                        value={entry.error}
                        onChange={(e) => updateEntry(index, 'error', e.target.value)}
                        placeholder="Descreva o problema..."
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-green-400 uppercase mb-2 block tracking-widest">Solução / Resposta</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-green-500 outline-none h-24 resize-none transition-colors"
                        value={entry.response}
                        onChange={(e) => updateEntry(index, 'response', e.target.value)}
                        placeholder="A resposta que o bot deve dar..."
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={() => removeEntry(index)}
                        className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                        title="Remover entrada"
                      >
                        <TrashIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex shadow-xl">
        <div className="p-6 border-b border-slate-100 bg-blue-700 text-white">
          <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">HelpWay SAP</h1>
          </div>
          <p className="text-blue-100 text-[10px] mt-1 uppercase tracking-widest font-bold opacity-80">Suporte Especializado Valgroup</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-8">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Status da Base</h2>
            
            <div className={`p-4 rounded-xl border transition-all shadow-sm ${
                state.kbLoaded 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  {state.kbLoaded ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationCircleIcon className="w-5 h-5" />}
                  {state.kbLoaded ? `${state.kbData.length} Registros` : 'Aguardando Dados'}
                </div>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed font-medium">
                {state.kbLoaded 
                  ? `O HelpWay SAP está pronto para responder dúvidas numeradas baseadas no conhecimento local.`
                  : 'Nenhum dado configurado no painel de administração.'}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Menu Rápido</h2>
            <button
              disabled={!state.kbLoaded}
              onClick={listAllErrors}
              className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                state.kbLoaded 
                ? 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700' 
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
            >
              <HashtagIcon className="w-4 h-4" />
              Ver Lista Numerada
            </button>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex gap-2 text-amber-800">
              <InformationCircleIcon className="w-5 h-5 shrink-0" />
              <div className="text-[10px] leading-tight">
                <p className="font-bold mb-1 uppercase tracking-tighter">Como usar:</p>
                <p className="opacity-80">Você pode perguntar livremente ou pedir por um erro específico digitando o número dele.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-4">
          <button 
            onClick={() => setIsAdminMode(true)}
            className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all py-2.5 border border-dashed border-slate-200 rounded-xl"
          >
            <LockClosedIcon className="w-3 h-3" /> Acesso Administrativo
          </button>
          
          <div className="flex items-center gap-3 px-2 bg-slate-50 p-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-blue-200">H</div>
            <div className="text-xs">
              <p className="font-bold text-slate-700">HelpWay SAP</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-tighter font-bold">Bot de Suporte</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[#f1f5f9]">
        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 md:hidden">
           <div className="flex items-center gap-2">
             <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
             <h1 className="font-bold text-slate-800">HelpWay SAP</h1>
           </div>
           <button onClick={() => setIsAdminMode(true)} className="p-2 text-slate-400">
             <LockClosedIcon className="w-5 h-5" />
           </button>
        </header>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 custom-scrollbar">
          {state.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-5 shadow-sm relative ${
                  msg.role === MessageRole.USER
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200'
                    : msg.role === MessageRole.SYSTEM
                    ? 'bg-slate-200/60 text-slate-500 text-[10px] border border-slate-200 font-bold mx-auto text-center px-6 py-1.5 rounded-full'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none ring-1 ring-slate-200/30'
                }`}
              >
                {msg.role === MessageRole.AGENT && (
                   <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-1.5">
                       <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                       Suporte HelpWay
                     </p>
                   </div>
                )}
                <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed font-medium">
                  {msg.content}
                </div>
                <div className={`text-[9px] mt-3 font-bold opacity-30 ${msg.role === MessageRole.USER ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {state.isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Consultando HelpWay...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-10 bg-white border-t border-slate-100 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="max-w-4xl mx-auto relative">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Diga qual seu erro ou digite um número..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-6 pr-14 py-5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-inner text-base font-medium"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={state.isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl px-12 py-5 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center shadow-xl shadow-blue-600/30 active:scale-95 group"
              >
                {state.isLoading ? (
                  <ArrowPathIcon className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span className="hidden md:inline mr-2">Consultar</span>
                    <PaperAirplaneIcon className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-4 px-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                HelpWay SAP v2.0 • KarinaADM
              </p>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${state.kbLoaded ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                 <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${state.kbLoaded ? 'text-green-600' : 'text-red-600'}`}>
                   {state.kbLoaded ? 'Conectado' : 'Sem Dados'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
