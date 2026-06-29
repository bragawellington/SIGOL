import { useState } from "react";
import { 
  CheckCircle2, Clock, XCircle, FileSpreadsheet, Users, Tractor, 
  AlertTriangle, UserMinus, Calendar, ArrowRight, Check, X,
  ExternalLink, Landmark, Eye, RefreshCw
} from "lucide-react";
import { Lancamento, Equipamento, Colaborador, User } from "../types";
import { formatDateBR, formatCurrency } from "../utils";

interface PendenciasTabProps {
  launches: Lancamento[];
  equipments: Equipamento[];
  colaboradores: Colaborador[];
  currentUser: User;
  onUpdateLaunchStatus: (id: string, status: "APROVADO" | "DEVOLVIDO" | "FATURADO", obs?: string, rate?: number, horas_sap?: number, otherFields?: Partial<Lancamento>) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export default function PendenciasTab({ 
  launches, 
  equipments, 
  colaboradores, 
  currentUser,
  onUpdateLaunchStatus,
  onNavigateToTab
}: PendenciasTabProps) {
  
  const [activeCategory, setActiveCategory] = useState<"awaiting_approval" | "returned" | "awaiting_billing" | "idle_equipments" | "idle_colols">("awaiting_approval");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [obsText, setObsText] = useState<Record<string, string>>({});
  const [showObsInput, setShowObsInput] = useState<Record<string, boolean>>({});

  // 1. Calculations
  const awaitingApproval = launches.filter(l => l.status === "PENDENTE");
  const returnedLaunches = launches.filter(l => l.status === "DEVOLVIDO");
  const awaitingBilling = launches.filter(l => l.status === "APROVADO");

  // Idle equipments (no launches in the database, or no launch in the last 3 days)
  const getIdleEquipments = () => {
    return equipments.filter(eq => {
      const eqLaunches = launches.filter(l => l.frota === eq.frota);
      if (eqLaunches.length === 0) return true;
      
      // check if any launch in last 3 days (relative to latest launch date to prevent empty results on mock data)
      const sortedLaunches = [...eqLaunches].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      const latestDate = new Date(sortedLaunches[0].data);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 3);
      // Let's check relative to current date (or let's return true if no launch overall, or if latest launch is older than 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return new Date(sortedLaunches[0].data).getTime() < threeDaysAgo.getTime();
    });
  };

  const idleEquipments = getIdleEquipments();

  // Idle collaborators (no launches registered in the whole period)
  const getIdleColaboradores = () => {
    return colaboradores.filter(col => {
      const isOperator = col.funcao.toUpperCase().includes("OPERADOR") || 
                         col.funcao.toUpperCase().includes("MÁQUINA") || 
                         col.funcao.toUpperCase().includes("MAQUINA") || 
                         col.funcao.toUpperCase().includes("MOTORISTA");
      if (!isOperator) return false;
      const colLaunches = launches.filter(l => l.operador_codigo === col.registro);
      return colLaunches.length === 0;
    });
  };

  const idleColols = getIdleColaboradores();

