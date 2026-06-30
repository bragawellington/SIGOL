import { LOGO_BASE64 } from "../lib/logoBase64";
import React, { useState, useEffect } from "react";
import { 
  CheckSquare, Square, DollarSign, CreditCard, ChevronDown, Check,
  Percent, ArrowRightCircle, ShieldCheck, Download, Calendar, Tractor,
  Receipt, Filter, ListChecks, HelpCircle, Coins, Trash2, FileSpreadsheet, Pencil, X
} from "lucide-react";
import { Lancamento, Equipamento, User } from "../types";
import { formatCurrency, formatDecimal, formatDateBR, exportToCSV } from "../utils";
import { supabase, isDemo } from "../lib/supabase";

interface FaturamentoTabProps {
  launches: Lancamento[];
  equipments: Equipamento[];
  currentUser: User;
  onUpdateLaunchStatus: (
    id: string,
    status: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO",
    obs?: string,
    rate?: number,
    horas_sap?: number,
    otherFields?: Partial<Lancamento>
  ) => Promise<void>;
  onBulkBill: (ids: string[], rateOverride?: number) => Promise<void>;
}

export default function FaturamentoTab({ 
  launches, 
  equipments, 
  currentUser, 
  onUpdateLaunchStatus, 
  onBulkBill 
}: FaturamentoTabProps) {
  
  // States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rateOverride, setRateOverride] = useState("");
  const [discountVal, setDiscountVal] = useState(""); // Ajuste/Desconto em R$
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [clientName, setClientName] = useState("");
  const [boletimNumber, setBoletimNumber] = useState<number | null>(null);

  // Editing individual billed items states
  const [editingLaunch, setEditingLaunch] = useState<Lancamento | null>(null);
  const [editData, setEditData] = useState("");
  const [editFrota, setEditFrota] = useState("");
  const [editUp, setEditUp] = useState("");
  const [editHoursSap, setEditHoursSap] = useState<number>(0);
  const [editRate, setEditRate] = useState<number>(0);
  const [editObs, setEditObs] = useState("");
  const [editHorimetroInicial, setEditHorimetroInicial] = useState<number>(0);
  const [editHorimetroFinal, setEditHorimetroFinal] = useState<number>(0);
  const [editAtividade, setEditAtividade] = useState("");
  const [editOperadorCodigo, setEditOperadorCodigo] = useState("");
  const [editOperadorNome, setEditOperadorNome] = useState("");
  const [editStatus, setEditStatus] = useState<"PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO">("APROVADO");

  const handleStartEdit = (launch: Lancamento) => {
    setEditingLaunch(launch);
    setEditData(launch.data);
    setEditFrota(launch.frota);
    setEditUp(launch.up);
    setEditHoursSap(launch.horas_sap);
    const standardRate = equipments.find(e => e.frota === launch.frota)?.valor_hora || 0;
    setEditRate(launch.valor_hora_faturamento || standardRate);
    setEditObs(launch.observacao || "");
    setEditHorimetroInicial(launch.horimetro_inicial || 0);
    setEditHorimetroFinal(launch.horimetro_final || 0);
    setEditAtividade(launch.atividade || "");
    setEditOperadorCodigo(launch.operador_codigo || "");
    setEditOperadorNome(launch.operador_nome || "");
    setEditStatus(launch.status);
  };

  const handleSaveEditBilled = async () => {
    if (!editingLaunch) return;
    try {
      await onUpdateLaunchStatus(
        editingLaunch.id,
        editStatus,
        editObs,
        editRate,
        editHoursSap,
        {
          data: editData,
          frota: editFrota,
          up: editUp,
          horimetro_inicial: editHorimetroInicial,
          horimetro_final: editHorimetroFinal,
          atividade: editAtividade,
          operador_codigo: editOperadorCodigo,
          operador_nome: editOperadorNome,
        }
      );
      setEditingLaunch(null);
    } catch (err) {
      console.error(err);
      alert("Falha ao salvar edições do faturamento.");
    }
  };
  
  // Filter States
  const [filterFrota, setFilterFrota] = useState("ALL");
  const [filterUP, setFilterUP] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const approvedLaunches = launches.filter(l => l.status === "APROVADO");
  const billedLaunches = launches.filter(l => l.status === "FATURADO");

  // Get standard hourly rate for equipment
  const getStandardRate = (frota: string) => {
    return equipments.find(e => e.frota === frota)?.valor_hora || 0;
  };

  // Filter approved launches
  const filteredApproved = approvedLaunches.filter(l => {
    const matchesFrota = filterFrota === "ALL" || l.frota === filterFrota;
    const matchesUP = filterUP === "ALL" || l.up === filterUP;
    const matchesStart = !startDate || l.data >= startDate;
    const matchesEnd = !endDate || l.data <= endDate;
    return matchesFrota && matchesUP && matchesStart && matchesEnd;
  });

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filteredApproved.map(l => l.id);
    const allSelectedInFiltered = currentFilteredIds.every(id => selectedIds.includes(id));

    if (allSelectedInFiltered) {
      // Remove all filtered ids
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      // Add missing filtered ids
      setSelectedIds(prev => {
        const union = new Set([...prev, ...currentFilteredIds]);
        return Array.from(union);
      });
    }
  };

  // Bulk Invoice action
  const handleBillInBulk = async () => {
    if (selectedIds.length === 0) return;
    
    const override = rateOverride.trim() ? Number(rateOverride) : undefined;
    if (override !== undefined && (isNaN(override) || override <= 0)) {
      alert("O valor da tarifa unificada de lote fornecida é inválido.");
      return;
    }

    const totalHoursCalculated = selectedLaunches.reduce((sum, l) => sum + l.horas_sap, 0);
    const discount = Number(discountVal) || 0;
    const rawTotal = selectedLaunches.reduce((sum, l) => {
      const rate = override !== undefined ? override : getStandardRate(l.frota);
      return sum + (l.horas_sap * rate);
    }, 0);
    const finalTotal = Math.max(0, rawTotal - discount);

    const confirmMsg = `Deseja consolidar e faturar o Lote de Medição com os seguintes dados?

- Total de Apontamentos: ${selectedIds.length} boletins
- Total de Horas Medidas: ${totalHoursCalculated.toFixed(1)}h
- Tarifa Aplicada: ${override !== undefined ? `Unificada a R$ ${override}/h` : "Standard por Equipamento"}
${discount > 0 ? `- Ajuste/Desconto Operacional: R$ ${discount.toFixed(2)}\n` : ""}- Valor Total Líquido do Lote: ${formatCurrency(finalTotal)}

Confirmar faturamento oficial?`;

    if (window.confirm(confirmMsg)) {
      setSubmittingBulk(true);
      try {
        await onBulkBill(selectedIds, override);
        setSelectedIds([]);
        setRateOverride("");
        setDiscountVal("");
      } finally {
        setSubmittingBulk(false);
      }
    }
  };

  // Export Billed History CSV
  const handleExportHistory = () => {
    const headers = [
      "ID", "Data", "Frota", "Equipamento", "UP", "Fazenda", "Hor. Inicial", "Hor. Final",
      "Horas SAP", "Valor Tarifa (R$)", "Faturamento Total (R$)", "Operador", "Faturado Por", "Faturado Em"
    ];

    const rows = billedLaunches.map(l => [
      l.id, l.data, l.frota, l.equipamento || l.frota, l.up, l.fazenda || "", l.horimetro_inicial, l.horimetro_final,
      l.horas_sap, l.valor_hora_faturamento, l.valor_total_faturamento, `${l.operador_codigo} - ${l.operador_nome}`, l.faturado_por, l.faturado_em
    ]);

    exportToCSV("Historico_Faturamento_SIGOL", headers, rows);
  };

  // Selected Launches details for real-time receipt
  const selectedLaunches = approvedLaunches.filter(l => selectedIds.includes(l.id));

  const handleExportSelectedExcel = () => {
    if (selectedLaunches.length === 0) return;

    const headers = [
      "ID Boletim", 
      "Data", 
      "Frota", 
      "Equipamento", 
      "UP / Projeto", 
      "Fazenda / Núcleo", 
      "Atividade", 
      "Horímetro Inicial",
      "Horímetro Final",
      "Horas Medidas", 
      "Tarifa Aplicada (R$/h)", 
      "Valor Total (R$)", 
      "Operador"
    ];

    const rows = selectedLaunches.map(l => {
      const rate = overrideNum !== null ? overrideNum : getStandardRate(l.frota);
      const totalCost = l.horas_sap * rate;
      return [
        l.id,
        formatDateBR(l.data),
        l.frota,
        l.equipamento || l.frota,
        l.up,
        `${l.fazenda || ""} / ${l.nucleo || ""}`,
        l.atividade,
        l.horimetro_inicial,
        l.horimetro_final,
        l.horas_sap,
        rate,
        totalCost,
        `${l.operador_codigo} - ${l.operador_nome}`
      ];
    });

    exportToCSV("Planilha_Medicao_Selecionada_SIGOL", headers, rows);
  };

  // Calculate real-time totals for the receipt
  const totalHours = selectedLaunches.reduce((sum, l) => sum + l.horas_sap, 0);
  const overrideNum = rateOverride.trim() ? Number(rateOverride) : null;
  
  // Group selected by equipment model for visual receipt breakdown
  const receiptBreakdown = selectedLaunches.reduce((groups, l) => {
    const rate = overrideNum !== null ? overrideNum : getStandardRate(l.frota);
    const itemCost = l.horas_sap * rate;
    
    if (!groups[l.frota]) {
      groups[l.frota] = {
        frota: l.frota,
        tipo: l.equipamento,
        horas: 0,
        tarifa: rate,
        total: 0
      };
    }
    groups[l.frota].horas += l.horas_sap;
    groups[l.frota].total += itemCost;
    return groups;
  }, {} as { [frota: string]: { frota: string; tipo: string; horas: number; tarifa: number; total: number } });

  const grossTotal = Object.values(receiptBreakdown).reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Number(discountVal) || 0;
  const netTotal = Math.max(0, grossTotal - discountAmount);

  // List of unique frotas and UPs for filters
  const frotasList = Array.from(new Set(approvedLaunches.map(l => l.frota)));
  const upsList = Array.from(new Set(approvedLaunches.map(l => l.up)));

  const mainContent = (
    <div className="space-y-6 font-sans">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a]">Faturamento de Serviços Operacionais</h1>
          <p className="text-xs text-[#64748b]">Gere boletins de medição oficiais, unifique tarifas e emita o histórico faturamento técnico.</p>
        </div>
      </div>

      {/* Permission Check for Faturamento & Gerência */}
      {currentUser.perfil !== "FATURAMENTO" && currentUser.perfil !== "GERÊNCIA" ? (
        <div className="p-6 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-[#2563eb] mx-auto" />
          <h3 className="text-sm font-bold text-[#0f172a]">Acesso Restrito ao Setor Financeiro</h3>
          <p className="text-xs text-[#64748b] max-w-md mx-auto leading-relaxed">
            O seu perfil atual (<strong>{currentUser.perfil}</strong>) possui permissões de visualização e apontamento operacional. A definição de faturamentos, preços e boletins de medição financeira é restrita aos perfis de <strong>FATURAMENTO</strong> e <strong>GERÊNCIA</strong>. Modifique seu perfil no canto superior caso necessário.
          </p>
        </div>
      ) : (
        <>
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT / CENTER: Bulletins selection and filters (span 2) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Interactive Filter Panel */}
              <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-[#2563eb] font-bold text-xs uppercase tracking-wider">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar Boletins Disponíveis</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Período (De)</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Período (Até)</label>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#0f172a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Frota</label>
                    <select
                      value={filterFrota}
                      onChange={(e) => setFilterFrota(e.target.value)}
                      className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-bold text-[#2563eb]"
                    >
                      <option value="ALL">Todas as Frotas</option>
                      {frotasList.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Projeto (UP)</label>
                    <select
                      value={filterUP}
                      onChange={(e) => setFilterUP(e.target.value)}
                      className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-bold text-[#2563eb]"
                    >
                      <option value="ALL">Todas as UPs</option>
                      {upsList.map(up => (
                        <option key={up} value={up}>{up}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table of approved bulletins */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden">
                <div className="p-3 bg-[#f8fafc]/65 border-b border-[#e2e8f0] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#0f172a]">
                    Boletins Técnicos Aprovados ({filteredApproved.length})
                  </span>
                  {selectedIds.length > 0 && (
                    <button 
                      onClick={() => setSelectedIds([])}
                      className="text-[10px] text-[#b70303] hover:underline font-bold"
                    >
                      Limpar seleção ({selectedIds.length})
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <button onClick={handleSelectAll} className="p-1 hover:bg-[#e2ece6] rounded">
                            {filteredApproved.length > 0 && filteredApproved.every(l => selectedIds.includes(l.id)) ? (
                              <CheckSquare className="w-4 h-4 text-[#2563eb]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#64748b]" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Frota / Recurso</th>
                        <th className="p-3">UP / Fazenda</th>
                        <th className="p-3 text-center">Horas Medidas</th>
                        <th className="p-3">Tarifa Standard</th>
                        <th className="p-3 text-right">Valor Total</th>
                        {currentUser.perfil === "FATURAMENTO" && <th className="p-3 text-center">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2ece6]/55">
                      {filteredApproved.length > 0 ? (
                        filteredApproved.map(launch => {
                          const standardRate = getStandardRate(launch.frota);
                          const totalStandard = launch.horas_sap * standardRate;
                          const isSelected = selectedIds.includes(launch.id);

                          return (
                            <tr 
                              key={launch.id} 
                              onClick={() => handleToggleSelect(launch.id)}
                              className={`hover:bg-[#f8fafc]/30 transition-colors cursor-pointer select-none ${isSelected ? "bg-[#eff6ff]/40" : ""}`}
                            >
                              
                              {/* Checkbox column */}
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleToggleSelect(launch.id)} className="p-1 hover:bg-[#e2ece6] rounded text-[#0f172a]">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[#2563eb]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#e2ece6]" />
                                  )}
                                </button>
                              </td>

                              {/* Data */}
                              <td className="p-3 whitespace-nowrap font-bold text-[#0f172a]">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                                  <span>{formatDateBR(launch.data)}</span>
                                </div>
                              </td>

                              {/* Equip */}
                              <td className="p-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono bg-[#f8fafc] text-[#2563eb] border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                    {launch.frota}
                                  </span>
                                  <span className="text-[#0f172a] font-semibold truncate max-w-[140px]" title={launch.equipamento || ""}>
                                    {(launch.equipamento || launch.frota).split(" ")[0]}
                                  </span>
                                </div>
                              </td>

                              {/* Project UP */}
                              <td className="p-3">
                                <span className="font-bold text-[#0f172a]">{launch.up}</span>
                                <span className="block text-[10px] text-[#64748b] font-medium">{launch.fazenda}</span>
                              </td>

                              {/* Hours */}
                              <td className="p-3 text-center font-semibold text-[#0f172a] font-mono">
                                {launch.horas_sap}h
                              </td>

                              {/* Tarifa default */}
                              <td className="p-3 font-mono text-[#64748b]">
                                {formatCurrency(standardRate)}
                              </td>

                              {/* Total Standard */}
                              <td className="p-3 text-right font-mono font-semibold text-[#0f172a]">
                                {formatCurrency(totalStandard)}
                              </td>

                              {/* Actions */}
                              {currentUser.perfil === "FATURAMENTO" && (
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleStartEdit(launch)}
                                    className="p-1.5 bg-slate-100 hover:bg-[#eff6ff] text-[#64748b] hover:text-[#2563eb] border border-slate-200 hover:border-[#2d6a4f]/30 rounded-lg transition-all cursor-pointer"
                                    title="Ajustar dados do faturamento"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}

                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={currentUser.perfil === "FATURAMENTO" ? 8 : 7} className="p-8 text-center text-[#64748b] font-semibold">
                            Nenhum boletim aprovado para faturamento com os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Resumo da Medição (Sticky Receipt Widget) */}
            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-[#2d6a4f]/70 rounded-xl shadow-md overflow-hidden sticky top-6">
                
                {/* Receipt Header */}
                <div className="bg-[#2563eb] text-white p-4 text-center space-y-1 relative">
                  <div className="absolute top-3 left-3 opacity-25">
                    <Receipt className="w-10 h-10" />
                  </div>
                  <h3 className="text-xs uppercase font-semibold tracking-widest text-[#d2ebe0]">
                    Boletim de Medição Florestal
                  </h3>
                  <p className="text-xl font-semibold">Resumo do Lote</p>
                  <p className="text-[10px] text-[#d2ebe0]/95 font-medium">SIGOL Gestão Operacional &bull; Financeiro</p>
                </div>

                {selectedIds.length > 0 ? (
                  <div className="p-5 space-y-5">
                    
                    {/* Items counters */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                      <div>
                        <span className="block text-[9px] font-semibold text-[#64748b] uppercase tracking-wider">Boletins Selecionados</span>
                        <strong className="text-base font-semibold text-[#0f172a]">{selectedIds.length}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] font-semibold text-[#64748b] uppercase tracking-wider">Total de Horas</span>
                        <strong className="text-base font-semibold text-[#2563eb]">{totalHours.toFixed(1)}h</strong>
                      </div>
                    </div>

                    {/* Breakdown by Equipment */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider block">
                        Breakdown por Frota
                      </span>
                      
                      <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 divide-y divide-[#e2ece6]/50">
                        {Object.values(receiptBreakdown).map(item => (
                          <div key={item.frota} className="flex justify-between text-xs pt-1.5 items-center">
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className="font-mono bg-[#f8fafc] border border-[#e2e8f0] text-[#2563eb] font-semibold text-[9px] px-1 py-0.5 rounded">
                                  {item.frota}
                                </span>
                                <span className="font-semibold text-[#0f172a] truncate max-w-[120px]">
                                  {item.tipo.split(" ")[0]}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#64748b] font-semibold">{item.horas.toFixed(1)}h @ {formatCurrency(item.tarifa)}/h</span>
                            </div>
                            <strong className="font-mono font-semibold text-[#0f172a]">{formatCurrency(item.total)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Billing configuration inputs */}
                    <div className="pt-3 border-t border-dashed border-[#e2e8f0] space-y-3">
                      <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider block">
                        Ajustes de Medição
                      </span>

                      {/* Unified Rate Override */}
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">
                          Tarifa Unificada por Hora (Opcional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[10px] font-bold text-[#64748b]">R$/h:</span>
                          <input
                            type="number"
                            placeholder="Manter tarifas padrões das frotas"
                            value={rateOverride}
                            onChange={(e) => setRateOverride(e.target.value)}
                            className="w-full pl-12 pr-2 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-[#0f172a] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                          />
                        </div>
                      </div>

                      {/* Discount Val */}
                      <div>
                        <label className="block text-[9px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">
                          Ajuste / Desconto Operacional Bruto (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[10px] font-bold text-[#64748b]">BRL:</span>
                          <input
                            type="number"
                            placeholder="Desconto ou glosa administrativa"
                            value={discountVal}
                            onChange={(e) => setDiscountVal(e.target.value)}
                            className="w-full pl-12 pr-2 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-[#b70303] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Receipt Summary Table */}
                    <div className="pt-4 border-t-2 border-double border-[#e2e8f0] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#64748b]">
                        <span>Soma Bruta das Horas:</span>
                        <span className="font-mono">{formatCurrency(grossTotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-[#b70303]">
                          <span>Glosa / Desconto:</span>
                          <span className="font-mono font-bold">- {formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base pt-1.5 font-semibold text-[#0f172a] border-t border-dotted border-[#e2e8f0]">
                        <span>VALOR LÍQUIDO:</span>
                        <span className="font-mono text-[#2563eb]">{formatCurrency(netTotal)}</span>
                      </div>
                    </div>

                    {/* Document generation options */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dotted border-[#e2e8f0]">
                      <button
                        onClick={handleExportSelectedExcel}
                        className="py-2.5 px-3 bg-white hover:bg-[#f8fafc] text-[#2563eb] border border-[#2d6a4f]/45 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Exportar itens selecionados para Excel (CSV)"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <span>Gerar Excel</span>
                      </button>
                      
                      <button
                        onClick={async () => {
                          if (!isDemo && supabase) {
                            const { data } = await supabase.rpc('proximo_boletim');
                            setBoletimNumber(data || Date.now());
                          } else {
                            setBoletimNumber(launches.filter(l => l.status === "FATURADO").length + 1);
                          }
                          setShowPrintPreview(true);
                        }}
                        className="py-2.5 px-3 bg-white hover:bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0] rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Visualizar e Imprimir Boletim de Medição em PDF"
                      >
                        <Download className="w-4 h-4 text-[#2563eb]" />
                        <span>Gerar PDF</span>
                      </button>
                    </div>

                    {/* Large Proceed action button (Disabled for GERÊNCIA as they are view-only) */}
                    <button
                      onClick={handleBillInBulk}
                      disabled={submittingBulk || currentUser.perfil === "GERÊNCIA"}
                      className="w-full py-3 bg-[#2563eb] hover:bg-[#204e38] disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                      title={currentUser.perfil === "GERÊNCIA" ? "Gerentes não possuem permissão para faturar lotes" : "Consolidar faturamento"}
                    >
                      <Coins className="w-4 h-4" />
                      <span>{submittingBulk ? "PROCESSANDO..." : currentUser.perfil === "GERÊNCIA" ? "SOMENTE LEITURA (SEM ALTERAÇÃO)" : "CONSOLIDAR E FATURAR LOTE"}</span>
                    </button>

                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <HelpCircle className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-400 font-bold max-w-[180px] mx-auto leading-relaxed">
                      Selecione um ou mais boletins operacionais à esquerda para abrir a folha de faturamento em lote.
                    </p>
                  </div>
                )}
                
                {/* Decorative tear edge at bottom of receipt */}
                <div className="bg-[#f8fafc] h-3 w-full flex overflow-hidden">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className="w-4 h-4 bg-white rotate-45 transform -translate-y-2 border-t border-l border-[#e2e8f0]" 
                    />
                  ))}
                </div>

              </div>
            </div>

          </div>

          {/* SEC 2: Histórico de Faturamento Realizado */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                <span>Serviços Efetivamente Faturados ({billedLaunches.length})</span>
              </h2>
              
              <button
                onClick={handleExportHistory}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] text-[#2563eb] rounded-lg text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel Histórico</span>
              </button>
              <button
                onClick={() => setShowConsolidated(true)}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Consolidado</span>
              </button>
            </div>

            {/* Billed List table */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                      <th className="p-3">Data Operador</th>
                      <th className="p-3">Frota/Equipamento</th>
                      <th className="p-3">UP / Prod</th>
                      <th className="p-3 text-center">Horas SAP</th>
                      <th className="p-3">Tarifa Cobrada</th>
                      <th className="p-3 font-semibold text-[#0f172a]">Valor Faturado (R$)</th>
                      <th className="p-3">Detalhamento Faturamento</th>
                      {currentUser.perfil === "FATURAMENTO" && <th className="p-3 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ece6]/55">
                    {billedLaunches.length > 0 ? (
                      billedLaunches.map(launch => (
                        <tr key={launch.id} className="hover:bg-[#f8fafc]/30 text-[#64748b]">
                          
                          {/* Data */}
                          <td className="p-3 whitespace-nowrap font-bold text-[#0f172a]">
                            {formatDateBR(launch.data)}
                          </td>

                          {/* Equip */}
                          <td className="p-3 font-semibold text-[#0f172a]">
                            <span className="font-mono bg-[#eff6ff] text-[#2563eb] text-[10px] font-semibold px-1.5 py-0.5 border border-[#d2ebe0] rounded mr-1">
                              {launch.frota}
                            </span>
                            {launch.equipamento}
                          </td>

                          {/* UP */}
                          <td className="p-3">
                            <span className="font-semibold text-[#0f172a]">{launch.up}</span>
                            <span className="block text-[9px] text-[#64748b] font-semibold">{launch.fazenda}</span>
                          </td>

                          {/* hours SAP */}
                          <td className="p-3 text-center font-bold text-[#0f172a] font-mono">
                            {launch.horas_sap}h
                          </td>

                          {/* Rate billed */}
                          <td className="p-3 font-mono font-bold text-[#64748b]">
                            {formatCurrency(launch.valor_hora_faturamento)}
                          </td>

                          {/* Total Billed val */}
                          <td className="p-3 font-mono font-semibold text-[#2563eb]">
                            {formatCurrency(launch.valor_total_faturamento)}
                          </td>

                          {/* Metadata */}
                          <td className="p-3 text-[10px] text-[#64748b] space-y-0.5">
                            <div className="flex items-center space-x-1">
                              <span className="font-bold text-[#64748b]">Por:</span>
                              <span className="truncate max-w-[120px] font-semibold text-[#0f172a]" title={launch.faturado_por || ""}>{launch.faturado_por}</span>
                            </div>
                            <div className="flex items-center space-x-1 border-t border-dotted border-[#e2e8f0] pt-0.5">
                              <span className="font-bold text-[#64748b]">Em:</span>
                              <span className="font-semibold text-[#0f172a]">{formatDateBR(launch.faturado_em?.split("T")[0])}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          {currentUser.perfil === "FATURAMENTO" && (
                            <td className="p-3 text-center">
                            <button
                              onClick={() => handleStartEdit(launch)}
                              className="p-1.5 bg-slate-100 hover:bg-[#eff6ff] text-[#64748b] hover:text-[#2563eb] border border-slate-200 hover:border-[#2d6a4f]/30 rounded-lg transition-all cursor-pointer"
                              title="Ajustar dados do faturamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            </td>
                          )}

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={currentUser.perfil === "FATURAMENTO" ? 8 : 7} className="p-8 text-center text-[#64748b] text-xs font-semibold">
                          Nenhum boletim técnico faturado no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Visualização de Impressão e PDF */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print-report">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal actions header (not printable) */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#2563eb]" />
                <h3 className="text-sm font-bold text-slate-800">Visualização de Impressão (PDF)</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#0f172a] text-white font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Sheet Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-white" id="printable-area">
              
              {/* Dynamic local style injection for print override */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-area, #printable-area * {
                    visibility: visible !important;
                  }
                  #printable-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                  }
                  /* Hide print preview header */
                  .fixed.inset-0 {
                    background: transparent !important;
                    backdrop-filter: none !important;
                    padding: 0 !important;
                    position: absolute !important;
                  }
                  /* Show signatures on the same page */
                  .signature-section {
                    page-break-inside: avoid !important;
                  }
                }
              `}</style>

              <div className="space-y-6">
                
                {/* Invoice Header */}
                <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black  text-slate-900">SIGOL &bull; SISTEMA OPERACIONAL FLORESTAL</h1>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Boletim de Medição Técnica de Prestação de Serviços</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded">
                      Nº {String(boletimNumber || 1).padStart(6, "0")}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Emitido em: {new Date().toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                {/* Metadata block */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Solicitante / Cliente:</span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="text-slate-800 font-semibold text-[11px] bg-slate-100/70 hover:bg-slate-200/50 focus:bg-white border-b border-dashed border-slate-300 focus:border-[#2563eb] rounded px-1.5 py-0.5 w-full focus:outline-hidden transition-all print:border-none print:bg-transparent print:p-0 print:font-semibold print:text-black"
                      placeholder="Nome do Cliente"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Período Operativo:</span>
                    <strong className="text-slate-800 font-semibold text-[11px]">21/05/2026 a 20/06/2026</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Responsável Medição:</span>
                    <strong className="text-slate-800 font-semibold text-[11px]">{currentUser.nome}</strong>
                  </div>
                </div>

                {/* Selected items table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Apontamentos Selecionados para Faturamento ({selectedLaunches.length})</h3>
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 font-bold">
                        <th className="p-2">Data</th>
                        <th className="p-2">Recurso / Equipamento</th>
                        <th className="p-2">Fazenda</th>
                        <th className="p-2">UP</th>
                        <th className="p-2 text-center">Horím. Inicial</th>
                        <th className="p-2 text-center">Horím. Final</th>
                        <th className="p-2 text-center">Horas SAP</th>
                        <th className="p-2">Tarifa (R$)</th>
                        <th className="p-2 text-right">Subtotal (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-600">
                      {(() => {
                        // Group selected launches by UP
                        const launchesByUp: { [upCode: string]: Lancamento[] } = {};
                        selectedLaunches.forEach(launch => {
                          if (!launchesByUp[launch.up]) {
                            launchesByUp[launch.up] = [];
                          }
                          launchesByUp[launch.up].push(launch);
                        });

                        return Object.entries(launchesByUp).map(([upCode, upLaunches]) => {
                          // Calculate subtotal for this UP
                          const upTotalHours = upLaunches.reduce((sum, l) => sum + (l.horas_sap ?? 0), 0);
                          const upTotalValue = upLaunches.reduce((sum, l) => {
                            const standardRate = getStandardRate(l.frota);
                            const rateApplied = overrideNum !== null ? overrideNum : standardRate;
                            return sum + ((l.horas_sap ?? 0) * rateApplied);
                          }, 0);

                          return (
                            <React.Fragment key={upCode}>
                              {/* Render UP Group Banner header */}
                              <tr className="bg-[#f8fafc] font-semibold text-[#0f172a] text-[10px] uppercase">
                                <td colSpan={9} className="p-2 border-y border-slate-250">
                                  Unidade Produtiva: <span className="font-black text-blue-800">UP {upCode}</span> &bull; Fazenda: <span className="text-slate-800">{upLaunches[0]?.fazenda || ""}</span>
                                </td>
                              </tr>

                              {/* Render launches under this UP */}
                              {upLaunches.map(launch => {
                                const standardRate = getStandardRate(launch.frota);
                                const rateApplied = overrideNum !== null ? overrideNum : standardRate;
                                const totalStandard = (launch.horas_sap ?? 0) * rateApplied;

                                return (
                                  <tr key={launch.id} className="hover:bg-slate-50/50">
                                    <td className="p-2 font-medium whitespace-nowrap">{formatDateBR(launch.data)}</td>
                                    <td className="p-2 font-semibold text-slate-900">
                                      <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-[9px] mr-1">
                                        {launch.frota}
                                      </span>
                                      {launch.equipamento}
                                    </td>
                                    <td className="p-2 text-slate-700 font-medium">{launch.fazenda}</td>
                                    <td className="p-2 text-slate-900 font-bold">{launch.up}</td>
                                    <td className="p-2 text-center font-mono text-slate-600">{(launch.horimetro_inicial ?? 0).toFixed(1)}</td>
                                    <td className="p-2 text-center font-mono text-slate-600">{(launch.horimetro_final ?? 0).toFixed(1)}</td>
                                    <td className="p-2 text-center font-bold font-mono text-slate-900">{(launch.horas_sap ?? 0).toFixed(1)}h</td>
                                    <td className="p-2 font-mono whitespace-nowrap">{formatCurrency(rateApplied)}</td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalStandard)}</td>
                                  </tr>
                                );
                              })}

                              {/* Render UP Group subtotal row */}
                              <tr className="bg-blue-50/20 font-bold border-b border-slate-250">
                                <td colSpan={6} className="p-2 text-right text-slate-500 text-[10px] uppercase">
                                  Subtotal UP {upCode}:
                                </td>
                                <td className="p-2 text-center font-mono font-semibold text-[#2563eb] text-xs whitespace-nowrap">
                                  {(upTotalHours ?? 0).toFixed(1)}h
                                </td>
                                <td className="p-2 font-mono text-slate-400">-</td>
                                <td className="p-2 text-right font-mono font-semibold text-[#2563eb] text-xs whitespace-nowrap">
                                  {formatCurrency(upTotalValue)}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Totals Table Box */}
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <div className="w-72 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Valor Total Bruto:</span>
                      <strong className="font-mono text-slate-800">{formatCurrency(grossTotal)}</strong>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-red-600 font-semibold">
                        <span>Ajuste / Glosa Operacional:</span>
                        <strong className="font-mono">- {formatCurrency(discountAmount)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-double border-slate-300">
                      <span>VALOR TOTAL LÍQUIDO:</span>
                      <strong className="font-mono text-base text-[#2563eb]">{formatCurrency(netTotal)}</strong>
                    </div>
                  </div>
                </div>

                {/* Signatures Panel */}
                <div className="signature-section grid grid-cols-3 gap-6 pt-12 text-center text-[10px] font-semibold text-slate-500 mt-16">
                  <div className="space-y-2.5">
                    <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto" />
                    <p className="font-semibold text-slate-800">{currentUser.nome}</p>
                    <p className="uppercase tracking-wide text-[9px] font-bold text-slate-400">Responsável Medição</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto" />
                    <p className="font-semibold text-slate-800">Fiscal de Silvicultura</p>
                    <p className="uppercase tracking-wide text-[9px] font-bold text-slate-400">Aprovação de Campo</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="border-t border-slate-400 pt-1.5 w-44 mx-auto" />
                    <p className="font-semibold text-slate-800">Representante Fornecedor</p>
                    <p className="uppercase tracking-wide text-[9px] font-bold text-slate-400">Declaração de Execução</p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal de Edição de Lançamento Faturado */}
      {editingLaunch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print-report">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Pencil className="w-5 h-5 text-[#4ade80]" />
                <div>
                  <h3 className="text-sm font-bold">Ajustar Lançamento Faturado</h3>
                  <p className="text-[10px] text-[#94a3b8] font-semibold">Cód: {editingLaunch.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingLaunch(null)}
                className="text-[#94a3b8] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Data */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Data do Apontamento
                  </label>
                  <input
                    type="date"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a]"
                  />
                </div>

                {/* Frota */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Frota / Recurso
                  </label>
                  <select
                    value={editFrota}
                    onChange={(e) => setEditFrota(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a] focus:outline-hidden"
                  >
                    {equipments.map(eq => (
                      <option key={eq.id} value={eq.frota}>
                        {eq.frota} - {eq.tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* UP */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    UP (Projeto)
                  </label>
                  <input
                    type="text"
                    value={editUp}
                    onChange={(e) => setEditUp(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a]"
                    placeholder="Ex: UP-201"
                  />
                </div>

                {/* Status do Lançamento */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Status do Apontamento
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a] focus:outline-hidden"
                  >
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="APROVADO">APROVADO</option>
                    <option value="DEVOLVIDO">DEVOLVIDO</option>
                    <option value="FATURADO">FATURADO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Horímetro Inicial */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Horímetro Inicial
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editHorimetroInicial}
                    onChange={(e) => setEditHorimetroInicial(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold font-mono text-[#0f172a]"
                  />
                </div>

                {/* Horímetro Final */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Horímetro Final
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editHorimetroFinal}
                    onChange={(e) => setEditHorimetroFinal(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold font-mono text-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Horas SAP */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Horas SAP (Medição)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editHoursSap}
                    onChange={(e) => setEditHoursSap(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold font-mono text-[#0f172a]"
                  />
                </div>

                {/* Atividade */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Atividade Realizada
                  </label>
                  <input
                    type="text"
                    value={editAtividade}
                    onChange={(e) => setEditAtividade(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a]"
                    placeholder="Atividade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Código do Operador */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Matrícula Operador
                  </label>
                  <input
                    type="text"
                    value={editOperadorCodigo}
                    onChange={(e) => setEditOperadorCodigo(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold font-mono text-[#0f172a]"
                  />
                </div>

                {/* Nome do Operador */}
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                    Nome Operador
                  </label>
                  <input
                    type="text"
                    value={editOperadorNome}
                    onChange={(e) => setEditOperadorNome(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a]"
                  />
                </div>
              </div>

              {/* Tarifa Faturamento */}
              <div>
                <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                  Tarifa Aplicada (R$/hora)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-[11px] font-semibold text-[#64748b]">R$:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-semibold font-mono text-[#2563eb]"
                  />
                </div>
              </div>

              {/* Observação / Detalhamento */}
              <div>
                <label className="block text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-1">
                  Observação do Faturamento
                </label>
                <textarea
                  rows={3}
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-bold text-[#0f172a] focus:outline-hidden"
                  placeholder="Justificativa técnica para ajustes financeiros..."
                />
              </div>

              {/* Live Preview of Recalculated Values */}
              <div className="bg-[#eff6ff] border border-[#d2ebe0] rounded-xl p-3 space-y-2">
                <span className="block text-[9px] uppercase tracking-widest font-semibold text-[#2563eb]">Valores Calculados:</span>
                
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748b] font-semibold">Horas Campo (Horímetros):</span>
                  <strong className="font-mono text-slate-700">
                    {Number((editHorimetroFinal - editHorimetroInicial).toFixed(1))}h
                  </strong>
                </div>

                <div className="flex justify-between items-center text-[11px] border-t border-[#d2ebe0] pt-2">
                  <div>
                    <span className="text-[#64748b] font-semibold block">Faturamento (Recálculo Estimado):</span>
                    <span className="text-[10px] text-[#64748b] mt-0.5">
                      {editHoursSap} horas &times; {formatCurrency(editRate)}
                    </span>
                  </div>
                  <strong className="text-sm font-mono font-black text-[#0f172a]">
                    {formatCurrency(editHoursSap * editRate)}
                  </strong>
                </div>
              </div>

            </div>

            {/* Modal Footer actions */}
            <div className="p-4 bg-slate-50 border-t border-[#e2e8f0] flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditingLaunch(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditBilled}
                className="px-5 py-2 bg-[#2563eb] hover:bg-[#0f172a] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Ajustes</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  // Consolidated report content
  const consolidatedReport = showConsolidated && (() => {
    // Group billed launches by equipment
    const byEquip = new Map<string, typeof billedLaunches>();
    for (const l of billedLaunches) {
      const arr = byEquip.get(l.frota) || [];
      arr.push(l);
      byEquip.set(l.frota, arr);
    }
    const equipGroups = Array.from(byEquip.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const grandTotal = billedLaunches.reduce((s, l) => s + (l.valor_total_faturamento || l.horas_sap * getStandardRate(l.frota)), 0);
    const grandHours = billedLaunches.reduce((s, l) => s + l.horas_sap, 0);

    // By fazenda
    const byFazenda = new Map<string, number>();
    for (const l of billedLaunches) {
      const f = l.fazenda || "Não informada";
      byFazenda.set(f, (byFazenda.get(f) || 0) + l.horas_sap);
    }
    const fazendaEntries = Array.from(byFazenda.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return (
      <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto print-report">
        <div className="max-w-[210mm] mx-auto my-6 print:my-0">
          <div className="flex items-center justify-between mb-3 px-2 print:hidden">
            <span className="text-white text-sm font-semibold">Relatório Consolidado de Faturamento</span>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg">Imprimir / Salvar PDF</button>
              <button onClick={() => setShowConsolidated(false)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg">Fechar</button>
            </div>
          </div>

          <div className="bg-white shadow-xl print:shadow-none" style={{ padding: "15mm 12mm", minHeight: "297mm", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-5">
              <div>
                <div className="flex items-center gap-3"><img src={LOGO_BASE64} alt="Costa Pinto" className="w-12 h-12 rounded-lg" /><div><h1 className="text-[16px] font-extrabold text-slate-900">COSTA PINTO • RELATÓRIO CONSOLIDADO</h1><p className="text-[9px] text-slate-500 font-semibold">DEMONSTRATIVO DE FATURAMENTO MENSAL</p></div></div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">DEMONSTRATIVO MENSAL POR EQUIPAMENTO</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Emitido: {new Date().toLocaleDateString("pt-BR")}</p>
                <p className="text-[12px] font-bold text-[#2563eb] mt-1">{billedLaunches.length} boletins faturados</p>
              </div>
            </div>

            {/* Grand totals */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Faturamento Total</p>
                <p className="text-[20px] font-extrabold text-emerald-700">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Horas Totais</p>
                <p className="text-[20px] font-extrabold text-slate-900">{grandHours.toFixed(1)}h</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Equipamentos</p>
                <p className="text-[20px] font-extrabold text-[#2563eb]">{equipGroups.length}</p>
              </div>
            </div>

            {/* By Equipment table */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhamento por Equipamento</p>
            <table className="w-full text-[9px] border-collapse mb-5">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-2 py-1.5 text-left">Frota</th>
                  <th className="px-2 py-1.5 text-left">Equipamento</th>
                  <th className="px-2 py-1.5 text-center">Boletins</th>
                  <th className="px-2 py-1.5 text-center">Horas</th>
                  <th className="px-2 py-1.5 text-center">Tarifa (R$/h)</th>
                  <th className="px-2 py-1.5 text-right">Valor (R$)</th>
                  <th className="px-2 py-1.5 text-center">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {equipGroups.map(([frota, eqLaunches], idx) => {
                  const eqHours = eqLaunches.reduce((s, l) => s + l.horas_sap, 0);
                  const eqRate = getStandardRate(frota);
                  const eqTotal = eqLaunches.reduce((s, l) => s + (l.valor_total_faturamento || l.horas_sap * eqRate), 0);
                  const pct = grandTotal > 0 ? Math.round((eqTotal / grandTotal) * 100) : 0;
                  const eq = equipments.find(e => e.frota === frota);
                  return (
                    <tr key={frota} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-slate-100`}>
                      <td className="px-2 py-1.5 font-bold text-[#2563eb]">{frota}</td>
                      <td className="px-2 py-1.5 text-slate-600">{eq?.tipo || (eqLaunches[0]?.equipamento || "").split(" ")[0]}</td>
                      <td className="px-2 py-1.5 text-center">{eqLaunches.length}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{eqHours.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{formatCurrency(eqRate)}</td>
                      <td className="px-2 py-1.5 text-right font-bold">{formatCurrency(eqTotal)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                          <span className="w-8 text-right text-slate-500">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-2 py-1.5" colSpan={3}>TOTAL GERAL</td>
                  <td className="px-2 py-1.5 text-center">{grandHours.toFixed(1)}h</td>
                  <td className="px-2 py-1.5"></td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(grandTotal)}</td>
                  <td className="px-2 py-1.5 text-center">100%</td>
                </tr>
              </tfoot>
            </table>

            {/* Top Fazendas */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Horas por Fazenda (Top 10)</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
              {fazendaEntries.map(([faz, hours]) => (
                <div key={faz} className="flex items-center gap-2 text-[8px]">
                  <span className="w-[120px] text-slate-700 font-medium truncate">{faz}</span>
                  <div className="flex-1 bg-slate-200 rounded-full h-2"><div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${(hours / fazendaEntries[0][1]) * 100}%` }} /></div>
                  <span className="w-[40px] text-right font-bold text-slate-900">{hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-6">
              <div className="text-center space-y-2"><div className="border-t border-slate-400 pt-2 w-40 mx-auto" /><p className="text-[10px] font-semibold text-slate-700">Coordenador de Faturamento</p></div>
              <div className="text-center space-y-2"><div className="border-t border-slate-400 pt-2 w-40 mx-auto" /><p className="text-[10px] font-semibold text-slate-700">Gerência Florestal</p></div>
              <div className="text-center space-y-2"><div className="border-t border-slate-400 pt-2 w-40 mx-auto" /><p className="text-[10px] font-semibold text-slate-700">Financeiro Corporativo</p></div>
            </div>

            <div className="mt-6 pt-2 border-t border-slate-200 text-[7px] text-slate-300 text-center">
              SIGOL • Documento gerado automaticamente • {new Date().toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>
    );
  })();

  return <>{mainContent}{consolidatedReport}</>;
}
