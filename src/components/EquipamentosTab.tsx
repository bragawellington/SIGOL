import React, { useState } from "react";
import { 
  Tractor, Plus, ShieldCheck, ListPlus, ToggleLeft, ToggleRight, Scale, 
  History, Coins, Hourglass, Landmark, ChevronDown, ChevronUp, Check, X
} from "lucide-react";
import { Equipamento, Lancamento, User } from "../types";
import { formatCurrency, formatDecimal, formatDateBR } from "../utils";

interface EquipamentosTabProps {
  equipments: Equipamento[];
  launches: Lancamento[];
  currentUser: User;
  onAddEquipment: (eq: Omit<Equipamento, "id" | "horas_acumuladas" | "valor_produzido" | "utilizacao_mensal">) => Promise<void>;
}

export default function EquipamentosTab({ equipments, launches, currentUser, onAddEquipment }: EquipamentosTabProps) {
  
  const hasFinancialAccess = currentUser.perfil === "FATURAMENTO" || currentUser.perfil === "GERÊNCIA";

  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedEqId, setExpandedEqId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    frota: "",
    tipo: "Harvester John Deere 1270G",
    chave: "",
    ni: "",
    valor_hora: "",
    ativo: true
  });

  // KPI Fleet totals
  const totalMachines = equipments.length;
  const activeMachines = equipments.filter(e => e.ativo).length;
  const totalFleetHours = Number(equipments.reduce((sum, curr) => sum + (curr.horas_acumuladas || 0), 0).toFixed(1));
  const totalFleetProduced = Number(equipments.reduce((sum, curr) => sum + (curr.valor_produzido || 0), 0).toFixed(2));

  // Handlers
  const handleToggleExpand = (id: string) => {
    setExpandedEqId(prev => (prev === id ? null : id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate fields
    if (!formData.frota.trim()) return setValidationError("Favor colocar a frota.");
    if (!formData.chave.trim()) return setValidationError("Favor colocar a chave física do equipamento.");
    if (!formData.ni.trim()) return setValidationError("Favor inserir o NI.");
    
    const moneyNum = Number(formData.valor_hora);
    if (isNaN(moneyNum) || moneyNum <= 0) {
      return setValidationError("Tarifa do valor hora da máquina deve ser maior do que zero.");
    }

    try {
      await onAddEquipment({
        frota: formData.frota.toUpperCase(),
        tipo: formData.tipo,
        chave: formData.chave.toUpperCase(),
        ni: formData.ni.toUpperCase(),
        valor_hora: moneyNum,
        ativo: formData.ativo
      });

      // Clear states & close
      setShowAddForm(false);
      setFormData({
        frota: "",
        tipo: "Harvester John Deere 1270G",
        chave: "",
        ni: "",
        valor_hora: "",
        ativo: true
      });
    } catch {
      setValidationError("Erro ao registrar máquina.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a] flex items-center space-x-2">
            <Tractor className="w-5 h-5 text-[#2563eb]" />
            <span>Cadastro e Utilização da Frota</span>
          </h1>
          <p className="text-xs text-[#64748b]">
            Máquinas pesadas florestais catalogadas, acompanhamento de tarifas por hora, ociosidade e faturamento produzido.
          </p>
        </div>

        {/* Create disabled for GERÊNCIA as they are view-only */}
        {false && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1e293b] text-white font-bold rounded-lg text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Máquina</span>
          </button>
        )}
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-sans">
        
        {/* KPI: Total Maq */}
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#f8fafc] text-[#2563eb] rounded-lg border border-[#e2e8f0]">
            <Tractor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block tracking-wider">Total Frota / Ativos</span>
            <strong className="text-[#0f172a] text-lg font-bold">{totalMachines} máquinas</strong>
            <span className="text-[10px] text-[#64748b] block font-semibold">{activeMachines} em campo</span>
          </div>
        </div>

        {/* KPI: Horas Acumuladas */}
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#fef9c3] text-amber-800 rounded-lg border border-yellow-200">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block tracking-wider">Horas Acumuladas</span>
            <strong className="text-[#0f172a] text-lg font-bold">{formatDecimal(totalFleetHours, 1)}h</strong>
            <span className="text-[10px] text-[#64748b] block font-semibold">acumulado de boletins</span>
          </div>
        </div>

        {/* KPI: Valor Produzido */}
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-[#2563eb] rounded-lg border border-[#d2ebe0]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block tracking-wider">
              {hasFinancialAccess ? "Faturamento Acumulado" : "Média de Horas"}
            </span>
            <strong className="text-[#0f172a] text-lg font-bold">
              {hasFinancialAccess 
                ? formatCurrency(totalFleetProduced) 
                : `${formatDecimal(totalMachines > 0 ? totalFleetHours / totalMachines : 0, 1)}h`}
            </strong>
            <span className="text-[10px] text-[#64748b] block font-semibold">
              {hasFinancialAccess ? "total faturado oficial" : "média por máquina da frota"}
            </span>
          </div>
        </div>

        {/* KPI: Valor Faturamento Média */}
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-blue-700 rounded-lg border border-blue-100">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block tracking-wider">
              {hasFinancialAccess ? "Receita p/ Ativo" : "Máquinas Ativas"}
            </span>
            <strong className="text-[#0f172a] text-lg font-bold">
              {hasFinancialAccess 
                ? formatCurrency(totalMachines > 0 ? Number((totalFleetProduced / totalMachines).toFixed(2)) : 0)
                : `${activeMachines} maq.`}
            </strong>
            <span className="text-[10px] text-[#64748b] block font-semibold">
              {hasFinancialAccess ? "média por recurso" : "disponíveis em campo"}
            </span>
          </div>
        </div>

      </div>

      {/* Gerência Collapsible Creation Form (Disabled for GERÊNCIA as they are view-only) */}
      {showAddForm && false && (
        <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4 font-sans">
          <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <ListPlus className="w-5 h-5 text-[#2563eb]" />
              <span>Cadastrar Novo Equipamento</span>
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#64748b] hover:text-[#0f172a]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-xs text-rose-700 font-bold">
              {validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-[#0f172a] font-medium">
            {/* Frota code */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Código Frota</label>
              <input
                type="text"
                required
                placeholder="Ex: FRT-209"
                value={formData.frota}
                onChange={(e) => setFormData(prev => ({ ...prev, frota: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-bold"
              />
            </div>

            {/* Tipo Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Tipo Equipamento</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden"
              >
                <option value="Harvester John Deere 1270G">Harvester John Deere 1270G</option>
                <option value="Forwarder Komatsu 895">Forwarder Komatsu 895</option>
                <option value="Harvester Ponsse Ergo">Harvester Ponsse Ergo</option>
                <option value="Feller Buncher CAT 521B">Feller Buncher CAT 521B</option>
                <option value="Chipping Truck Wood">Chipping Truck Wood (Picador)</option>
                <option value="Trator Florestal Valmet">Trator Florestal Valmet</option>
              </select>
            </div>

            {/* Chave de Equipamento */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Chave Física Equipamento</label>
              <input
                type="text"
                required
                placeholder="Ex: CHV-JD1270"
                value={formData.chave}
                onChange={(e) => setFormData(prev => ({ ...prev, chave: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-bold"
              />
            </div>

            {/* NI */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Série / Número de Identificação (NI)</label>
              <input
                type="text"
                required
                placeholder="Ex: NI-84812"
                value={formData.ni}
                onChange={(e) => setFormData(prev => ({ ...prev, ni: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden"
              />
            </div>

            {/* Tarifa / valor hora */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Tarifa Ativa (Valor/Hora R$)</label>
              <input
                type="number"
                required
                placeholder="Ex: 340.00"
                value={formData.valor_hora}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_hora: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-mono font-bold"
              />
            </div>

            {/* Ativo checkbox */}
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="eq_ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb] rounded border-[#e2e8f0]"
              />
              <label htmlFor="eq_ativo" className="text-[#64748b] font-bold select-none cursor-pointer">Disponibilizar para Lançamentos</label>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end space-x-2 pt-3 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 text-[#64748b] bg-[#f8fafc] hover:bg-[#e2ece6] rounded-lg font-bold border border-[#e2e8f0]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-white bg-[#2563eb] hover:bg-[#1e293b] rounded-lg font-bold shadow-xs"
              >
                Cadastrar Máquina
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Catalog with utilization stats indicators */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                <th className="p-3 w-8"></th>
                <th className="p-3">Frota</th>
                <th className="p-3">Equipamento / Modelo</th>
                <th className="p-3">Chave Física</th>
                <th className="p-3">Série NI</th>
                {hasFinancialAccess && <th className="p-3">Valor / Hora (R$)</th>}
                <th className="p-3 text-center">Horas Acumuladas</th>
                {hasFinancialAccess && <th className="p-3 font-semibold text-[#0f172a]">Total Faturado</th>}
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Estatísticas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2ece6]/55">
              {equipments.map(eq => {
                const isExpanded = expandedEqId === eq.id;
                // find related history
                const machineHistory = launches
                  .filter(l => l.frota === eq.frota)
                  .sort((a, b) => b.data.localeCompare(a.data));

                return (
                  <React.Fragment key={eq.id}>
                    <tr className="hover:bg-[#f8fafc]/45 transition-colors">
                      
                      {/* Dropdown toggle button */}
                      <td className="p-3 text-center">
                        <button onClick={() => handleToggleExpand(eq.id)} className="p-1 hover:bg-[#e2ece6] rounded text-[#64748b] hover:text-[#0f172a]">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Frota */}
                      <td className="p-3 font-mono font-semibold text-[#2563eb]">
                        {eq.frota}
                      </td>

                      {/* Tipo description */}
                      <td className="p-3 font-semibold text-[#0f172a]">
                        {eq.tipo}
                      </td>

                      {/* Chave */}
                      <td className="p-3 font-mono font-bold text-[#64748b]">
                        {eq.chave}
                      </td>

                      {/* NI */}
                      <td className="p-3 font-mono font-bold text-[#64748b]">
                        {eq.ni}
                      </td>

                      {/* Hourly rate */}
                      {hasFinancialAccess && (
                        <td className="p-3 font-mono font-semibold text-[#0f172a]">
                          {formatCurrency(eq.valor_hora)}
                        </td>
                      )}

                      {/* Accumulated hours */}
                      <td className="p-3 text-center font-semibold text-[#0f172a] font-mono">
                        {eq.horas_acumuladas || 0}h
                      </td>

                      {/* Total Billed Produced */}
                      {hasFinancialAccess && (
                        <td className="p-3 font-mono font-semibold text-[#2563eb]">
                          {formatCurrency(eq.valor_produzido)}
                        </td>
                      )}

                      {/* Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {eq.ativo ? (
                          <span className="bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] px-2 py-0.5 rounded-md text-[9px] font-semibold">ATIVO</span>
                        ) : (
                          <span className="bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] px-2 py-0.5 rounded-md text-[9px] font-semibold">INATIVO</span>
                        )}
                      </td>

                      {/* Statistics utility quick check */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleExpand(eq.id)}
                          className="inline-flex items-center space-x-1 p-1 px-2.5 bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] rounded-md text-[9.5px] text-[#2563eb] font-bold font-sans hover:text-[#1c4733]"
                        >
                          <History className="w-3 h-3 text-[#2563eb]" />
                          <span>Histórico ({machineHistory.length})</span>
                        </button>
                      </td>

                    </tr>

                    {/* Collapsible Utilisation History panel */}
                    {isExpanded && (
                      <tr className="animate-fade-in">
                        <td colSpan={10} className="p-0 bg-[#f8fafc]/40">
                          <div className="p-4 bg-[#f8fafc]/50 border-y border-[#e2e8f0] font-sans space-y-3">
                            <h4 className="text-[11px] font-bold text-[#2563eb] uppercase tracking-wider flex items-center space-x-1.5">
                              <History className="w-4 h-4 text-[#2563eb]" />
                              <span>Logs e Histórico de Utilização para {eq.frota} ({eq.tipo})</span>
                            </h4>
                            
                            {/* Short History tables */}
                            <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden shadow-xs">
                              {machineHistory.length > 0 ? (
                                <table className="w-full text-left border-collapse text-[10.5px]">
                                  <thead>
                                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] font-bold text-[#2563eb]">
                                      <th className="p-2">Data</th>
                                      <th className="p-2">Turno/Operador</th>
                                      <th className="p-2">Unidade Prod (UP)</th>
                                      <th className="p-2">Atividade Operada</th>
                                      <th className="p-2 text-center">Horímetro Inicial</th>
                                      <th className="p-2 text-center">Horímetro Final</th>
                                      <th className="p-2 text-center font-bold">Duração (h)</th>
                                      <th className="p-2 text-center">Situação boletim</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#e2ece6]/55 text-[#64748b]">
                                    {machineHistory.map(entry => (
                                      <tr key={entry.id} className="hover:bg-[#f8fafc]/30">
                                        <td className="p-2 font-bold text-[#0f172a]">{formatDateBR(entry.data)}</td>
                                        <td className="p-2 font-medium">{entry.operador_nome} ({entry.operador_codigo})</td>
                                        <td className="p-2 font-semibold text-[#0f172a]">{entry.up}</td>
                                        <td className="p-2 font-semibold">{entry.atividade}</td>
                                        <td className="p-2 text-center font-mono font-bold">{entry.horimetro_inicial}</td>
                                        <td className="p-2 text-center font-mono font-bold">{entry.horimetro_final}</td>
                                        <td className="p-2 text-center font-bold font-mono text-[#2563eb]">{entry.horas_trabalhadas}h</td>
                                        <td className="p-2 text-center">
                                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-semibold ${
                                            entry.status === "FATURADO" ? "bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0]" :
                                            entry.status === "APROVADO" ? "bg-[#eff6ff] text-blue-700 border border-blue-100" :
                                            entry.status === "DEVOLVIDO" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-amber-50 text-amber-700 border border-amber-200"
                                          }`}>
                                            {entry.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-6 text-center text-[#64748b] text-xs font-semibold">Sem atividades registradas para este equipamento no período atual.</div>
                              )}
                            </div>
                            
                            {/* Small math metrics per equipment */}
                            <div className="grid grid-cols-3 gap-4 text-[10px] font-bold text-[#64748b]">
                              <div className="p-2 bg-white rounded-lg border border-[#e2e8f0] shadow-xs">
                                <span className="block text-[#64748b] text-[9px] uppercase">EFICIÊNCIA MENSAL</span>
                                <span className="text-[#0f172a] text-xs font-bold font-mono">
                                  {formatDecimal(eq.utilizacao_mensal, 1)}% da quota standard (180h)
                                </span>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-[#e2e8f0] font-mono shadow-xs">
                                <span className="block text-[#64748b] text-[9px] uppercase font-sans">TARIFAMENTO ATIVO</span>
                                <span className="text-[#2563eb] text-xs font-bold">{formatCurrency(eq.valor_hora)} / hora</span>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-[#e2e8f0] font-mono shadow-xs">
                                <span className="block text-[#64748b] text-[9px] uppercase font-sans">TARIFA SÉRIE NI</span>
                                <span className="text-[#0f172a] text-xs font-bold">{eq.ni}</span>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
