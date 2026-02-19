/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Settings, 
  Plus, 
  Trash2, 
  FileUp, 
  MessageSquare, 
  Cpu,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import { KnowledgeItem, ChatMessage } from './types';
import { askGemini } from './services/geminiService';
import { cn } from './lib/utils';

export default function App() {
  const [view, setView] = useState<'chat' | 'admin'>('chat');
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');
  
  // Admin Form State
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setKnowledge(data);
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await askGemini(userMessage, knowledge, messages);
      setMessages(prev => [...prev, { role: 'model', text: response || 'Desculpe, não consegui processar sua dúvida.' }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: `⚠️ **Erro:** ${error.message || 'Ocorreu um erro ao consultar a base de conhecimento.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'KarinaHelpWay#2026') {
      setIsAdminAuthenticated(true);
      setAdminError('');
    } else {
      setAdminError('Senha incorreta');
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          answer: newAnswer,
          password: adminPassword
        })
      });

      if (res.ok) {
        setNewQuestion('');
        setNewAnswer('');
        fetchKnowledge();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKnowledge = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      if (res.ok) {
        fetchKnowledge();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // Map Excel columns to our format
        // Expected columns: "Qual o seu erro?" and "Resposta"
        const mappedData = data.map(row => ({
          question: row["Qual o seu erro?"] || row["Pergunta"] || row["question"] || row["Erro"],
          answer: row["Resposta"] || row["answer"] || row["Solução"]
        })).filter(item => item.question && item.answer);

        if (mappedData.length > 0) {
          const res = await fetch('/api/knowledge/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: mappedData,
              password: adminPassword
            })
          });

          if (res.ok) {
            alert(`${mappedData.length} registros importados com sucesso!`);
            fetchKnowledge();
          } else {
            const err = await res.json();
            alert(`Erro na importação: ${err.error}`);
          }
        } else {
          alert('Nenhum dado válido encontrado. Certifique-se de que as colunas são "Qual o seu erro?" e "Resposta".');
        }
      } catch (error) {
        console.error('Bulk import failed:', error);
        alert('Erro ao processar o arquivo Excel.');
      } finally {
        setIsImporting(false);
        // Reset input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClearKnowledge = async () => {
    if (!confirm('ATENÇÃO: Isso apagará TODA a base de conhecimento atual. Deseja continuar?')) return;

    setIsClearing(true);
    try {
      const res = await fetch('/api/knowledge/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      if (res.ok) {
        alert('Base de conhecimento limpa com sucesso!');
        fetchKnowledge();
      }
    } catch (error) {
      console.error('Failed to clear:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Cpu size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">HelpWay SAP</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Knowledge Base AI</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setView('chat')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                view === 'chat' ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <MessageSquare size={16} />
              Consultar
            </button>
            <button 
              onClick={() => setView('admin')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                view === 'admin' ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Settings size={16} />
              Admin
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-[calc(100vh-180px)]"
            >
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6 scrollbar-thin scrollbar-thumb-slate-200"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Search className="text-slate-400" size={32} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Como posso ajudar hoje?</h3>
                      <p className="text-sm max-w-xs">Consulte nossa base de conhecimento para resolver erros e dúvidas.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 max-w-md">
                      {['Listar todos os erros', 'Como resolver erro de login?', 'Dúvida sobre pagamentos'].map(suggestion => (
                        <button 
                          key={suggestion}
                          onClick={() => { setInput(suggestion); }}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex w-full",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-5 py-4 shadow-sm",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    )}>
                      <div className="prose prose-sm prose-slate max-w-none dark:prose-invert whitespace-pre-wrap">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
                      <Loader2 className="animate-spin text-emerald-600" size={18} />
                      <span className="text-sm font-medium text-slate-500">Consultando base...</span>
                    </div>
                  </div>
                )}
              </div>

              <form 
                onSubmit={handleSendMessage}
                className="relative group"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua dúvida ou peça para listar os erros..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-16 shadow-lg shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto mt-20">
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
                    <div className="flex flex-col items-center text-center mb-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-4">
                        <Settings size={32} />
                      </div>
                      <h2 className="text-2xl font-bold">Acesso Restrito</h2>
                      <p className="text-slate-500 text-sm mt-1">Insira a senha administrativa para continuar</p>
                    </div>
                    
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div>
                        <input 
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Senha"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        {adminError && (
                          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle size={12} /> {adminError}
                          </p>
                        )}
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                      >
                        Entrar
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sidebar: Add/Import */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-emerald-600" />
                        Novo Registro
                      </h3>
                      <form onSubmit={handleAddKnowledge} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Qual o seu erro?</label>
                          <textarea 
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px]"
                            placeholder="Descreva o problema..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Resposta</label>
                          <textarea 
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px]"
                            placeholder="Solução detalhada..."
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isSaving}
                          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                          Salvar Registro
                        </button>
                      </form>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileUp size={18} className="text-blue-600" />
                        Importar Excel
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Recomendado: <span className="font-bold text-slate-700">Banco de Dados - HelpWay SAP</span><br/><br/>
                        O arquivo deve conter as colunas: <br/>
                        <span className="font-mono font-bold">"Qual o seu erro?"</span> e <span className="font-mono font-bold">"Resposta"</span>.
                      </p>
                      <label className={cn(
                        "w-full flex flex-col items-center justify-center px-4 py-6 bg-slate-50 text-slate-500 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-blue-400 transition-all",
                        isImporting && "opacity-50 cursor-not-allowed pointer-events-none"
                      )}>
                        {isImporting ? (
                          <Loader2 className="animate-spin mb-2" size={24} />
                        ) : (
                          <FileUp size={24} className="mb-2" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {isImporting ? "Processando..." : "Selecionar Arquivo"}
                        </span>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isImporting} />
                      </label>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
                      <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                        <Trash2 size={18} />
                        Zona de Perigo
                      </h3>
                      <button 
                        onClick={handleClearKnowledge}
                        disabled={isClearing}
                        className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-3 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        {isClearing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        Limpar Toda a Base
                      </button>
                    </div>

                    <button 
                      onClick={() => setIsAdminAuthenticated(false)}
                      className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 transition-colors py-2 text-sm font-medium"
                    >
                      <LogOut size={16} />
                      Sair do Painel
                    </button>
                  </div>

                  {/* Main: List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        Base de Conhecimento
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{knowledge.length}</span>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {knowledge.map((item, index) => (
                        <motion.div 
                          layout
                          key={item.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm group hover:border-emerald-500/30 transition-all"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{index + 1} - </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Problema</span>
                                <h4 className="font-bold text-slate-900">{item.question}</h4>
                              </div>
                              <div className="pl-4 border-l-2 border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteKnowledge(item.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}

                      {knowledge.length === 0 && (
                        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-50">
                          <Cpu size={48} className="mb-4 text-slate-300" />
                          <p className="font-medium">Nenhum registro encontrado</p>
                          <p className="text-xs">Comece adicionando manualmente ou importando um Excel.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto p-6 mt-auto border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-medium">
          <p>© 2026 Karina HelpWay. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
