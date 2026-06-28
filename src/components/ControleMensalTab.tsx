import { useState } from "react";
import { Users, Tractor, CalendarDays, Award, ChevronLeft, ChevronRight, Calculator, FileCheck, Download } from "lucide-react";
import { Lancamento, Colaborador, Equipamento } from "../types";
import { formatDecimal, exportToCSV } from "../utils";

interface ControleMensalTabProps {
  launches: Lancamento[];
  colaboradores: Colaborador[];
  equipments: Equipamento[];
}

export default function ControleMensalTab({ launches, colaboradores, equipments }: ControleMensalTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"COLABORADORES" | "EQUIPAMENTOS">("COLABORADORES");
  const [showPrintView, setShowPrintView] = useState(false);

  // 1. Dynamic competência based on current date
  const today = new Date();
  const currentDay = today.getDate();
  // If today >= 21, competência starts this month's 21st; otherwise last month's 21st
  const getInitialCompetencia = () => {
    if (currentDay >= 21) {
      return { year: today.getFullYear(), month: today.getMonth() }; // starts 21st of this month
    } else {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { year: prev.getFullYear(), month: prev.getMonth() }; // starts 21st of previous month
    }
  };

  const [competencia, setCompetencia] = useState(getInitialCompetencia);

  const generateOperationalDates = () => {
    const dates: string[] = [];
    const startDate = new Date(competencia.year, competencia.month, 21);
    const endDate = new Date(competencia.year, competencia.month + 1, 20);

    const current = new Date(startDate);
    while (current <= endDate) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const navigateCompetencia = (dir: -1 | 1) => {
    setCompetencia(prev => {
      const d = new Date(prev.year, prev.month + dir, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const compStart = new Date(competencia.year, competencia.month, 21);
  const compEnd = new Date(competencia.year, competencia.month + 1, 20);
  const competenciaLabel = `${compStart.getDate()}/${monthNames[compStart.getMonth()]} → ${compEnd.getDate()}/${monthNames[compEnd.getMonth()]} ${compEnd.getFullYear()}`;

  const periodDays = generateOperationalDates();
  const metaPadrao = 180; // Standard 180h quota

  const handleExportExcel = () => {
    const data = activeSubTab === "COLABORADORES" ? collaboratorMatrix : equipmentMatrix;
    const headers = ["Nome", "Registro/Frota", ...periodDays.map(d => {
      const day = d.split("-")[2];
      const mIdx = parseInt(d.split("-")[1]) - 1;
      const mName = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][mIdx];
      return `${day}/${mName}`;
    }), "Acumulado", "% Meta"];

    const rows = data.map((item: any) => {
      const name = item.colaborador?.nome || item.equipamento?.frota || "";
      const reg = item.colaborador?.registro || item.equipamento?.tipo || "";
      const dayValues = periodDays.map(d => item.dailyHours[d] || 0);
      return [name, reg, ...dayValues, item.totalAcumulado, `${item.percentOfMeta}%`];
    });

    exportToCSV(`ControleMensal_${competenciaLabel.replace(/ /g, "_")}`, headers, rows);
  };

  // 2. Compute Collaborator Matrix
  const collaboratorMatrix = colaboradores.map(col => {
    const dailyHours: { [date: string]: number } = {};
    let totalAcumulado = 0;

    periodDays.forEach(date => {
      // Find all launches of this employee on this date
      const matched = launches.filter(l => 
        l.data === date && 
        (l.operador_codigo === col.registro || l.operador_nome.toLowerCase() === col.nome.toLowerCase())
      );
      const hours = matched.reduce((sum, curr) => sum + curr.horas_trabalhadas, 0);
      dailyHours[date] = Number(hours.toFixed(1));
      totalAcumulado += hours;
    });

    const percentOfMeta = Math.min(Math.round((totalAcumulado / metaPadrao) * 100), 200);

    return {
      colaborador: col,
      dailyHours,
      totalAcumulado: Number(totalAcumulado.toFixed(1)),
      percentOfMeta
    };
  });

  // 3. Compute Equipment Matrix
  const equipmentMatrix = equipments.map(eq => {
    const dailyHours: { [date: string]: number } = {};
    let totalAcumulado = 0;

    periodDays.forEach(date => {
      const matched = launches.filter(l => l.data === date && l.frota === eq.frota);
      const hours = matched.reduce((sum, curr) => sum + curr.horas_trabalhadas, 0);
      dailyHours[date] = Number(hours.toFixed(1));
      totalAcumulado += hours;
    });

    const percentOfMeta = Math.min(Math.round((totalAcumulado / metaPadrao) * 100), 200);

    return {
      equipamento: eq,
      dailyHours,
      totalAcumulado: Number(totalAcumulado.toFixed(1)),
      percentOfMeta
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a]">Controle Operacional Mensal</h1>
          <p className="text-xs text-[#64748b]">Planilha técnica detalhada de horas acumuladas no fechamento mensal — competência {competenciaLabel}.</p>
        </div>

        {/* Toggle Grid perspective */}
        <div className="inline-flex rounded-lg p-1 bg-[#f8fafc] border border-[#e2e8f0] self-start">
          <button
            onClick={() => setActiveSubTab("COLABORADORES")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "COLABORADORES" 
                ? "bg-white text-[#2563eb] shadow-xs font-bold" 
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Colaboradores</span>
          </button>
          <button
            onClick={() => setActiveSubTab("EQUIPAMENTOS")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "EQUIPAMENTOS" 
                ? "bg-white text-[#2563eb] shadow-xs font-bold" 
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Equipamentos</span>
          </button>
        </div>
      </div>

      {/* Standard parameters KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="flex items-center space-x-3 p-4 bg-[#eff6ff] border border-[#d2ebe0] rounded-lg">
          <button onClick={() => navigateCompetencia(-1)} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft className="w-4 h-4 text-[#2563eb]" /></button>
          <div className="text-xs flex-1 text-center">
            <span className="font-semibold text-[#0f172a] block">Competência Operacional</span>
            <span className="text-[#2563eb] font-bold">{competenciaLabel}</span>
          </div>
          <button onClick={() => navigateCompetencia(1)} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight className="w-4 h-4 text-[#2563eb]" /></button>
        </div>
        <div className="flex items-center space-x-3 p-4 bg-blue-50/60 border border-blue-100 rounded-lg">
          <Award className="w-5 h-5 text-blue-700" />
          <div className="text-xs">
            <span className="font-semibold text-blue-900 block">Meta Operacional de Horas</span>
            <span className="text-blue-700 font-medium">{metaPadrao} Horas/Mês por recurso ativo</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
          <Calculator className="w-5 h-5 text-[#64748b]" />
          <div className="text-xs">
            <span className="font-semibold text-[#0f172a] block">Total Recursos Listados</span>
            <span className="text-[#64748b] font-medium">
              {activeSubTab === "COLABORADORES" ? `${colaboradores.length} operadores cadastrados` : `${equipments.length} máquinas catalogadas`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        
        <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between font-sans">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0f172a]">
            <FileCheck className="w-4 h-4 text-[#2563eb]" />
            <span>Planilha {activeSubTab === "COLABORADORES" ? "Time-Sheet de Operadores" : "Utilização da Frota de Máquinas"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExportExcel()} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] text-[10px] font-semibold rounded-lg border border-[#bfdbfe] transition-colors">
              <Download className="w-3 h-3" /> Excel
            </button>
            <button onClick={() => setShowPrintView(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] text-[10px] font-semibold rounded-lg border border-[#bfdbfe] transition-colors">
              <Download className="w-3 h-3" /> PDF
            </button>
          </div>
        </div>

        {/* Scalable SpreadSheet frame */}
        <div className="overflow-x-auto max-w-full">
          {activeSubTab === "COLABORADORES" ? (
            <table className="text-left border-collapse text-xs select-none font-sans" style={{ minWidth: `${periodDays.length * 38 + 300 + 120 + 140}px` }}>
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3 sticky left-0 bg-[#f8fafc] border-r border-[#e2e8f0] z-10 min-w-[220px] font-bold">Colaborador</th>
                  {periodDays.map(date => {
                    const day = date.split("-")[2];
                    const monthIdx = parseInt(date.split("-")[1]) - 1; const month = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][monthIdx];
                    return (
                      <th key={date} className="px-1.5 py-3 text-center border-r border-[#e2e8f0]/50 min-w-[34px]" title={date}>
                        <span className="block font-semibold">{day}</span>
                        <span className="block text-[8px] font-bold text-[#64748b]/80">{month}</span>
                      </th>
                    );
                  })}
                  <th className="p-3 text-center border-l-2 border-[#2563eb]/20 bg-[#eff6ff] min-w-[90px] font-bold">Acumulado</th>
                  <th className="p-3 bg-[#eff6ff] text-center min-w-[120px] font-bold">Progresso<br/>Meta ({metaPadrao}h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55">
                {collaboratorMatrix.map(({ colaborador, dailyHours, totalAcumulado, percentOfMeta }) => (
                  <tr key={colaborador.id} className="hover:bg-[#f8fafc]/20">
                    
                    {/* Name column pinned left */}
                    <td className="p-3 sticky left-0 bg-white font-bold text-[#0f172a] border-r border-[#e2e8f0] shadow-xs z-10 font-sans">
                      <div className="truncate">
                        <span className="font-semibold text-[#0f172a] block">{colaborador.nome}</span>
                        <span className="text-[9px] text-[#64748b] block font-semibold">{colaborador.funcao} | {colaborador.registro}</span>
                      </div>
                    </td>

                    {/* Daily inputs */}
                    {periodDays.map(date => {
                      const value = dailyHours[date];
                      return (
                        <td 
                          key={date} 
                          className={`px-1 py-3 text-center font-mono border-r border-[#e2e8f0]/30 ${
                            value > 0 ? "bg-[#eff6ff]/50 text-[#2563eb] font-semibold" : "text-[#e2ece6]"
                          }`}
                        >
                          {value > 0 ? value : "-"}
                        </td>
                      );
                    })}

                    {/* Acumulado value pinned right */}
                    <td className="p-3 font-mono font-semibold text-center border-l-2 border-[#2563eb]/20 bg-[#eff6ff]/50 text-[#0f172a]">
                      {formatDecimal(totalAcumulado, 1)}h
                    </td>

                    {/* Visual Progress bar */}
                    <td className="p-3 bg-white border-l border-[#e2e8f0]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-semibold text-[#64748b]">
                          <span>{percentOfMeta}%</span>
                          <span className={percentOfMeta >= 85 ? "text-[#2563eb]" : percentOfMeta >= 50 ? "text-amber-600" : "text-red-500"}>
                            {percentOfMeta >= 100 ? "Meta Atingida! 🎉" : `${Math.round(metaPadrao - totalAcumulado)}h p/ meta`}
                          </span>
                        </div>
                        <div className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentOfMeta >= 85 ? "bg-[#2563eb]" : percentOfMeta >= 50 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(percentOfMeta, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // EQUIPMENTS GRID VIEW
            <table className="text-left border-collapse text-xs select-none font-sans" style={{ minWidth: `${periodDays.length * 38 + 300 + 120 + 140}px` }}>
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3 sticky left-0 bg-[#f8fafc] border-r border-[#e2e8f0] z-10 min-w-[220px] font-bold">Equipamento / Frota</th>
                  {periodDays.map(date => {
                    const day = date.split("-")[2];
                    const monthIdx = parseInt(date.split("-")[1]) - 1; const month = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][monthIdx];
                    return (
                      <th key={date} className="px-1.5 py-3 text-center border-r border-[#e2e8f0]/50 min-w-[34px]" title={date}>
                        <span className="block font-semibold">{day}</span>
                        <span className="block text-[8px] font-bold text-[#64748b]/80">{month}</span>
                      </th>
                    );
                  })}
                  <th className="p-3 text-center border-l-2 border-[#2563eb]/20 bg-[#eff6ff] min-w-[90px] font-bold">Acumulado</th>
                  <th className="p-3 bg-[#eff6ff] text-center min-w-[120px] font-bold">Utilização<br/>Meta (180h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55">
                {equipmentMatrix.map(({ equipamento, dailyHours, totalAcumulado, percentOfMeta }) => (
                  <tr key={equipamento.id} className="hover:bg-[#f8fafc]/20">
                    
                    {/* Name column pinned left */}
                    <td className="p-3 sticky left-0 bg-white font-bold text-[#0f172a] border-r border-[#e2e8f0] shadow-xs z-10 font-sans">
                      <div className="truncate">
                        <span className="font-mono bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] text-[10px] px-1.5 py-0.5 rounded font-semibold">{equipamento.frota}</span>
                        <span className="font-semibold text-[#0f172a] block mt-1.5">{equipamento.tipo.substring(0, 22)}...</span>
                      </div>
                    </td>

                    {/* Daily hours */}
                    {periodDays.map(date => {
                      const value = dailyHours[date];
                      return (
                        <td 
                          key={date} 
                          className={`px-1 py-3 text-center font-mono border-r border-[#e2e8f0]/30 ${
                            value > 0 ? "bg-teal-50/20 text-[#2563eb] font-semibold" : "text-[#e2ece6]"
                          }`}
                        >
                          {value > 0 ? value : "-"}
                        </td>
                      );
                    })}

                    {/* Total acumulado pinned right */}
                    <td className="p-3 font-mono font-semibold text-center border-l-2 border-[#2563eb]/20 bg-[#eff6ff]/50 text-[#0f172a]">
                      {formatDecimal(totalAcumulado, 1)}h
                    </td>

                    {/* Utilisation progress chart */}
                    <td className="p-3 bg-white border-l border-[#e2e8f0] font-sans">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-semibold text-[#64748b]">
                          <span>{percentOfMeta}%</span>
                          <span className={percentOfMeta >= 85 ? "text-[#2563eb]" : percentOfMeta >= 50 ? "text-amber-600" : "text-red-500"}>
                            {percentOfMeta >= 100 ? "Otimizada 🔥" : "Ociosidade"}
                          </span>
                        </div>
                        <div className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentOfMeta >= 85 ? "bg-[#2563eb]" : percentOfMeta >= 50 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${Math.min(percentOfMeta, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footnotes */}
        <div className="p-3 bg-[#f8fafc] text-[10px] text-[#64748b] font-bold border-t border-[#e2e8f0]">
          * Período de controle operacional padrão: dias 21 do mês anterior até o dia 20 do mês atual. As horas em verde representam atividade lançada no respectivo dia.
        </div>

      </div>

      {/* ═══ PRINT VIEW - PDF A4 Vertical ═══ */}
      {showPrintView && (() => {
        const data = activeSubTab === "COLABORADORES" ? collaboratorMatrix : equipmentMatrix;
        const sorted = [...data].sort((a, b) => b.totalAcumulado - a.totalAcumulado);
        const totalHoras = sorted.reduce((s, i) => s + i.totalAcumulado, 0);
        const ativos = sorted.filter(i => i.totalAcumulado > 0).length;
        const mediaHoras = ativos > 0 ? (totalHoras / ativos) : 0;
        const atingiramMeta = sorted.filter(i => i.percentOfMeta >= 100).length;

        // Weekly breakdown
        const weeks: { label: string; days: string[] }[] = [];
        for (let i = 0; i < periodDays.length; i += 7) {
          const chunk = periodDays.slice(i, i + 7);
          const first = chunk[0].split("-");
          const last = chunk[chunk.length - 1].split("-");
          weeks.push({ label: `${first[2]}/${first[1]} a ${last[2]}/${last[1]}`, days: chunk });
        }

        return (
          <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto print:bg-white print:static">
            <div className="max-w-[210mm] mx-auto my-6 print:my-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3 px-2 print:hidden">
                <span className="text-white text-sm font-semibold">Relatório de Controle Mensal — A4 Vertical</span>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg">Imprimir / Salvar PDF</button>
                  <button onClick={() => setShowPrintView(false)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg">Fechar</button>
                </div>
              </div>

              {/* A4 Page */}
              <div className="bg-white shadow-xl print:shadow-none" style={{ padding: "15mm 12mm", minHeight: "297mm", fontFamily: "Inter, system-ui, sans-serif" }}>
                
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-5">
                  <div>
                    <h1 className="text-[18px] font-extrabold text-slate-900 tracking-tight">SIGOL • SISTEMA OPERACIONAL FLORESTAL</h1>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">RELATÓRIO DE CONTROLE MENSAL DE HORAS OPERACIONAIS</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-medium">Emitido em: {new Date().toLocaleDateString("pt-BR")}</p>
                    <p className="text-[13px] font-bold text-[#2563eb] mt-1">Competência: {competenciaLabel}</p>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  <div className="border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Total de Horas</p>
                    <p className="text-[20px] font-extrabold text-slate-900">{totalHoras.toFixed(1)}<span className="text-[10px] text-slate-400 ml-0.5">h</span></p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Recursos Ativos</p>
                    <p className="text-[20px] font-extrabold text-[#2563eb]">{ativos}<span className="text-[10px] text-slate-400 ml-0.5">/ {sorted.length}</span></p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Média por Recurso</p>
                    <p className="text-[20px] font-extrabold text-slate-900">{mediaHoras.toFixed(1)}<span className="text-[10px] text-slate-400 ml-0.5">h</span></p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Atingiram Meta</p>
                    <p className="text-[20px] font-extrabold text-emerald-600">{atingiramMeta}<span className="text-[10px] text-slate-400 ml-0.5">de {sorted.length}</span></p>
                  </div>
                </div>

                {/* Table - Summary */}
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {activeSubTab === "COLABORADORES" ? "Produtividade por Colaborador" : "Utilização por Equipamento"} — Meta: {metaPadrao}h
                </p>
                <table className="w-full text-[10px] border-collapse mb-5">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-2 py-1.5 text-left font-semibold">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold">{activeSubTab === "COLABORADORES" ? "Colaborador" : "Equipamento"}</th>
                      <th className="px-2 py-1.5 text-left font-semibold">{activeSubTab === "COLABORADORES" ? "Registro" : "Tipo"}</th>
                      {weeks.map((w, i) => <th key={i} className="px-1.5 py-1.5 text-center font-semibold text-[8px]">Sem {i + 1}<br/><span className="font-normal text-slate-300">{w.label}</span></th>)}
                      <th className="px-2 py-1.5 text-center font-bold">Total</th>
                      <th className="px-2 py-1.5 text-center font-bold">%</th>
                      <th className="px-2 py-1.5 text-left font-semibold w-24">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item, idx) => {
                      const name = (item as any).colaborador?.nome || (item as any).equipamento?.frota || "";
                      const reg = (item as any).colaborador?.registro || (item as any).equipamento?.tipo || "";
                      const weekTotals = weeks.map(w => w.days.reduce((s, d) => s + (item.dailyHours[d] || 0), 0));
                      const bgColor = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
                      const statusColor = item.percentOfMeta >= 100 ? "bg-emerald-500" : item.percentOfMeta >= 50 ? "bg-amber-500" : "bg-red-400";
                      
                      return (
                        <tr key={idx} className={`${bgColor} border-b border-slate-100`}>
                          <td className="px-2 py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-2 py-1.5 font-semibold text-slate-800 max-w-[140px] truncate">{name}</td>
                          <td className="px-2 py-1.5 text-slate-500 font-mono">{reg}</td>
                          {weekTotals.map((wt, i) => (
                            <td key={i} className="px-1.5 py-1.5 text-center font-mono text-slate-600">{wt > 0 ? wt.toFixed(1) : "—"}</td>
                          ))}
                          <td className="px-2 py-1.5 text-center font-bold text-slate-900">{item.totalAcumulado.toFixed(1)}h</td>
                          <td className={`px-2 py-1.5 text-center font-bold ${item.percentOfMeta >= 100 ? "text-emerald-600" : item.percentOfMeta >= 50 ? "text-amber-600" : "text-red-500"}`}>{item.percentOfMeta}%</td>
                          <td className="px-2 py-1.5">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${Math.min(item.percentOfMeta, 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="px-2 py-1.5" colSpan={3}>TOTAL GERAL</td>
                      {weeks.map((w, i) => {
                        const weekTotal = sorted.reduce((s, item) => s + w.days.reduce((s2, d) => s2 + (item.dailyHours[d] || 0), 0), 0);
                        return <td key={i} className="px-1.5 py-1.5 text-center font-mono">{weekTotal > 0 ? weekTotal.toFixed(1) : "—"}</td>;
                      })}
                      <td className="px-2 py-1.5 text-center">{totalHoras.toFixed(1)}h</td>
                      <td className="px-2 py-1.5 text-center">{ativos > 0 ? Math.round(totalHoras / (sorted.length * metaPadrao) * 100) : 0}%</td>
                      <td className="px-2 py-1.5"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[8px] text-slate-400 mb-6">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> ≥ 100% Meta</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> 50–99% Meta</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> &lt; 50% Meta</span>
                  <span className="ml-auto">Meta operacional: {metaPadrao} horas/mês por recurso</span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-6 mt-10 pt-6">
                  <div className="text-center space-y-2">
                    <div className="border-t border-slate-400 pt-2 w-40 mx-auto" />
                    <p className="text-[10px] font-semibold text-slate-700">Técnico Responsável</p>
                    <p className="text-[8px] text-slate-400">Supervisão de Campo</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="border-t border-slate-400 pt-2 w-40 mx-auto" />
                    <p className="text-[10px] font-semibold text-slate-700">Coordenador de Faturamento</p>
                    <p className="text-[8px] text-slate-400">Controle Operacional</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="border-t border-slate-400 pt-2 w-40 mx-auto" />
                    <p className="text-[10px] font-semibold text-slate-700">Gerência Florestal</p>
                    <p className="text-[8px] text-slate-400">Aprovação Final</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-3 border-t border-slate-200 text-[7px] text-slate-300 text-center">
                  SIGOL — Sistema Integrado de Gestão Operacional de Lançamentos • Documento gerado automaticamente • {new Date().toLocaleString("pt-BR")}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
