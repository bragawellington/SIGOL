import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Activity } from "lucide-react";
import { Atividade, User } from "../types";

interface AtividadesTabProps {
  atividades: Atividade[];
  currentUser: User;
  onAddAtividade: (atv: Omit<Atividade, "id">) => Promise<void>;
  onUpdateAtividade: (id: string, atv: Partial<Atividade>) => Promise<void>;
  onDeleteAtividade: (id: string) => Promise<void>;
}

export default function AtividadesTab({ atividades, currentUser, onAddAtividade, onUpdateAtividade, onDeleteAtividade }: AtividadesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUser.perfil === "GERÊNCIA" || currentUser.perfil === "FATURAMENTO";

  const handleAdd = async () => {
    if (!nome.trim()) { setError("Informe o nome da atividade."); return; }
    if (atividades.some(a => a.nome.toLowerCase() === nome.trim().toLowerCase())) { setError("Atividade já cadastrada."); return; }
    try {
      await onAddAtividade({ nome: nome.trim(), descricao: descricao.trim() || undefined, ativo: true });
      setNome(""); setDescricao(""); setShowForm(false); setError(null);
    } catch { setError("Erro ao cadastrar."); }
  };

  const handleStartEdit = (atv: Atividade) => {
    setEditingId(atv.id);
    setNome(atv.nome);
    setDescricao(atv.descricao || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !nome.trim()) return;
    try {
      await onUpdateAtividade(editingId, { nome: nome.trim(), descricao: descricao.trim() || undefined });
      setEditingId(null); setNome(""); setDescricao("");
    } catch { setError("Erro ao atualizar."); }
  };

  const handleToggle = async (atv: Atividade) => {
    await onUpdateAtividade(atv.id, { ativo: !atv.ativo });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir esta atividade permanentemente?")) {
      await onDeleteAtividade(id);
    }
  };

  const ativas = atividades.filter(a => a.ativo);
  const inativas = atividades.filter(a => !a.ativo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#64748b]">{ativas.length} ativas • {inativas.length} inativas</p>
        </div>
        {canManage && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setNome(""); setDescricao(""); setError(null); }}
            className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nova Atividade
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {(showForm || editingId) && canManage && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3 animate-fadeIn">
          <h3 className="text-sm font-semibold text-[#0f172a]">{editingId ? "Editar Atividade" : "Nova Atividade"}</h3>
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Nome da Atividade *</label>
              <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); setError(null); }}
                placeholder="Ex: Preparo de Solo"
                className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Descrição (opcional)</label>
              <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Harvester, Feller Buncher..."
                className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={editingId ? handleSaveEdit : handleAdd}
              className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
              <Check className="w-3.5 h-3.5" /> {editingId ? "Salvar" : "Cadastrar"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setNome(""); setDescricao(""); setError(null); }}
              className="flex items-center gap-1.5 bg-[#f8fafc] hover:bg-[#e2e8f0] text-[#64748b] text-xs font-medium px-4 py-2 rounded-lg border border-[#e2e8f0] transition-colors">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] text-[#64748b] font-semibold uppercase tracking-wider">
                <th className="p-3">Atividade</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-center">Status</th>
                {canManage && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {atividades.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-[#94a3b8]">Nenhuma atividade cadastrada.</td></tr>
              ) : (
                atividades.map(atv => (
                  <tr key={atv.id} className={`hover:bg-[#f8fafc] transition-colors ${!atv.ativo ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${atv.ativo ? "text-[#2563eb]" : "text-[#94a3b8]"}`} />
                        <span className="font-semibold text-[#0f172a]">{atv.nome}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[#64748b]">{atv.descricao || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${atv.ativo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {atv.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleStartEdit(atv)} title="Editar"
                            className="p-1.5 hover:bg-[#eff6ff] rounded-lg text-[#64748b] hover:text-[#2563eb] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleToggle(atv)} title={atv.ativo ? "Desativar" : "Ativar"}
                            className={`p-1.5 rounded-lg transition-colors ${atv.ativo ? "hover:bg-amber-50 text-[#64748b] hover:text-amber-600" : "hover:bg-green-50 text-[#64748b] hover:text-green-600"}`}>
                            {atv.ativo ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(atv.id)} title="Excluir"
                            className="p-1.5 hover:bg-red-50 rounded-lg text-[#64748b] hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
