import { useState } from "react";
import { 
  Percent, ShieldAlert, Layers, MapPin, Landmark, Clock, 
  Search, Filter, Eye, ChevronRight, Calculator, Tractor, 
  ArrowUpRight, Info, CheckCircle2, DollarSign
} from "lucide-react";
import { Lancamento, CadastroFlorestal, User } from "../types";
import { formatCurrency, formatDateBR } from "../utils";

interface DashboardRendimentoUPProps {
  launches: Lancamento[];
  forestry: CadastroFlorestal[];
  currentUser: User;
}

export default function DashboardRendimentoUP({ 
  launches, 
  forestry, 
  currentUser 
}: DashboardRendimentoUPProps) {
  
  // 1. Guard check for profile permissions
  const hasAccess = currentUser.perfil === "GERÊNCIA" || currentUser.perfil === "FATURAMENTO";

  if (!hasAccess) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-4 max-w-2xl mx-auto mt-8 font-sans select-none">
        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase ">Acesso Restrito</h4>
          <p className="text-xs text-rose-600 mt-1 font-medium">Este painel analítico de rendimento de UP é de uso exclusivo dos perfis de <strong>Gerência</strong> e <strong>Faturamento</strong>.</p>
        </div>
      </div>
    );
  }

  // 2. States for filters and selection
  const [upSearch, setUpSearch] = useState("");
  const [selectedNucleo, setSelectedNucleo] = useState<string>("TODOS");
  const [selectedFazenda, setSelectedFazenda] = useState<string>("TODOS");
  const [hourMetric, setHourMetric] = useState<"horas_trabalhadas" | "horas_sap">("horas_trabalhadas");
  const [selectedUpCode, setSelectedUpCode] = useState<string | null>(null);
  const [billingFilter, setBillingFilter] = useState<"TODOS" | "APENAS_FATURAMENTO" | "APROVADO" | "FATURADO">("APENAS_FATURAMENTO");

  // Get unique lists for filters
  const nucleos = ["TODOS", ...Array.from(new Set(forestry.map(f => f.nucleo)))].filter(Boolean);
  const fazendas = ["TODOS", ...Array.from(new Set(forestry.map(f => f.fazenda)))].filter(Boolean);

  // 3. Compute yield per UP
  const upYieldsData = forestry.map(upItem => {
    const upLaunches = launches.filter(l => l.up === upItem.up);
    
    const totalHorasTrabalhadas = upLaunches.reduce((sum, curr) => sum + curr.horas_trabalhadas, 0);
    const totalHorasSap = upLaunches.reduce((sum, curr) => sum + curr.horas_sap, 0);
    
    // Choose selected metric for the primary division
    const totalHoras = hourMetric === "horas_trabalhadas" ? totalHorasTrabalhadas : totalHorasSap;
    
    // Rendimento = Area / Total Horas (Hectares per hour - productivity)
    // expressed as ha/hour
    const rendimento = totalHoras > 0 ? Number((upItem.area / totalHoras).toFixed(4)) : 0;
    
    // Revenue calculations for faturamento tracking
    const faturamentoRealizado = upLaunches
      .filter(l => l.status === "FATURADO")
      .reduce((sum, curr) => sum + (curr.valor_total_faturamento || 0), 0);
      
    const faturamentoAprovado = upLaunches
      .filter(l => l.status === "APROVADO")
      .reduce((sum, curr) => sum + ((curr.horas_sap * (curr.valor_hora_faturamento || 150)) || 0), 0);

    const totalPipeline = faturamentoRealizado + faturamentoAprovado;

    return {
      id: upItem.id,
      up: upItem.up,
      fazenda: upItem.fazenda,
      nucleo: upItem.nucleo,
      area: upItem.area,
      totalHorasTrabalhadas,
      totalHorasSap,
      rendimento,
      totalLaunchesCount: upLaunches.length,
      faturamentoRealizado,
      faturamentoAprovado,
      totalPipeline,
      launchesList: upLaunches
    };
  });

  // Filter UPs based on search and dropdown filters
  const filteredUpYields = upYieldsData.filter(item => {
    const matchesSearch = item.up.toLowerCase().includes(upSearch.toLowerCase()) || 
                          item.fazenda.toLowerCase().includes(upSearch.toLowerCase());
    const matchesNucleo = selectedNucleo === "TODOS" || item.nucleo === selectedNucleo;
    const matchesFazenda = selectedFazenda === "TODOS" || item.fazenda === selectedFazenda;
    
    return matchesSearch && matchesNucleo && matchesFazenda;
  });

  // Sort by Yield (descending)
  const sortedUpYields = [...filteredUpYields].sort((a, b) => b.rendimento - a.rendimento);

  // General KPIs across filtered UPs
  const activeUPsCount = sortedUpYields.filter(item => item.totalHorasTrabalhadas > 0).length;
  const totalAreaOfFiltered = sortedUpYields.reduce((sum, curr) => sum + curr.area, 0);
  
  const totalHorasTrabalhadasFiltered = sortedUpYields.reduce((sum, curr) => sum + curr.totalHorasTrabalhadas, 0);
  const totalHorasSapFiltered = sortedUpYields.reduce((sum, curr) => sum + curr.totalHorasSap, 0);
  const currentTotalHours = hourMetric === "horas_trabalhadas" ? totalHorasTrabalhadasFiltered : totalHorasSapFiltered;

  const averageGlobalYield = currentTotalHours > 0 ? Number((totalAreaOfFiltered / currentTotalHours).toFixed(4)) : 0;

  // Selected UP Data & Related Launches
  const selectedUpInfo = upYieldsData.find(item => item.up === selectedUpCode);
  
  const getSelectedUpLaunches = () => {
    if (!selectedUpInfo) return [];
    
    return selectedUpInfo.launchesList.filter(l => {
      if (billingFilter === "APENAS_FATURAMENTO") {
        return l.status === "APROVADO" || l.status === "FATURADO";
      }
      if (billingFilter === "APROVADO") {
        return l.status === "APROVADO";
      }
      if (billingFilter === "FATURADO") {
        return l.status === "FATURADO";
      }
      return true; // "TODOS"
    });
  };

  const selectedUpLaunches = getSelectedUpLaunches();

  return (
    <div className="space-y-6 font-sans select-text">
      
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-[#143326] to-[#2d6a4f] rounded-xl text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none">
        <div>
          <span className="text-[10px] bg-blue-500/20 text-[#4ade80] border border-blue-500/30 font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
            Área de Inteligência & Faturamento
          </span>
          <h2 className="text-xl font-black mt-2  flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#4ade80]" />
            <span>Dashboard de Rendimento Operacional por UP</span>
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 font-medium max-w-3xl">
            Acompanhe o rendimento real das Unidades Produtivas (UP) calculando os hectares gerados por hora de máquina lançada (<span className="font-bold text-white">Área da UP / Total de Horas</span>). Consulte e audite apontamentos integrados ao faturamento SAP.
          </p>
        </div>
        <div className="flex bg-white/10 border border-white/10 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setHourMetric("horas_trabalhadas")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              hourMetric === "horas_trabalhadas"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "text-slate-200 hover:text-white"
            }`}
          >
            Horas de Campo
          </button>
          <button
            onClick={() => setHourMetric("horas_sap")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              hourMetric === "horas_sap"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "text-slate-200 hover:text-white"
            }`}
          >
            Horas SAP
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Rendimento Médio Geral</span>
            <Calculator className="w-4 h-4 text-[#2563eb]" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-[#2563eb]">{averageGlobalYield.toFixed(4)}</span>
            <span className="text-xs font-bold text-slate-400">ha / hora</span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Média ponderada do conjunto filtrado</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total de UPs Monitoradas</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-800">{sortedUpYields.length}</span>
            <span className="text-xs font-bold text-[#64748b]">cadastradas</span>
          </div>
          <p className="text-[10px] text-[#64748b] font-semibold mt-1.5">
            <span className="font-bold text-blue-700">{activeUPsCount}</span> UPs com apontamento
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Área Florestal Total</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-800">{totalAreaOfFiltered.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <span className="text-xs font-bold text-slate-400">hectares</span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Área física total mapeada nas UPs</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Horas Acumuladas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-800">
              {currentTotalHours.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
            </span>
            <span className="text-xs font-bold text-slate-400">totais</span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
            Métrica ativa: <span className="font-bold uppercase text-slate-700">{hourMetric.replace("_", " ")}</span>
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: UP Yield Table list (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 space-y-4">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 select-none">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Tabela de Produtividade por UP</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Clique em uma linha para consultar os lançamentos faturáveis.</p>
            </div>
          </div>

          {/* Quick Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar UP ou Fazenda..."
                value={upSearch}
                onChange={(e) => setUpSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
              />
            </div>

            {/* Núcleo Selector */}
            <div className="relative flex items-center">
              <span className="text-[10px] font-bold text-[#64748b] mr-1">Núcleo:</span>
              <select
                value={selectedNucleo}
                onChange={(e) => setSelectedNucleo(e.target.value)}
                className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl p-1.5 text-xs focus:outline-hidden"
              >
                {nucleos.map((n, idx) => (
                  <option key={idx} value={n}>{n === "TODOS" ? "Todos" : n}</option>
                ))}
              </select>
            </div>

            {/* Fazenda Selector */}
            <div className="relative flex items-center">
              <span className="text-[10px] font-bold text-[#64748b] mr-1">Fazenda:</span>
              <select
                value={selectedFazenda}
                onChange={(e) => setSelectedFazenda(e.target.value)}
                className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl p-1.5 text-xs focus:outline-hidden"
              >
                {fazendas.map((f, idx) => (
                  <option key={idx} value={f}>{f === "TODOS" ? "Todos" : f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-[#64748b] text-[10px] uppercase font-black tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-3">UP / Fazenda</th>
                  <th className="py-2.5 px-3">Núcleo</th>
                  <th className="py-2.5 px-3 text-right">Área UP (ha)</th>
                  <th className="py-2.5 px-3 text-right">Horas Lançadas</th>
                  <th className="py-2.5 px-3 text-right font-black text-[#2563eb]">Rendimento (ha/h)</th>
                  <th className="py-2.5 px-2 text-center">Boletins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUpYields.length > 0 ? (
                  sortedUpYields.map((item) => {
                    const isSelected = selectedUpCode === item.up;
                    const usedHours = hourMetric === "horas_trabalhadas" ? item.totalHorasTrabalhadas : item.totalHorasSap;
                    
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedUpCode(isSelected ? null : item.up)}
                        className={`hover:bg-[#f8fafc]/30 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/50 border-l-4 border-[#2d6a4f] font-semibold" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className="font-semibold text-[#0f172a] text-xs block">UP {item.up}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block">{item.fazenda}</span>
                        </td>
                        <td className="py-3 px-3 text-[#64748b] font-medium">
                          {item.nucleo}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {item.area.toFixed(1)} ha
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-600">
                          {usedHours.toFixed(1)}h
                          <span className="block text-[9px] text-slate-400 font-sans font-semibold">
                            {hourMetric === "horas_trabalhadas" ? "Campo" : "SAP"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-[#2563eb] text-xs bg-blue-50/20">
                          {item.rendimento > 0 ? `${item.rendimento.toFixed(4)}` : "Ociosa"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 rounded-full h-5 w-5 font-bold text-[10px]">
                            {item.totalLaunchesCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      Nenhuma Unidade Produtiva (UP) encontrada para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected UP Billing consultation (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 space-y-4 min-h-[400px]">
          
          {!selectedUpCode ? (
            <div className="h-full py-20 flex flex-col items-center justify-center text-center space-y-3 select-none">
              <div className="p-4 bg-blue-50/50 text-[#2563eb] rounded-xl border border-blue-100/50">
                <Eye className="w-8 h-8 animate-pulse" />
              </div>
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Painel de Consulta Integrada</h4>
              <p className="text-[11px] text-[#64748b] max-w-xs font-medium">
                Clique em qualquer Unidade Produtiva (UP) na lista à esquerda para consultar todo o histórico de lançamentos e faturamento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Header with Selected UP basic metadata */}
              <div className="p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] relative">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#2563eb] block">UP Selecionada</span>
                <div className="flex justify-between items-start mt-1">
                  <div>
                    <h3 className="text-lg font-black text-[#0f172a]">UP {selectedUpInfo?.up}</h3>
                    <p className="text-xs text-[#64748b] font-semibold">{selectedUpInfo?.fazenda} &bull; Núcleo {selectedUpInfo?.nucleo}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedUpCode(null)}
                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 transition-colors text-slate-600 text-[10px] font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {/* Micro KPIs for selected UP */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/50 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Área</span>
                    <strong className="text-slate-800 font-mono text-xs">{selectedUpInfo?.area?.toFixed(1) ?? "0.0"} ha</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Horas Totais</span>
                    <strong className="text-slate-800 font-mono text-xs">
                      {hourMetric === "horas_trabalhadas" 
                        ? (selectedUpInfo?.totalHorasTrabalhadas?.toFixed(1) ?? "0.0") 
                        : (selectedUpInfo?.totalHorasSap?.toFixed(1) ?? "0.0")}h
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[8.5px]">Rendimento</span>
                    <strong className="text-[#2563eb] font-mono text-xs">{selectedUpInfo?.rendimento?.toFixed(4) ?? "0.0000"} ha/h</strong>
                  </div>
                </div>
              </div>

              {/* Faturamento Summary */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100/50 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Pipeline Estimado (Faturamento)</span>
                  <strong className="text-slate-900 font-mono text-base">{formatCurrency(selectedUpInfo?.totalPipeline || 0)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] font-bold text-blue-600 block uppercase">Faturado SAP</span>
                  <strong className="text-blue-800 font-mono text-xs block">{formatCurrency(selectedUpInfo?.faturamentoRealizado || 0)}</strong>
                  <span className="text-[9px] font-semibold text-[#64748b] block mt-0.5">
                    Aprovado: {formatCurrency(selectedUpInfo?.faturamentoAprovado || 0)}
                  </span>
                </div>
              </div>

              {/* Filtering Controls for the launches list of the UP */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span>Filtrar Apontamentos da UP</span>
                  </label>
                  <span className="text-[10px] bg-blue-100 text-[#2563eb] px-2 py-0.5 rounded-full font-bold">
                    {selectedUpLaunches.length} boletins
                  </span>
                </div>

                {/* Category Toggles */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5 select-none text-[10px]">
                  <button
                    onClick={() => setBillingFilter("APENAS_FATURAMENTO")}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      billingFilter === "APENAS_FATURAMENTO"
                        ? "bg-[#2563eb] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Faturamento (Aprov+Fat)
                  </button>
                  <button
                    onClick={() => setBillingFilter("TODOS")}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      billingFilter === "TODOS"
                        ? "bg-[#2563eb] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBillingFilter("APROVADO")}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                      billingFilter === "APROVADO"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Apenas Prontos para Faturar"
                  >
                    Aprovados
                  </button>
                  <button
                    onClick={() => setBillingFilter("FATURADO")}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer ${
                      billingFilter === "FATURADO"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Apenas Faturados no SAP"
                  >
                    Faturados
                  </button>
                </div>
              </div>

              {/* Launches List Section */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {selectedUpLaunches.length > 0 ? (
                  selectedUpLaunches.map((l) => (
                    <div 
                      key={l.id} 
                      className="p-3 bg-white border border-slate-250/80 hover:border-[#2d6a4f]/40 rounded-xl shadow-xs transition-all relative"
                    >
                      {/* Left vertical color indicator depending on billing status */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${
                        l.status === "FATURADO" ? "bg-blue-500" :
                        l.status === "APROVADO" ? "bg-blue-500" :
                        l.status === "PENDENTE" ? "bg-amber-400" : "bg-rose-400"
                      }`} />

                      <div className="pl-1 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] font-black text-slate-800">#{l.id}</span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">{formatDateBR(l.data)}</span>
                        </div>

                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{l.operador_nome}</span>
                          <p className="text-[10px] text-[#64748b] font-medium block mt-0.5">Atividade: <span className="font-bold text-slate-800">{l.atividade}</span></p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[9px] font-bold bg-[#f8fafc] text-[#2563eb] px-1.5 py-0.5 rounded border border-slate-100">
                              {l.frota}
                            </span>
                            <span className="text-slate-500 text-[10px] font-semibold">{l.equipamento}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-[9px] font-bold uppercase leading-none block">
                              {hourMetric === "horas_trabalhadas" ? "Horas Campo" : "Horas SAP"}
                            </span>
                            <span className="font-mono font-black text-[#0f172a] text-xs block mt-0.5">
                              {hourMetric === "horas_trabalhadas" ? l.horas_trabalhadas.toFixed(1) : l.horas_sap.toFixed(1)}h
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                            l.status === "FATURADO" ? "bg-[#eff6ff] text-[#2563eb]" :
                            l.status === "APROVADO" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                            l.status === "PENDENTE" ? "bg-amber-50 text-amber-800 border border-amber-250" :
                            "bg-rose-50 text-rose-800"
                          }`}>
                            {l.status}
                          </span>
                          <span className="font-mono font-semibold text-slate-700 text-xs">
                            {formatCurrency(l.valor_total_faturamento || (l.horas_sap * 150))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px] font-semibold uppercase">
                    Sem apontamentos para os filtros aplicados.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
