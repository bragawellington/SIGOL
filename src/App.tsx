import { useState, useEffect } from "react";
import {
  Tractor, Users, MapPin, ShieldAlert, KeyRound, Clock, Activity,
  DollarSign, AlertTriangle, LayoutDashboard,
  LogOut, ClipboardList, Search, X, ChevronRight, Bell, Plus,
  Loader2, Menu, TreePine, Settings, HelpCircle, Lock, Eye, EyeOff
} from "lucide-react";

import DashboardTab from "./components/DashboardTab";
import LancamentosTab from "./components/LancamentosTab";
import ControllingTab from "./components/ControleMensalTab";
import FaturamentoTab from "./components/FaturamentoTab";
import EquipamentosTab from "./components/EquipamentosTab";
import CadastroFlorestalTab from "./components/CadastroFlorestalTab";
import ColaboradoresTab from "./components/ColaboradoresTab";
import AuditoriaTab from "./components/AuditoriaTab";
import GestaoUsuariosTab from "./components/GestaoUsuariosTab";
import PendenciasTab from "./components/PendenciasTab";
import AtividadesTab from "./components/AtividadesTab";
import AlterarSenhaTab from "./components/AlterarSenhaTab";

import { User, Colaborador, Equipamento, CadastroFlorestal, Lancamento, Auditoria, Atividade } from "./types";
import { formatCurrency, formatDateBR } from "./utils";
import { supabase, isDemo } from "./lib/supabase";
import {
  demoUsers, demoColaboradores, demoEquipamentos,
  demoCadastroFlorestal, generateDemoLaunches, demoAuditoria, demoAtividades
} from "./lib/demoData";

