import React, { useState } from "react";
import { 
  Users, UserCheck, Shield, Key, AlertCircle, RefreshCw, LogIn, Check, X,
  FileSpreadsheet, Landmark, Tractor, ClipboardCheck, ArrowUpRight, Plus
} from "lucide-react";
import { User, ProfilOption } from "../types";

interface GestaoUsuariosTabProps {
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onAddUser: (u: Omit<User, "id" | "created_at">) => Promise<void>;
}

export default function GestaoUsuariosTab({ 
  users, 
  currentUser, 
  onSelectUser,
  onAddUser 
}: GestaoUsuariosTabProps) {
  
  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    perfil: "OPERADOR" as ProfilOption,
    ativo: true
  });

  // Permissions matrix reference
  const permissionsMatrix = [
    {
      perfil: "OPERADOR",
      createLaunches: "✅ Autorizado",
      consultOwn: "✅ Sim (Apenas próprios)",
      approveLaunches: "❌ Negado",
      changePricesBill: "❌ Negado",
      editCatalogs: "❌ Negado",
      color: "border-amber-200 bg-amber-500"
    },
    {
      perfil: "TÉCNICO",
      createLaunches: "❌ Negado",
      consultOwn: "✅ Sim (Todos os lançamentos)",
      approveLaunches: "✅ Autorizado (Aprovar/Devolver)",
      changePricesBill: "❌ Negado",
      editCatalogs: "❌ Negado",
      color: "border-blue-200 bg-blue-500"
    },
    {
      perfil: "FATURAMENTO",
      createLaunches: "❌ Negado",
      consultOwn: "✅ Sim (Todos os lançamentos)",
      approveLaunches: "❌ Negado",
      changePricesBill: "✅ Autorizado (Gerar medições)",
      editCatalogs: "❌ Negado",
      color: "border-blue-250 bg-blue-500"
    },
    {
      perfil: "GERÊNCIA",
      createLaunches: "❌ Negado",
      consultOwn: "✅ Sim (Consulta Geral)",
      approveLaunches: "❌ Negado",
      changePricesBill: "❌ Negado",
      editCatalogs: "❌ Negado",
      color: "border-purple-200 bg-purple-600"
    }
  ];

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.nome.trim()) return setValidationError("Favor preencher o nome completo.");
    if (!formData.email.trim() || !formData.email.includes("@")) {
      return setValidationError("E-mail corporativo inválido.");
    }

    try {
      await onAddUser({
        nome: formData.nome,
        email: formData.email.trim().toLowerCase(),
        perfil: formData.perfil,
        ativo: formData.ativo
      });

      setShowAddForm(false);
      setFormData({
        nome: "",
        email: "",
        perfil: "OPERADOR",
        ativo: true
      });
    } catch {
      setValidationError("Erro ao registrar usuário.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a] flex items-center space-x-2 font-sans">
            <Users className="w-5 h-5 text-[#2563eb]" />
            <span>Gestão de Acessos e Usuários</span>
          </h1>
          <p className="text-xs text-[#64748b]">
            Gerencie o quadro de colaboradores habilitados. Simule diferentes privilégios de navegação selecionando o usuário ativo abaixo.
          </p>
        </div>

        {/* Create user disabled for GERÊNCIA as they are view-only */}
        {false && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1e293b] text-white font-bold rounded-lg text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* QUICK PERSONA SWAP BAR FOR SYSTEM REVIEW */}
      <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4.5 h-4.5 text-[#2563eb]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0f172a]">Selecione uma Persona de Teste</h3>
          </div>
          <span className="text-[9px] bg-[#2563eb] text-white font-semibold px-2 py-0.5 rounded-full uppercase font-sans font-sans">Reviewer Simulator</span>
        </div>
        <p className="text-xs text-[#64748b] font-semibold leading-relaxed">
          O SIGOL possui controle granular de permissões e relatórios por Perfil (RLS). Clique em qualquer um dos colaboradores reais abaixo para <strong>assumir sua identidade operacional</strong> e avaliar restrições do sistema ao vivo:
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-sans">
          {users.map(u => {
            const isSelected = u.email === currentUser.email;
            let roleColor = "bg-amber-100 text-amber-800 border-amber-250";
            if (u.perfil === "TÉCNICO") roleColor = "bg-blue-100 text-blue-800 border-blue-250";
            if (u.perfil === "FATURAMENTO") roleColor = "bg-[#eff6ff] text-[#2563eb] border-[#d2ebe0]";
            if (u.perfil === "GERÊNCIA") roleColor = "bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0]";

            return (
              <button
                key={u.id}
                onClick={() => onSelectUser(u)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected 
                    ? "bg-white border-[#2d6a4f] ring-2 ring-[#2563eb] shadow-sm transform -translate-y-[1px]" 
                    : "bg-[#f8fafc]/40 hover:bg-white border-[#e2e8f0] hover:border-[#2d6a4f] hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-[#0f172a] text-xs truncate max-w-[120px]">{u.nome}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse" />}
                </div>
                <span className="text-[10px] text-[#64748b] font-semibold truncate mb-2">{u.email}</span>
                
                <div className="flex items-center justify-between w-full mt-auto">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${roleColor}`}>
                    {u.perfil}
                  </span>
                  <span className="text-[9.5px] text-[#2563eb] font-bold flex items-center space-x-0.5">
                    <LogIn className="w-3 h-3 text-[#2563eb]" />
                    <span>{isSelected ? "Ativo" : "Simular"}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Adding Users Forms (Disabled for GERÊNCIA as they are view-only) */}
      {showAddForm && false && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4 font-sans">
          <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]/60">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <Shield className="w-4.5 h-4.5 text-[#2563eb]" />
              <span>Cadastrar Novo Perfil de Acesso</span>
            </h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[#64748b] hover:text-[#0f172a] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2.5 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 font-medium rounded">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: Alexandre Santos"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">E-mail corporativo (@sigol)</label>
              <input
                type="email"
                required
                placeholder="Ex: alexandre@sigol.com.br"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Perfil Operacional / RLS</label>
              <select
                value={formData.perfil}
                onChange={(e) => setFormData(prev => ({ ...prev, perfil: e.target.value as ProfilOption }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] font-bold text-[#0f172a]"
              >
                <option value="OPERADOR">OPERADOR (Apontamentos e consultas históricas)</option>
                <option value="TÉCNICO">TÉCNICO (Auditor de lançamentos e aprovação)</option>
                <option value="FATURAMENTO">FATURAMENTO (Medições operacionais e fechamento)</option>
                <option value="GERÊNCIA">GERÊNCIA (Administração global e cadastros)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="usr_ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb] rounded border-[#e2e8f0] cursor-pointer"
              />
              <label htmlFor="usr_ativo" className="text-[#64748b] font-bold select-none cursor-pointer">Colaborador Ativo no Sistema</label>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end space-x-2 pt-3 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 text-[#64748b] bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] rounded-lg font-bold transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-white bg-[#2563eb] hover:bg-[#204a37] rounded-lg font-bold transition-all text-xs"
              >
                Adicionar e Habilitar Usuário
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TWO SECTIONS: User Registry + Detailed Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* User registry (spanning 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden text-xs">
          <div className="p-3.5 bg-[#f8fafc] border-b border-[#e2e8f0] font-bold text-[#0f172a]">
            Usuários Cadastrados no Banco SIGOL ({users.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">E-mail corporativo</th>
                  <th className="p-3">Perfil de Acesso</th>
                  <th className="p-3 text-center">Permissões de Sistema</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55 font-sans">
                {users.map(u => {
                  let badge = "bg-amber-50 text-amber-800 border-amber-200";
                  if (u.perfil === "TÉCNICO") badge = "bg-blue-50 text-blue-700 border-blue-255";
                  if (u.perfil === "FATURAMENTO") badge = "bg-[#eff6ff] text-[#2563eb] border-[#d2ebe0]";
                  if (u.perfil === "GERÊNCIA") badge = "bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0]";

                  return (
                    <tr key={u.id} className={`hover:bg-[#f8fafc]/30 ${u.email === currentUser.email ? "bg-[#eff6ff]/20" : ""}`}>
                      <td className="p-3 font-semibold text-[#0f172a] flex items-center space-x-1.5">
                        <span>{u.nome}</span>
                        {u.email === currentUser.email && <span className="text-[8px] bg-[#2563eb] text-white font-semibold px-1.5 py-0.5 rounded animate-bounce">VOCÊ</span>}
                      </td>
                      <td className="p-3 font-semibold text-[#64748b] font-mono">{u.email}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badge}`}>
                          {u.perfil}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[#64748b] font-semibold text-[10px]">
                        {u.perfil === "GERÊNCIA" ? "Acesso administrativo ilimitado" :
                         u.perfil === "FATURAMENTO" ? "Valores, medições e notas financeiras" :
                         u.perfil === "TÉCNICO" ? "Revisão e homologação técnica de campo" :
                         "Apenas apontador da própria frota"}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {u.ativo ? (
                          <span className="bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] px-2 py-0.5 rounded-full text-[9px] font-semibold">ATIVO</span>
                        ) : (
                          <span className="bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] px-2 py-0.5 rounded-full text-[9px] font-semibold">INATIVO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permission matrix summary card */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <Key className="w-4.5 h-4.5 text-[#2563eb]" />
              <span>Matriz de Segurança RLS</span>
            </h3>
            <p className="text-xs text-[#64748b] font-medium leading-relaxed">
              Mapeamento de permissões granulares associadas aos perfis de usuários do sistema.
            </p>
          </div>

          <div className="space-y-3 font-sans">
            {permissionsMatrix.map(pm => (
              <div key={pm.perfil} className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] space-y-2">
                <div className="flex items-center space-x-1.5 pb-1 border-b border-[#e2e8f0]/60">
                  <div className={`w-2 h-2 rounded-full ${pm.perfil === "GERÊNCIA" ? "bg-[#1a2e24]" : pm.perfil === "FATURAMENTO" ? "bg-[#2563eb]" : pm.perfil === "TÉCNICO" ? "bg-blue-600" : "bg-amber-500"}`} />
                  <strong className="text-xs text-[#0f172a] uppercase tracking-wide font-semibold">{pm.perfil}</strong>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[#64748b] font-semibold leading-tight">
                  <div>Cria Apontamento:</div>
                  <div className="font-bold text-[#0f172a] text-right">{pm.createLaunches}</div>
                  
                  <div>Consulta Geral:</div>
                  <div className="font-bold text-[#0f172a] text-right">{pm.consultOwn}</div>
                  
                  <div>Aprovação Técnica:</div>
                  <div className="font-bold text-[#0f172a] text-right">{pm.approveLaunches}</div>
                  
                  <div>Valorizar / Faturar:</div>
                  <div className="font-bold text-[#0f172a] text-right">{pm.changePricesBill}</div>
                  
                  <div>Gestão Cadastros:</div>
                  <div className="font-bold text-[#0f172a] text-right">{pm.editCatalogs}</div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