  // Handle statuses
  const handleQuickStatus = async (id: string, status: "APROVADO" | "DEVOLVIDO" | "FATURADO", obs?: string) => {
    setLoadingId(id);
    try {
      let gpsFields: Partial<Lancamento> = {};
      if (status === "APROVADO" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          gpsFields = { aprovado_lat: pos.coords.latitude, aprovado_lng: pos.coords.longitude };
        } catch { /* GPS indisponível, segue sem */ }
      }
      await onUpdateLaunchStatus(id, status, obs, undefined, undefined, gpsFields);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper info panel */}
      <div className="p-5 bg-gradient-to-r from-[#1a4332] to-[#2d6a4f] rounded-xl text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black ">Central de Pendências Operacionais</h2>
          <p className="text-xs text-[#94a3b8] mt-1 font-medium">Controle de qualidade e fluxo em tempo real. Identifique gargalos, aprove apontamentos, resolva glosas e monitore ociosidades de campo.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] bg-[#0f172a] text-[#4ade80] border border-[#1e293b] font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Foco Operacional de Segurança</span>
          </span>
        </div>
      </div>

      {/* Grid count summary for categories */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { id: "awaiting_approval", label: "Aguardando Aprovação", count: awaitingApproval.length, icon: Clock, color: "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/50" },
          { id: "returned", label: "Glosas / Devolvidos", count: returnedLaunches.length, icon: XCircle, color: "border-red-200 text-red-700 bg-red-50 hover:bg-red-100/50" },
          { id: "awaiting_billing", label: "Prontos p/ Faturar", count: awaitingBilling.length, icon: FileSpreadsheet, color: "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100/50" },
          { id: "idle_equipments", label: "Máquinas s/ Boletim", count: idleEquipments.length, icon: Tractor, color: "border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100" },
          { id: "idle_colols", label: "Operadores sem Post", count: idleColols.length, icon: UserMinus, color: "border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100" }
        ].map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group ${
                isActive 
                  ? "ring-2 ring-[#2563eb] bg-white border-transparent shadow-md scale-[1.02]" 
                  : cat.color + " shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <cat.icon className={`w-5 h-5 ${isActive ? "text-[#2563eb]" : "opacity-80"}`} />
                <span className={`text-[9px] uppercase tracking-wider font-semibold ${isActive ? "text-[#2563eb]" : "opacity-75"}`}>Visualizar</span>
              </div>
              <div>
                <h4 className={`text-xs font-bold leading-tight ${isActive ? "text-slate-900" : "opacity-90"}`}>{cat.label}</h4>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className={`text-2xl font-black ${isActive ? "text-[#2563eb]" : "text-slate-900"}`}>{cat.count}</span>
                  <span className="text-[10px] font-bold text-slate-400">itens</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Action Block Container */}
      <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
        
        {/* Header of Active Selection */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {activeCategory === "awaiting_approval" && "Boletins Aguardando Aprovação Técnica"}
              {activeCategory === "returned" && "Boletins Glosados / Devolvidos para Ajuste"}
              {activeCategory === "awaiting_billing" && "Boletins Aprovados e Prontos para Faturamento SAP"}
              {activeCategory === "idle_equipments" && "Máquinas Sem Apontamento Recente (Mais de 3 dias)"}
              {activeCategory === "idle_colols" && "Operadores Sem Apontamento Lançado neste Período"}
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">Fila de trabalho dinâmica para ações rápidas de faturamento e operação florestal.</p>
          </div>
          <span className="text-[10px] bg-[#f8fafc] text-[#2563eb] px-2.5 py-1 rounded-full font-bold">
            Mostrando {
              activeCategory === "awaiting_approval" ? awaitingApproval.length :
              activeCategory === "returned" ? returnedLaunches.length :
              activeCategory === "awaiting_billing" ? awaitingBilling.length :
              activeCategory === "idle_equipments" ? idleEquipments.length :
              idleColols.length
            } itens
          </span>
        </div>

        {/* ACTIVE TABLE CONTENT */}
        
        {/* 1. awaiting_approval & returned & awaiting_billing */}
        {(activeCategory === "awaiting_approval" || activeCategory === "returned" || activeCategory === "awaiting_billing") && (
          <div className="overflow-x-auto">
            {(() => {
              const list = activeCategory === "awaiting_approval" ? awaitingApproval :
                           activeCategory === "returned" ? returnedLaunches : awaitingBilling;
              
              if (list.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-blue-500 mx-auto opacity-70 animate-bounce" />
                    <h4 className="text-xs font-bold text-slate-700">Tudo em ordem!</h4>
                    <p className="text-[11px] text-slate-500">Nenhum registro pendente de ação nesta fila.</p>
                  </div>
                );
              }

              return (
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[#64748b] text-[10px] uppercase font-black tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3">Cód / Data</th>
                      <th className="py-3 px-3">Operador</th>
                      <th className="py-3 px-3">Equipamento</th>
                      <th className="py-3 px-3">UP / Fazenda</th>
                      <th className="py-3 px-3">Horímetro Inicial/Final</th>
                      <th className="py-3 px-3 text-center">Horas SAP</th>
                      {activeCategory === "returned" && <th className="py-3 px-3">Motivo da Glosa</th>}
                      <th className="py-3 px-3 text-right">Ação Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 group transition-colors">
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[10.5px] font-black text-slate-900 block">#{l.id}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{formatDateBR(l.data)}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block">{l.operador_nome}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Reg: {l.operador_codigo}</span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#2563eb]">
                          {l.frota}
                          <span className="text-[10px] text-slate-400 font-sans font-semibold block mt-0.5">{l.equipamento}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block">{l.up}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{l.fazenda} - {l.nucleo}</span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-600">
                          {l.horimetro_inicial} <span className="text-slate-300">→</span> {l.horimetro_final}
                          <span className="text-[10px] text-[#64748b] font-sans font-semibold block mt-0.5">Trabalhadas: {l.horas_trabalhadas}h</span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-50/40">
                          {l.horas_sap}h
                        </td>
                        {activeCategory === "returned" && (
                          <td className="py-3.5 px-3 text-red-600 font-semibold italic max-w-xs truncate">
                            "{l.observacao || "Glosado sem justificativa cadastrada."}"
                          </td>
                        )}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            
                            {/* Actions for awaiting_approval */}
                            {activeCategory === "awaiting_approval" && (
                              <>
                                <button
                                  disabled={loadingId === l.id}
                                  onClick={() => handleQuickStatus(l.id, "APROVADO")}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-[#2563eb] hover:text-white rounded-lg border border-blue-100 text-[10.5px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                  title="Aprovar Lançamento"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Aprovar</span>
                                </button>
                                
                                {showObsInput[l.id] ? (
                                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                    <input
                                      type="text"
                                      placeholder="Motivo da Glosa..."
                                      value={obsText[l.id] || ""}
                                      onChange={(e) => setObsText(prev => ({ ...prev, [l.id]: e.target.value }))}
                                      className="p-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-red-500 w-28 bg-white"
                                    />
                                    <button
                                      disabled={loadingId === l.id || !obsText[l.id]}
                                      onClick={() => handleQuickStatus(l.id, "DEVOLVIDO", obsText[l.id])}
                                      className="p-1 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-red-700"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => setShowObsInput(prev => ({ ...prev, [l.id]: false }))}
                                      className="p-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowObsInput(prev => ({ ...prev, [l.id]: true }))}
                                    className="p-1.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-lg border border-red-100 text-[10.5px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Glosar / Devolver"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Glosar</span>
                                  </button>
                                )}
                              </>
                            )}

                            {/* Actions for returned */}
                            {activeCategory === "returned" && (
                              <button
                                onClick={() => {
                                  onNavigateToTab("lancamentos");
                                }}
                                className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg border border-amber-100 text-[10.5px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Revisar Boletim</span>
                              </button>
                            )}

                            {/* Actions for awaiting_billing */}
                            {activeCategory === "awaiting_billing" && (
                              <button
                                disabled={loadingId === l.id}
                                onClick={() => handleQuickStatus(l.id, "FATURADO")}
                                className="p-1.5 bg-[#2563eb] text-white hover:bg-[#0f172a] rounded-lg text-[10.5px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              >
                                <Landmark className="w-3.5 h-3.5" />
                                <span>Processar Faturamento (SAP)</span>
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}

        {/* 2. Idle Equipments */}
        {activeCategory === "idle_equipments" && (
          <div className="overflow-x-auto">
            {idleEquipments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-blue-500 mx-auto opacity-70" />
                <h4 className="text-xs font-bold text-slate-700">Toda a frota ativa!</h4>
                <p className="text-[11px] text-slate-500">Todos os equipamentos possuem lançamentos registrados recentemente.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[#64748b] text-[10px] uppercase font-black tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3">Frota / Chave</th>
                    <th className="py-3 px-3">Tipo de Máquina</th>
                    <th className="py-3 px-3">Taxa de Valor/Hora</th>
                    <th className="py-3 px-3">Último Apontamento</th>
                    <th className="py-3 px-3">Status Operacional</th>
                    <th className="py-3 px-3 text-right">Ação Corretiva</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {idleEquipments.map((eq) => {
                    const eqLaunches = launches.filter(l => l.frota === eq.frota);
                    const lastLaunch = eqLaunches.length > 0 
                      ? [...eqLaunches].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
                      : null;
                    
                    return (
                      <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-xs font-black text-slate-900 block">{eq.frota}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Chave: {eq.chave}</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">
                          {eq.tipo}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                          {formatCurrency(eq.valor_hora)}/h
                        </td>
                        <td className="py-3.5 px-3">
                          {lastLaunch ? (
                            <div>
                              <span className="font-bold text-slate-900 block">{formatDateBR(lastLaunch.data)}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Operador: {lastLaunch.operador_nome}</span>
                            </div>
                          ) : (
                            <span className="text-red-500 font-bold italic text-[10px] uppercase">Sem lançamento cadastrado</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-100 inline-flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                            Ocioso / Sem Apontamento
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => {
                              onNavigateToTab("lancamentos");
                              // A little timeout to allow DOM to render and trigger opening the form
                              setTimeout(() => {
                                const btn = document.getElementById("btn_abrir_lancamento");
                                if (btn) btn.click();
                              }, 150);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 border border-slate-200 hover:border-transparent rounded-lg text-[10.5px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Lançar Apontamento</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 3. Idle Collaborators */}
        {activeCategory === "idle_colols" && (
          <div className="overflow-x-auto">
            {idleColols.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-blue-500 mx-auto opacity-70" />
                <h4 className="text-xs font-bold text-slate-700">100% de Presença de Campo!</h4>
                <p className="text-[11px] text-slate-500">Todos os operadores possuem apontamentos registrados no sistema.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[#64748b] text-[10px] uppercase font-black tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3">Operador / Registro</th>
                    <th className="py-3 px-3">Função / Equipe</th>
                    <th className="py-3 px-3">Status Operacional</th>
                    <th className="py-3 px-3 text-right">Ação Corretiva</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {idleColols.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 block">{col.nome}</span>
                        <span className="font-mono text-[10.5px] text-slate-400 font-bold block mt-0.5">Reg: {col.registro}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block">{col.funcao}</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Equipe: {col.equipe}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 text-[10px] rounded-full font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1 font-mono">
                          Ausência de Boletim de Campo
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => {
                            onNavigateToTab("lancamentos");
                            setTimeout(() => {
                              const btn = document.getElementById("btn_abrir_lancamento");
                              if (btn) btn.click();
                            }, 150);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 border border-slate-200 hover:border-transparent rounded-lg text-[10.5px] font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Lançar Boletim de RH</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