export default function App() {
  // ── Auth State ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCodigo, setLoginCodigo] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── App State ──
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipments, setEquipments] = useState<Equipamento[]>([]);
  const [forestry, setForestry] = useState<CadastroFlorestal[]>([]);
  const [launches, setLaunches] = useState<Lancamento[]>([]);
  const [auditLogs, setAuditLogs] = useState<Auditoria[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedDetailLaunch, setSelectedDetailLaunch] = useState<Lancamento | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ── Login ──
  const handleLogin = async () => {
    if (!loginCodigo.trim() || !loginSenha.trim()) {
      setLoginError("Preencha o código e a senha.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);

    try {
      if (isDemo || !supabase) {
        // Demo mode: match by codigo + senha
        const user = demoUsers.find(
          u => u.codigo.toLowerCase() === loginCodigo.trim().toLowerCase() && u.senha === loginSenha
        );
        if (!user) {
          setLoginError("Código ou senha incorretos.");
          setLoginLoading(false);
          return;
        }
        if (!user.ativo) {
          setLoginError("Usuário inativo. Contate o administrador.");
          setLoginLoading(false);
          return;
        }
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        // Supabase: lookup user by codigo, verify password via RPC
        const { data, error } = await supabase
          .rpc('login_usuario', {
            p_codigo: loginCodigo.trim(),
            p_senha: loginSenha
          });
        if (error || !data || data.length === 0) {
          setLoginError("Código ou senha incorretos.");
          setLoginLoading(false);
          return;
        }
        const user = data[0] as User;
        if (!user.ativo) {
          setLoginError("Usuário inativo. Contate o administrador.");
          setLoginLoading(false);
          return;
        }
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Log audit
        await supabase.from('auditoria').insert({
          usuario: user.email,
          acao: "LOGIN",
          registro: "SESSÃO",
          descricao: `Login via código ${user.codigo} — perfil ${user.perfil}`
        });
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setLoginError("Erro de conexão. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginCodigo("");
    setLoginSenha("");
    setLoginError(null);
    setActiveTab("dashboard");
    setShowUserMenu(false);
  };

  // ── Data Loading (after login) ──
  const loadAllData = async () => {
    try {
      setLoading(true);
      if (isDemo || !supabase) {
        setUsers(demoUsers);
        setColaboradores(demoColaboradores);
        setEquipments(demoEquipamentos);
        setForestry(demoCadastroFlorestal);
        setLaunches(generateDemoLaunches());
        setAuditLogs(demoAuditoria);
        setAtividades(demoAtividades);
      } else {
        const [resUsers, resCol, resEquip, resForest, resLaunches, resAudit, resAtiv] = await Promise.all([
          supabase.from('usuarios').select('*'),
          supabase.from('colaboradores').select('*'),
          supabase.from('equipamentos').select('*'),
          supabase.from('cadastro_florestal').select('*').range(0, 9999),
          supabase.from('lancamentos').select('*').order('data', { ascending: false }).range(0, 9999),
          supabase.from('auditoria').select('*').order('data_hora', { ascending: false }).range(0, 999),
          supabase.from('atividades').select('*').order('nome', { ascending: true })
        ]);
        if (resUsers.data) setUsers(resUsers.data);
        if (resCol.data) setColaboradores(resCol.data);
        if (resEquip.data) setEquipments(resEquip.data);
        if (resForest.data) setForestry(resForest.data);
        if (resLaunches.data) setLaunches(resLaunches.data);
        if (resAudit.data) setAuditLogs(resAudit.data);
        if (resAtiv.data) setAtividades(resAtiv.data);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setErrorHeader("Dificuldade de conexão. Tentando reconectar...");
    } finally {
      setLoading(false);
    }
  };

  // Load data after authentication
  useEffect(() => {
    if (isAuthenticated) loadAllData();
  }, [isAuthenticated]);

  // Force password change on first login
  const mustChangePassword = currentUser ? (currentUser.senha_alterada === false) : false;

  useEffect(() => {
    if (mustChangePassword) {
      setActiveTab("alterar-senha");
      return;
    }
    if (currentUser?.perfil === "OPERADOR") {
      if (!["lancamentos", "controle-mensal", "alterar-senha"].includes(activeTab)) setActiveTab("lancamentos");
    } else if (currentUser?.perfil === "TÉCNICO") {
      const allowed = ["dashboard", "pendencias", "lancamentos", "controle-mensal", "alterar-senha"];
      if (!allowed.includes(activeTab)) setActiveTab("dashboard");
    }
  }, [currentUser, activeTab, mustChangePassword]);

  // Competência period calculation
  const getCompetencia = () => {
    const today = new Date();
    const day = today.getDate();
    if (day >= 21) {
      return { startDate: new Date(today.getFullYear(), today.getMonth(), 21), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 20) };
    } else {
      return { startDate: new Date(today.getFullYear(), today.getMonth() - 1, 21), endDate: new Date(today.getFullYear(), today.getMonth(), 20) };
    }
  };
  const competencia = getCompetencia();
  const compLabel = `${competencia.startDate.getDate()}/${String(competencia.startDate.getMonth() + 1).padStart(2, "0")} → ${competencia.endDate.getDate()}/${String(competencia.endDate.getMonth() + 1).padStart(2, "0")}`;

  // ── CRUD Handlers ──
  const isReadOnly = currentUser?.perfil === "GERÊNCIA";
  const blockReadOnly = () => { alert("Perfil GERÊNCIA: acesso somente leitura."); };

  const handleAddLaunch = async (newLaunch: Omit<Lancamento, "id" | "criado_por" | "criado_em" | "status" | "aprovado_por" | "aprovado_em" | "faturado_por" | "faturado_em" | "rendimento" | "horas_trabalhadas" | "equipamento" | "fazenda" | "nucleo" | "area_up">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: operação simulada com sucesso."); await loadAllData(); return; }
    if (supabase) {
      const { horas_trabalhadas, ...insertData } = newLaunch as any;
      const { error } = await supabase.from('lancamentos').insert({ ...insertData, criado_por: currentUser.email, status: "PENDENTE" });
      if (error) { alert("Falha ao criar lançamento."); throw error; }
      await loadAllData();
    }
  };

  const handleUpdateLaunchStatus = async (id: string, status: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO", obs?: string, rate?: number, horas_sap?: number, otherFields?: Partial<Lancamento>) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setLaunches(prev => prev.map(l => l.id === id ? { ...l, status, observacao: obs || l.observacao, ...otherFields } : l)); return; }
    if (supabase) {
      const updates: any = { status };
      if (obs !== undefined) updates.observacao = obs;
      if (rate !== undefined) updates.valor_hora_faturamento = rate;
      if (horas_sap !== undefined) updates.horas_sap = horas_sap;
      if (status === "APROVADO") { updates.aprovado_por = currentUser.email; updates.aprovado_em = new Date().toISOString(); }
      if (status === "FATURADO") { updates.faturado_por = currentUser.email; updates.faturado_em = new Date().toISOString(); }
      if (otherFields) Object.assign(updates, otherFields);
      const { error } = await supabase.from('lancamentos').update(updates).eq('id', id);
      if (error) alert("Falha ao atualizar lançamento.");
      await loadAllData();
    }
  };

  const handleBulkBill = async (ids: string[], rateOverride?: number) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setLaunches(prev => prev.map(l => ids.includes(l.id) ? { ...l, status: "FATURADO" as const, faturado_por: currentUser!.email, faturado_em: new Date().toISOString() } : l)); return; }
    if (supabase) {
      for (const id of ids) {
        await supabase.from('lancamentos').update({ status: "FATURADO", faturado_por: currentUser.email, faturado_em: new Date().toISOString(), ...(rateOverride ? { valor_hora_faturamento: rateOverride } : {}) }).eq('id', id);
      }
      await loadAllData();
    }
  };

  const handleAddEquipment = async (newEq: Omit<Equipamento, "id" | "horas_acumuladas" | "valor_produzido" | "utilizacao_mensal">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: operação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('equipamentos').insert(newEq); if (error) { alert("Falha ao adicionar equipamento."); throw error; } await loadAllData(); }
  };

  const handleAddForest = async (newForest: Omit<CadastroFlorestal, "id">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: operação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('cadastro_florestal').insert(newForest); if (error) { alert("Falha ao adicionar UP."); throw error; } await loadAllData(); }
  };

  const handleImportForestList = async (list: Omit<CadastroFlorestal, "id">[]) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: importação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('cadastro_florestal').insert(list); if (error) { alert("Falha na importação."); throw error; } await loadAllData(); }
  };

  const handleAddColaborador = async (col: Omit<Colaborador, "id">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: operação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('colaboradores').insert(col); if (error) { alert("Falha ao adicionar colaborador."); throw error; } await loadAllData(); }
  };

  const handleImportColaboradorList = async (list: Omit<Colaborador, "id">[]) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: importação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('colaboradores').insert(list); if (error) { alert("Falha na importação."); throw error; } await loadAllData(); }
  };

  const handleImportLaunchList = async (list: any[]) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: importação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('lancamentos').insert(list.map(l => ({ ...l, criado_por: currentUser!.email, status: "PENDENTE" }))); if (error) { alert("Falha na importação."); throw error; } await loadAllData(); }
  };

  const handleClearAuditLogs = async () => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setAuditLogs([]); return; }
    if (supabase) { await supabase.from('auditoria').delete().neq('id', ''); await loadAllData(); }
  };

  const handleAddUser = async (newUser: Omit<User, "id" | "created_at">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { alert("Modo demonstração: operação simulada."); return; }
    if (supabase) { const { error } = await supabase.from('usuarios').insert(newUser); if (error) { alert("Falha ao registrar usuário."); throw error; } await loadAllData(); }
  };

  const handleAddAtividade = async (atv: Omit<Atividade, "id">) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setAtividades(prev => [...prev, { ...atv, id: `atv_${Date.now()}` }]); return; }
    if (supabase) { const { error } = await supabase.from('atividades').insert(atv); if (error) { alert("Falha ao cadastrar atividade."); throw error; } await loadAllData(); }
  };

  const handleUpdateAtividade = async (id: string, updates: Partial<Atividade>) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setAtividades(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a)); return; }
    if (supabase) { const { error } = await supabase.from('atividades').update(updates).eq('id', id); if (error) { alert("Falha ao atualizar."); } await loadAllData(); }
  };

  const handleDeleteAtividade = async (id: string) => {
    if (!currentUser || isReadOnly) { blockReadOnly(); return; }
    if (isDemo) { setAtividades(prev => prev.filter(a => a.id !== id)); return; }
    if (supabase) { const { error } = await supabase.from('atividades').delete().eq('id', id); if (error) { alert("Falha ao excluir."); } await loadAllData(); }
  };

  const handleResetPassword = async (codigo: string) => {
    if (!currentUser) return;
    if (isDemo) { alert("Modo demonstração: senha resetada para sigol123."); return; }
    if (supabase) {
      const { error } = await supabase.rpc('resetar_senha', { p_codigo: codigo });
      if (error) { alert("Falha ao resetar senha."); return; }
      alert(`Senha do código ${codigo} resetada para sigol123.`);
      await loadAllData();
    }
  };

  // ── Navigation ──
  const menuItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, group: "Análise" },
    { id: "pendencias", label: "Pendências", Icon: AlertTriangle, group: "Análise" },
    { id: "lancamentos", label: "Lançamentos", Icon: ClipboardList, group: "Operação" },
    { id: "controle-mensal", label: "Controle Mensal", Icon: Clock, group: "Operação" },
    { id: "faturamento", label: "Faturamento", Icon: DollarSign, group: "Financeiro" },
    { id: "equipamentos", label: "Equipamentos", Icon: Tractor, group: "Cadastros" },
    { id: "cadastro-florestal", label: "Cadastro Florestal", Icon: MapPin, group: "Cadastros" },
    { id: "colaboradores", label: "Colaboradores", Icon: Users, group: "Cadastros" },
    { id: "atividades", label: "Atividades", Icon: Activity, group: "Cadastros" },
    { id: "auditoria", label: "Auditoria", Icon: ShieldAlert, group: "Sistema" },
    { id: "usuarios", label: "Gestão de Usuários", Icon: KeyRound, group: "Sistema" },
    { id: "alterar-senha", label: "Alterar Senha", Icon: Lock, group: "Sistema" }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (currentUser?.perfil === "OPERADOR") return ["lancamentos", "controle-mensal", "alterar-senha"].includes(item.id);
    if (currentUser?.perfil === "TÉCNICO") return ["dashboard", "pendencias", "lancamentos", "controle-mensal", "alterar-senha"].includes(item.id);
    return true;
  });

  // ── Search ──
  const getSearchResults = () => {
    if (!globalSearch.trim()) return { launches: [], equipments: [], collaborators: [], forestry: [] };
    const q = globalSearch.toLowerCase().trim();
    return {
      launches: launches.filter(l => l.up.toLowerCase().includes(q) || l.fazenda.toLowerCase().includes(q) || l.frota.toLowerCase().includes(q) || l.operador_nome.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)).slice(0, 5),
      equipments: equipments.filter(e => e.frota.toLowerCase().includes(q) || e.tipo.toLowerCase().includes(q)).slice(0, 5),
      collaborators: colaboradores.filter(c => c.nome.toLowerCase().includes(q) || c.registro.toLowerCase().includes(q)).slice(0, 5),
      forestry: forestry.filter(f => f.up.toLowerCase().includes(q) || f.fazenda.toLowerCase().includes(q)).slice(0, 5)
    };
  };
  const searchResults = getSearchResults();
  const hasSearchResults = searchResults.launches.length > 0 || searchResults.equipments.length > 0 || searchResults.collaborators.length > 0 || searchResults.forestry.length > 0;

  const pendingCount = launches.filter(l => l.status === "PENDENTE").length;
  const approvedCount = launches.filter(l => l.status === "APROVADO").length;

  const tabTitles: Record<string, string> = {
    dashboard: "Dashboard Executivo", pendencias: "Central de Pendências", lancamentos: "Lançamentos",
    "controle-mensal": "Controle Mensal", faturamento: "Faturamento", equipamentos: "Equipamentos",
    "cadastro-florestal": "Cadastro Florestal", colaboradores: "Colaboradores", atividades: "Gestão de Atividades",
    auditoria: "Auditoria", usuarios: "Gestão de Usuários", "alterar-senha": "Alterar Senha"
  };

  // ═══════════════════════════════════════════════
  // TELA DE LOGIN
  // ═══════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.jpg" alt="Costa Pinto" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg object-cover" />
            <h1 className="text-2xl font-bold text-white tracking-tight">SIGOL</h1>
            <p className="text-sm text-slate-400 mt-1">Costa Pinto — Sistema Integrado de Gestão Operacional</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">Entrar</h2>
              <p className="text-xs text-slate-400 mt-0.5">Use seu código único e senha</p>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium animate-fadeIn">
                {loginError}
              </div>
            )}

            {/* Código único */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Código único</label>
              <input
                type="text"
                value={loginCodigo}
                onChange={(e) => { setLoginCodigo(e.target.value.toUpperCase()); setLoginError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Ex: OP1001, TEC001, GER001"
                autoFocus
                className="w-full px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] placeholder-slate-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginSenha}
                  onChange={(e) => { setLoginSenha(e.target.value); setLoginError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] placeholder-slate-400 focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              ) : (
                <><Lock className="w-4 h-4" /> Entrar</>
              )}
            </button>

            {/* Demo hint */}
            {isDemo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-amber-700">Modo Demonstração</p>
                <p className="text-[10px] text-amber-600 leading-relaxed">
                  Códigos disponíveis: <span className="font-mono font-semibold">OP1001</span> (Operador), <span className="font-mono font-semibold">TEC001</span> (Técnico), <span className="font-mono font-semibold">FAT001</span> (Faturamento), <span className="font-mono font-semibold">GER001</span> (Gerência).
                  Senha: <span className="font-mono font-semibold">sigol123</span>
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-500 mt-6">SIGOL v2.0 — Gestão Florestal</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // APP PRINCIPAL (após login)
  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased">

      {/* ═══════ HEADER ═══════ */}
      <header className="sticky top-0 z-40 h-14 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between px-4 lg:px-6 shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Costa Pinto" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-bold text-sm tracking-tight">SIGOL</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex relative max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar UP, Frota, Fazenda, Operador..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-1.5 bg-[#1e293b] border border-[#334155] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none transition-all" />
            <kbd className="absolute right-3 top-1.5 text-[10px] text-slate-500 bg-[#0f172a] border border-[#334155] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            {globalSearch && (
              <button onClick={() => setGlobalSearch("")} className="absolute right-12 top-2 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>

          {/* Search results dropdown */}
          {globalSearch && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#e2e8f0] shadow-xl z-50 max-h-96 overflow-y-auto p-2 text-xs animate-fadeIn">
              {!hasSearchResults ? (
                <p className="text-center py-6 text-slate-400">Nenhum resultado para "{globalSearch}"</p>
              ) : (
                <>
                  {searchResults.launches.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-2 py-1">Lançamentos</p>
                      {searchResults.launches.map(l => (
                        <button key={l.id} onClick={() => { setSelectedDetailLaunch(l); setGlobalSearch(""); }}
                          className="w-full text-left px-2 py-2 hover:bg-[#f8fafc] rounded-lg flex justify-between items-center cursor-pointer transition-colors">
                          <div>
                            <span className="font-medium text-[#0f172a]">#{l.id} — {l.operador_nome}</span>
                            <span className="text-[10px] text-slate-400 block">{l.frota} • {l.up}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${l.status === "APROVADO" ? "bg-green-50 text-green-700" : l.status === "PENDENTE" ? "bg-amber-50 text-amber-700" : l.status === "FATURADO" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>{l.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.equipments.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-2 py-1">Equipamentos</p>
                      {searchResults.equipments.map(e => (
                        <button key={e.id} onClick={() => { setActiveTab("equipamentos"); setGlobalSearch(""); }}
                          className="w-full text-left px-2 py-2 hover:bg-[#f8fafc] rounded-lg flex justify-between items-center cursor-pointer">
                          <div><span className="font-medium text-[#0f172a]">{e.frota}</span><span className="text-[10px] text-slate-400 block">{e.tipo}</span></div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.collaborators.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-2 py-1">Colaboradores</p>
                      {searchResults.collaborators.map(c => (
                        <button key={c.id} onClick={() => { setActiveTab("colaboradores"); setGlobalSearch(""); }}
                          className="w-full text-left px-2 py-2 hover:bg-[#f8fafc] rounded-lg flex justify-between items-center cursor-pointer">
                          <div><span className="font-medium text-[#0f172a]">{c.nome}</span><span className="text-[10px] text-slate-400 block">{c.registro} • {c.funcao}</span></div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.forestry.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-2 py-1">Cadastro Florestal</p>
                      {searchResults.forestry.map(f => (
                        <button key={f.id} onClick={() => { setActiveTab("cadastro-florestal"); setGlobalSearch(""); }}
                          className="w-full text-left px-2 py-2 hover:bg-[#f8fafc] rounded-lg flex justify-between items-center cursor-pointer">
                          <div><span className="font-medium text-[#0f172a]">UP {f.up}</span><span className="text-[10px] text-slate-400 block">{f.fazenda} • {f.nucleo}</span></div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center text-[11px] text-slate-400 bg-[#1e293b] px-2.5 py-1 rounded-md border border-[#334155]">
            {compLabel}
          </div>
          <button className="relative text-slate-400 hover:text-white p-1.5 transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#dc2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount > 9 ? "9+" : pendingCount}</span>
            )}
          </button>

          {/* User avatar — only logout, no profile switching */}
          {currentUser && (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-[11px] font-bold uppercase">
                  {currentUser.nome.substring(0, 2)}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[11px] font-medium text-white leading-tight">{currentUser.nome.split(" ")[0]}</p>
                  <p className="text-[9px] text-slate-500">{currentUser.perfil}</p>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-[#e2e8f0] shadow-xl z-50 py-1 animate-fadeIn">
                    <div className="px-3 py-2.5 border-b border-[#f1f5f9]">
                      <p className="text-xs font-semibold text-[#0f172a]">{currentUser.nome}</p>
                      <p className="text-[10px] text-slate-400">{currentUser.codigo} • {currentUser.perfil}</p>
                    </div>
                    <button onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ═══════ BODY ═══════ */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ═══════ SIDEBAR ═══════ */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-[#e2e8f0] flex flex-col transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="flex-1 overflow-y-auto pt-4 pb-4">
            <nav className="px-3 space-y-5">
              {["Análise", "Operação", "Financeiro", "Cadastros", "Sistema"].map(grp => {
                const items = filteredMenuItems.filter(m => m.group === grp);
                if (items.length === 0) return null;
                return (
                  <div key={grp}>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 px-3 mb-1.5">{grp}</p>
                    <div className="space-y-0.5">
                      {items.map(({ id, label, Icon }) => {
                        const isActive = activeTab === id;
                        return (
                          <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-all ${
                              isActive ? "bg-[#eff6ff] text-[#2563eb]" : "text-slate-600 hover:bg-[#f8fafc] hover:text-[#0f172a]"
                            }`}>
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#2563eb]" : "text-slate-400"}`} />
                            <span className="truncate">{label}</span>
                            {id === "pendencias" && pendingCount > 0 && (
                              <span className="ml-auto bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
                            )}
                            {id === "faturamento" && approvedCount > 0 && (
                              <span className="ml-auto bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full text-[10px]">{approvedCount}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="border-t border-[#e2e8f0] p-3 space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-500 hover:bg-[#f8fafc] rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" /> Suporte
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-500 hover:bg-[#f8fafc] rounded-lg transition-colors">
              <Settings className="w-4 h-4" /> Configurações
            </button>
            {isDemo && (
              <div className="mt-2 mx-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[10px] font-semibold text-amber-700">Modo Demonstração</p>
                <p className="text-[10px] text-amber-600">Supabase não configurado</p>
              </div>
            )}
          </div>
        </aside>

        {/* ═══════ MAIN CONTENT ═══════ */}
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#f8fafc] border-b border-[#e2e8f0] px-4 lg:px-6 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[#0f172a]">{tabTitles[activeTab] || ""}</h1>
              {activeTab === "dashboard" && <p className="text-xs text-slate-400">Visão geral da operação florestal em tempo real</p>}
            </div>
            {errorHeader && (
              <span className="text-[10px] px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md font-medium animate-pulse">{errorHeader}</span>
            )}
          </div>

          {mustChangePassword && (
            <div className="mx-4 lg:mx-6 mt-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Troca de senha obrigatória</p>
                <p className="text-xs text-amber-600">Por segurança, altere sua senha padrão antes de usar o sistema.</p>
              </div>
            </div>
          )}

          {/* Login notification - summary */}
          {!mustChangePassword && activeTab === "lancamentos" && currentUser && (() => {
            const myLaunches = launches.filter(l => 
              l.operador_codigo === currentUser!.codigo || l.criado_por === currentUser!.email
            );
            const devolvidos = myLaunches.filter(l => l.status === "DEVOLVIDO").length;
            const pendentes = myLaunches.filter(l => l.status === "PENDENTE").length;
            if (devolvidos === 0 && pendentes === 0) return null;
            return (
              <div className="mx-4 lg:mx-6 mt-3 flex gap-3 animate-fadeIn">
                {devolvidos > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-red-700 font-semibold">{devolvidos} lançamento{devolvidos > 1 ? "s" : ""} devolvido{devolvidos > 1 ? "s" : ""} para corrigir</span>
                  </div>
                )}
                {pendentes > 0 && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-700 font-semibold">{pendentes} aguardando aprovação</span>
                  </div>
                )}
              </div>
            );
          })()}

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Carregando SIGOL...</p>
            </div>
          ) : !currentUser ? (
            <div className="h-96 flex items-center justify-center text-xs text-red-500">Nenhum perfil encontrado.</div>
          ) : (
            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6 animate-fadeIn">
              {activeTab === "dashboard" && <DashboardTab launches={launches} equipments={equipments} colaboradores={colaboradores} currentUser={currentUser} forestry={forestry} />}
              {activeTab === "pendencias" && <PendenciasTab launches={launches} equipments={equipments} colaboradores={colaboradores} currentUser={currentUser} onUpdateLaunchStatus={handleUpdateLaunchStatus} onNavigateToTab={setActiveTab} />}
              {activeTab === "lancamentos" && <LancamentosTab launches={launches} equipments={equipments} forestry={forestry} colaboradores={colaboradores} currentUser={currentUser} atividades={atividades} onAddLaunch={handleAddLaunch} onUpdateLaunchStatus={handleUpdateLaunchStatus} onImportLaunchList={handleImportLaunchList} />}
              {activeTab === "controle-mensal" && <ControllingTab launches={launches} colaboradores={colaboradores} equipments={equipments} />}
              {activeTab === "faturamento" && <FaturamentoTab launches={launches} equipments={equipments} currentUser={currentUser} onUpdateLaunchStatus={handleUpdateLaunchStatus} onBulkBill={handleBulkBill} />}
              {activeTab === "equipamentos" && <EquipamentosTab equipments={equipments} launches={launches} currentUser={currentUser} onAddEquipment={handleAddEquipment} />}
              {activeTab === "cadastro-florestal" && <CadastroFlorestalTab forestry={forestry} currentUser={currentUser} onAddForest={handleAddForest} onImportForestList={handleImportForestList} />}
              {activeTab === "colaboradores" && <ColaboradoresTab colaboradores={colaboradores} currentUser={currentUser} onAddColaborador={handleAddColaborador} onImportColaboradorList={handleImportColaboradorList} />}
              {activeTab === "auditoria" && <AuditoriaTab logs={auditLogs} currentUser={currentUser} onClearLogs={handleClearAuditLogs} />}
              {activeTab === "usuarios" && <GestaoUsuariosTab users={users} currentUser={currentUser} onSelectUser={() => {}} onAddUser={handleAddUser} onResetPassword={handleResetPassword} />}
              {activeTab === "atividades" && <AtividadesTab atividades={atividades} currentUser={currentUser} onAddAtividade={handleAddAtividade} onUpdateAtividade={handleUpdateAtividade} onDeleteAtividade={handleDeleteAtividade} />}
              {activeTab === "alterar-senha" && <AlterarSenhaTab currentUser={currentUser} onSuccess={async () => {
                await loadAllData();
                setCurrentUser(prev => prev ? { ...prev, senha_alterada: true } : prev);
              }} />}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#e2e8f0] z-20 flex items-center justify-around py-1.5 px-1">
        {filteredMenuItems.slice(0, 5).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${isActive ? "text-[#2563eb] font-semibold" : "text-slate-400"}`}>
              <Icon className="w-4.5 h-4.5" />
              <span className="truncate max-w-[56px]">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Detail modal */}
      {selectedDetailLaunch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDetailLaunch(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-3 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0f172a]">Boletim #{selectedDetailLaunch.id}</h3>
              <button onClick={() => setSelectedDetailLaunch(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Data:</span> <span className="font-medium">{formatDateBR(selectedDetailLaunch.data)}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className="font-medium">{selectedDetailLaunch.status}</span></div>
              <div><span className="text-slate-400">Operador:</span> <span className="font-medium">{selectedDetailLaunch.operador_nome}</span></div>
              <div><span className="text-slate-400">Frota:</span> <span className="font-medium">{selectedDetailLaunch.frota}</span></div>
              <div><span className="text-slate-400">UP:</span> <span className="font-medium">{selectedDetailLaunch.up}</span></div>
              <div><span className="text-slate-400">Fazenda:</span> <span className="font-medium">{selectedDetailLaunch.fazenda}</span></div>
              <div><span className="text-slate-400">Horas:</span> <span className="font-medium">{selectedDetailLaunch.horas_trabalhadas}h</span></div>
              <div><span className="text-slate-400">Rendimento:</span> <span className="font-medium">{selectedDetailLaunch.rendimento} h/ha</span></div>
            </div>
            {selectedDetailLaunch.observacao && (
              <p className="text-xs text-slate-500 bg-[#f8fafc] p-2 rounded-lg">{selectedDetailLaunch.observacao}</p>
            )}
            <button onClick={() => { setActiveTab("lancamentos"); setSelectedDetailLaunch(null); }}
              className="w-full text-center text-xs text-[#2563eb] hover:text-[#1d4ed8] font-medium py-2">
              Ver na tela de lançamentos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
