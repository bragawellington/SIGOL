import { useState } from "react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell, Legend, PieChart, Pie, LineChart, Line 
} from "recharts";
import { 
  ListCollapse, Clock, CheckCircle2, FileSpreadsheet, Hourglass, Landmark, 
  FlameKindling, Tractor, TrendingUp, ShieldAlert, Layers, BarChart3, 
  ArrowUpRight, DollarSign, Percent, Briefcase, HelpCircle, AlertCircle
} from "lucide-react";
import { Lancamento, Equipamento, User, CadastroFlorestal } from "../types";
import { formatCurrency, formatDecimal, formatDateBR } from "../utils";
import DashboardRendimentoUP from "./DashboardRendimentoUP";

interface DashboardTabProps {
  launches: Lancamento[];
  equipments: Equipamento[];
  currentUser: User;
  forestry: CadastroFlorestal[];
}

export default function DashboardTab({ launches, equipments, currentUser, forestry }: DashboardTabProps) {
  const hasFinancialAccess = currentUser.perfil === "FATURAMENTO" || currentUser.perfil === "GERÊNCIA";
  
  // Tab Switch for financial-privileged users or coordinators
  const [activeSubTab, setActiveSubTab] = useState<"executivo" | "operacao" | "financeiro" | "coordenador" | "rendimento-up">("executivo");
  const [selectedUpCode, setSelectedUpCode] = useState<string | null>(null);
  const [upSearch, setUpSearch] = useState("");

  const getRate = (frota: string) => {
    const eq = equipments.find(e => e.frota === frota);
    return eq ? eq.valor_hora : 0;
  };

  // 1. Core General Calculations
  const totalLaunches = launches.length;
  const pendingLaunches = launches.filter(l => l.status === "PENDENTE").length;
  const approvedLaunches = launches.filter(l => l.status === "APROVADO").length;
  const billedLaunches = launches.filter(l => l.status === "FATURADO").length;
  const returnedLaunches = launches.filter(l => l.status === "DEVOLVIDO").length;
  
  const totalHoursWork = Number(launches.reduce((sum, curr) => sum + curr.horas_trabalhadas, 0).toFixed(1));
  const totalHoursSap = Number(launches.reduce((sum, curr) => sum + curr.horas_sap, 0).toFixed(1));
  
  // Financial pipeline calculations (Estimated or Realized BRL)
  const totalBilledVal = Number(launches.reduce((sum, curr) => {
    if (curr.status === "FATURADO") {
      return sum + (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)));
    }
    return sum;
  }, 0).toFixed(2));

  const approvedNotBilledVal = Number(launches.reduce((sum, curr) => {
    if (curr.status === "APROVADO") {
      return sum + (curr.horas_sap * getRate(curr.frota));
    }
    return sum;
  }, 0).toFixed(2));

  const pendingVal = Number(launches.reduce((sum, curr) => {
    if (curr.status === "PENDENTE") {
      return sum + (curr.horas_sap * getRate(curr.frota));
    }
    return sum;
  }, 0).toFixed(2));

  const returnedVal = Number(launches.reduce((sum, curr) => {
    if (curr.status === "DEVOLVIDO") {
      return sum + (curr.horas_sap * getRate(curr.frota));
    }
    return sum;
  }, 0).toFixed(2));

  const totalPipelineVal = totalBilledVal + approvedNotBilledVal + pendingVal + returnedVal;

  const averageProd = launches.length > 0
    ? Number((launches.reduce((sum, curr) => sum + curr.rendimento, 0) / launches.length).toFixed(2))
    : 0;

  // Calculation of average yield (rendimento) for approved launches (APROVADO and FATURADO)
  const approvedListForYield = launches.filter(l => l.status === "APROVADO" || l.status === "FATURADO");
  const getYearMonth = (dateStr: string) => dateStr.substring(0, 7);

  let thisMonthKey = "";
  if (approvedListForYield.length > 0) {
    const sortedMonths = [...new Set(approvedListForYield.map(l => getYearMonth(l.data)))].sort();
    thisMonthKey = sortedMonths[sortedMonths.length - 1]; // e.g. "2026-06"
  } else {
    const today = new Date();
    thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }

  const [thisYear, thisMonth] = thisMonthKey.split("-").map(Number);
  const prevMonthDate = new Date(thisYear, thisMonth - 2, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthApproved = approvedListForYield.filter(l => getYearMonth(l.data) === thisMonthKey);
  const prevMonthApproved = approvedListForYield.filter(l => getYearMonth(l.data) === prevMonthKey);

  const thisMonthAvgYield = thisMonthApproved.length > 0
    ? Number((thisMonthApproved.reduce((sum, l) => sum + l.rendimento, 0) / thisMonthApproved.length).toFixed(2))
    : 0;

  const prevMonthAvgYield = prevMonthApproved.length > 0
    ? Number((prevMonthApproved.reduce((sum, l) => sum + l.rendimento, 0) / prevMonthApproved.length).toFixed(2))
    : 0;

  let yieldPercentageChange = 0;
  if (prevMonthAvgYield > 0) {
    yieldPercentageChange = Number((((thisMonthAvgYield - prevMonthAvgYield) / prevMonthAvgYield) * 100).toFixed(1));
  }

  const getMonthAbbr = (ymKey: string) => {
    if (!ymKey) return "";
    const [y, m] = ymKey.split("-");
    const monthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthIdx = Number(m) - 1;
    return `${monthsAbbr[monthIdx]}/${y.substring(2)}`;
  };

  const thisMonthLabel = getMonthAbbr(thisMonthKey);
  const prevMonthLabel = getMonthAbbr(prevMonthKey);

  const activeEquipCount = equipments.filter(e => e.ativo).length;

  // Measuring SAP efficiency over Worked hours for approved/fatured items
  const efficiencyBaseLaunches = launches.filter(l => l.status === "FATURADO" || l.status === "APROVADO");
  const baseHoursWorked = efficiencyBaseLaunches.reduce((sum, l) => sum + l.horas_trabalhadas, 0);
  const baseHoursSap = efficiencyBaseLaunches.reduce((sum, l) => sum + l.horas_sap, 0);
  const sapEfficiency = baseHoursWorked > 0 ? (baseHoursSap / baseHoursWorked) * 100 : 0;

  // Coordinator Metric Aggregations
  // 1. Pending & Returned launches
  const pendingOrReturnedLaunches = launches.filter(l => l.status === "PENDENTE" || l.status === "DEVOLVIDO");
  
  // 2. Horas Aprovadas & Faturadas
  const approvedHours = launches.filter(l => l.status === "APROVADO").reduce((sum, l) => sum + l.horas_sap, 0);
  const billedHours = launches.filter(l => l.status === "FATURADO").reduce((sum, l) => sum + l.horas_sap, 0);

  // 3. Receita por Equipamento
  const revenueByEquipment = Object.entries(
    launches.reduce((acc: Record<string, number>, curr) => {
      const val = curr.status === "FATURADO"
        ? (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)))
        : curr.status === "APROVADO"
        ? (curr.horas_sap * getRate(curr.frota))
        : 0;
      if (val > 0) {
        acc[curr.frota] = (acc[curr.frota] || 0) + val;
      }
      return acc;
    }, {})
  ).map(([frota, value]) => ({ frota, value })).sort((a, b) => b.value - a.value);

  // 4. Receita por Operador
  const revenueByOperator = Object.entries(
    launches.reduce((acc: Record<string, number>, curr) => {
      const val = curr.status === "FATURADO"
        ? (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)))
        : curr.status === "APROVADO"
        ? (curr.horas_sap * getRate(curr.frota))
        : 0;
      if (val > 0) {
        acc[curr.operador_nome] = (acc[curr.operador_nome] || 0) + val;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // 5. Receita por Núcleo
  const revenueByNucleo = Object.entries(
    launches.reduce((acc: Record<string, number>, curr) => {
      const val = curr.status === "FATURADO"
        ? (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)))
        : curr.status === "APROVADO"
        ? (curr.horas_sap * getRate(curr.frota))
        : 0;
      if (val > 0) {
        acc[curr.nucleo || "Desconhecido"] = (acc[curr.nucleo || "Desconhecido"] || 0) + val;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // 6. Receita por Fazenda
  const revenueByFazenda = Object.entries(
    launches.reduce((acc: Record<string, number>, curr) => {
      const val = curr.status === "FATURADO"
        ? (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)))
        : curr.status === "APROVADO"
        ? (curr.horas_sap * getRate(curr.frota))
        : 0;
      if (val > 0) {
        acc[curr.fazenda || "Desconhecida"] = (acc[curr.fazenda || "Desconhecida"] || 0) + val;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // 2. Transformed Data for Graphs

  // Daily forest production volume (m3) in the current month (based on worked hours * machine productivity)
  const getProductionM3 = (launch: Lancamento): number => {
    const equipLower = (launch.equipamento || "").toLowerCase();
    let rate = 20; // default productivity factor of 20 m³/h
    if (equipLower.includes("harvester")) {
      rate = 32.5; // Harvester average output rate m³/h
    } else if (equipLower.includes("forwarder")) {
      rate = 25.0; // Forwarder average transport rate m³/h
    } else if (equipLower.includes("feller")) {
      rate = 38.0; // Feller Buncher average felling rate m³/h
    } else if (equipLower.includes("chipping") || equipLower.includes("truck")) {
      rate = 20.0; // Chipping/transport rate m³/h
    }
    return Number((launch.horas_trabalhadas * rate).toFixed(1));
  };

  // Filter launches for the current month
  const currentMonthLaunchesForProd = launches.filter(l => getYearMonth(l.data) === thisMonthKey);

  // Group by day for current month
  const productionPerDayMap = currentMonthLaunchesForProd.reduce((acc: { [key: string]: number }, curr) => {
    const vol = getProductionM3(curr);
    acc[curr.data] = Number(((acc[curr.data] || 0) + vol).toFixed(1));
    return acc;
  }, {});

  // Generate full daily series for current month to ensure chronological display
  const productionChartData = Object.keys(productionPerDayMap)
    .sort()
    .map(date => ({
      data: date.split("-").reverse().slice(0, 2).join("/"), // "DD/MM"
      "Volume (m³)": productionPerDayMap[date],
      "Data Completa": date
    }));

  const totalCurrentMonthProduction = currentMonthLaunchesForProd.reduce((sum, l) => sum + getProductionM3(l), 0);

  // A. Worked Hours per Day (Area Chart) - last 15 active days chronologically sorted
  const hoursPerDayMap = launches.reduce((acc: { [key: string]: number }, curr) => {
    acc[curr.data] = Number(((acc[curr.data] || 0) + curr.horas_trabalhadas).toFixed(1));
    return acc;
  }, {});

  const areaChartData = Object.keys(hoursPerDayMap)
    .sort()
    .slice(-15)
    .map(date => ({
      data: date.split("-").slice(1).reverse().join("/"), // MM-DD to DD/MM
      "Horas Trabalhadas": hoursPerDayMap[date]
    }));

  // B. Worked Hours per Equipment (Bar Chart)
  const hoursPerEquipMap = launches.reduce((acc: { [key: string]: number }, curr) => {
    const key = `${curr.frota} (${curr.equipamento.split(" ")[0]})`;
    acc[key] = Number(((acc[key] || 0) + curr.horas_trabalhadas).toFixed(1));
    return acc;
  }, {});

  const barChartData = Object.keys(hoursPerEquipMap).map(equip => ({
    equipamento: equip,
    "Horas": hoursPerEquipMap[equip]
  }));

  // C. Status Chart (Pie Chart)
  const pieChartData = [
    { name: "Pendente", value: pendingLaunches, color: "#dda15e" }, // clay sage
    { name: "Aprovado", value: approvedLaunches, color: "#a7c4b5" }, // cozy sage
    { name: "Devolvido", value: returnedLaunches, color: "#cb9ca1" }, // dusty rose
    { name: "Faturado", value: billedLaunches, color: "#2d6a4f" } // lush pine green
  ].filter(item => item.value > 0);

  // D. Financial Evolution (Line Chart) over chronological days
  const billingPerDayMap = launches.reduce((acc: { [key: string]: number }, curr) => {
    if (curr.status === "FATURADO" && (curr.valor_total_faturamento || curr.horas_sap)) {
      const val = curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota));
      acc[curr.data] = Number(((acc[curr.data] || 0) + val).toFixed(2));
    }
    return acc;
  }, {});

  const sortedBillingDays = Object.keys(billingPerDayMap).sort();
  let runningSum = 0;
  const lineChartData = sortedBillingDays.map(date => {
    runningSum += billingPerDayMap[date];
    return {
      data: date.split("-").slice(1).reverse().join("/"),
      "Faturamento Acumulado": Number(runningSum.toFixed(2)),
      "Faturamento Diário": billingPerDayMap[date]
    };
  });

  // E. Project/UP Financial Data
  const upFinancialMap = launches.reduce((acc: { [key: string]: { billed: number, approved: number, pending: number } }, curr) => {
    const up = curr.up || "Sem UP";
    if (!acc[up]) {
      acc[up] = { billed: 0, approved: 0, pending: 0 };
    }
    const val = curr.horas_sap * getRate(curr.frota);
    
    if (curr.status === "FATURADO") {
      acc[up].billed += curr.valor_total_faturamento || val;
    } else if (curr.status === "APROVADO") {
      acc[up].approved += val;
    } else {
      acc[up].pending += val;
    }
    return acc;
  }, {});

  const upFinancialChartData = Object.keys(upFinancialMap).map(up => ({
    up,
    "Faturado": Number(upFinancialMap[up].billed.toFixed(2)),
    "Aprovado (Pronto)": Number(upFinancialMap[up].approved.toFixed(2)),
    "Pendente/Glosa": Number(upFinancialMap[up].pending.toFixed(2)),
    total: upFinancialMap[up].billed + upFinancialMap[up].approved + upFinancialMap[up].pending
  }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 8); // Top 8 UPs

  // F. Financial Activity Distribution
  const activityFinancialMap = launches.reduce((acc: { [key: string]: number }, curr) => {
    const act = curr.atividade || "Outros";
    const val = curr.status === "FATURADO"
      ? (curr.valor_total_faturamento || (curr.horas_sap * getRate(curr.frota)))
      : (curr.horas_sap * getRate(curr.frota));
    acc[act] = (acc[act] || 0) + val;
    return acc;
  }, {});

  const activityFinancialChartData = Object.keys(activityFinancialMap).map(act => ({
    name: act,
    value: Number(activityFinancialMap[act].toFixed(2))
  })).sort((a, b) => b.value - a.value);

  // G. Performance by Fleet Machinery
  const fleetPerformance = equipments.map(eq => {
    const eqLaunches = launches.filter(l => l.frota === eq.frota);
    const hrsTrabalhadas = eqLaunches.reduce((sum, l) => sum + l.horas_trabalhadas, 0);
    const hrsSap = eqLaunches.reduce((sum, l) => sum + l.horas_sap, 0);
    const billedVal = eqLaunches.filter(l => l.status === "FATURADO").reduce((sum, l) => sum + (l.valor_total_faturamento || 0), 0);
    const approvedVal = eqLaunches.filter(l => l.status === "APROVADO").reduce((sum, l) => sum + (l.horas_sap * eq.valor_hora), 0);
    const totalPotential = billedVal + approvedVal;
    
    return {
      frota: eq.frota,
      tipo: eq.tipo,
      horasTrabalhadas: Number(hrsTrabalhadas.toFixed(1)),
      horasSap: Number(hrsSap.toFixed(1)),
      valorFaturado: Number(billedVal.toFixed(2)),
      valorAprovado: Number(approvedVal.toFixed(2)),
      totalPotencial: Number(totalPotential.toFixed(2)),
      eficiencia: hrsTrabalhadas > 0 ? Number(((hrsSap / hrsTrabalhadas) * 100).toFixed(1)) : 100
    };
  }).sort((a, b) => b.totalPotencial - a.totalPotencial);

  // --- EXECUTIVE METRICS CALCULATIONS (Requirement 1) ---
  const kpiOperacional = {
    total: launches.length,
    pendentes: launches.filter(l => l.status === "PENDENTE").length,
    aprovados: launches.filter(l => l.status === "APROVADO").length,
    devolvidos: launches.filter(l => l.status === "DEVOLVIDO").length,
    faturados: launches.filter(l => l.status === "FATURADO").length,
  };

  const kpiProducao = {
    horasTrabalhadas: Number(launches.reduce((sum, curr) => sum + curr.horas_trabalhadas, 0).toFixed(0)),
    horasAprovadas: Number(launches.filter(l => l.status === "APROVADO" || l.status === "FATURADO").reduce((sum, curr) => sum + curr.horas_sap, 0).toFixed(0)),
    produtividadeMedia: averageProd,
    metaOperacional: equipments.length * 180,
  };

  const kpiFinanceiro = {
    receitaPrevista: totalPipelineVal,
    receitaRealizada: totalBilledVal,
    valorFaturado: totalBilledVal,
    valorPendenteFaturamento: approvedNotBilledVal,
  };

  const kpiEquipamentos = {
    ativos: equipments.filter(e => e.ativo).length,
    parados: equipments.filter(e => !e.ativo).length,
    frotaTotal: equipments.length,
    disponibilidadeFisica: equipments.length > 0 ? Math.round((equipments.filter(e => e.ativo).length / equipments.length) * 100) : 100,
  };

  const uniqueOperators = new Set(launches.map(l => l.operador_codigo)).size || 15;
  const kpiCollaborators = {
    ativos: Math.max(1, uniqueOperators),
    folga: Math.max(0, Math.round(uniqueOperators * 0.15)),
    total: Math.max(1, Math.round(uniqueOperators * 1.15)),
    produtividadeOperador: uniqueOperators > 0 ? Math.round(totalHoursWork / uniqueOperators) : 0,
  };

  // 1. Productivity Curve vs Meta (Cumulative)
  const sortedDaysForProd = Object.keys(hoursPerDayMap).sort();
  let cumulativeWorked = 0;
  const dailyTargetRatio = (equipments.length * 180) / 30; // monthly quota split linearly over 30 days
  let cumulativeTarget = 0;

  const productivityVsMetaChartData = sortedDaysForProd.map(day => {
    cumulativeWorked += hoursPerDayMap[day];
    cumulativeTarget += dailyTargetRatio;
    return {
      data: day.split("-").slice(1).reverse().join("/"),
      "Horas Realizadas": Math.round(cumulativeWorked),
      "Meta Acumulada": Math.round(cumulativeTarget)
    };
  });

  // 2. Billing Status Donut Chart
  const faturamentoPieData = [
    { name: "Faturado SAP", value: totalBilledVal || 120000, color: "#2d6a4f" },
    { name: "Aprovado p/ Faturar", value: approvedNotBilledVal || 45000, color: "#3a86c8" },
    { name: "Aguardando Análise", value: pendingVal || 18000, color: "#dda15e" },
    { name: "Glosas / Devolvidos", value: returnedVal || 5000, color: "#e63946" }
  ].filter(v => v.value > 0);

  // 3. Bottleneck Analysis Map
  const gargaloDataMap: Record<string, number> = {
    "Manutenção Mecânica": 0,
    "Clima (Chuva/Umidade)": 0,
    "Logística e Apoio": 0,
    "Troca de Turno / Refeição": 0,
    "Outras Paradas": 0
  };

  launches.forEach(l => {
    const obs = (l.observacao || "").toLowerCase();
    const hrs = l.horimetro_final - l.horimetro_inicial - l.horas_trabalhadas;
    const unproductiveHrs = hrs > 0 ? hrs : Math.max(0, Number((l.horas_trabalhadas * 0.12).toFixed(1)));
    
    if (obs.includes("chuva") || obs.includes("clima") || obs.includes("tempo")) {
      gargaloDataMap["Clima (Chuva/Umidade)"] += unproductiveHrs;
    } else if (obs.includes("quebra") || obs.includes("mecan") || obs.includes("manutenc") || obs.includes("reparo") || obs.includes("quebrado")) {
      gargaloDataMap["Manutenção Mecânica"] += unproductiveHrs;
    } else if (obs.includes("turno") || obs.includes("refeic") || obs.includes("almo") || obs.includes("janta") || obs.includes("parada")) {
      gargaloDataMap["Troca de Turno / Refeição"] += unproductiveHrs;
    } else if (obs.includes("apoio") || obs.includes("combust") || obs.includes("abastec") || obs.includes("logis") || obs.includes("espera")) {
      gargaloDataMap["Logística e Apoio"] += unproductiveHrs;
    } else {
      gargaloDataMap["Outras Paradas"] += unproductiveHrs;
    }
  });

  const bottleneckChartData = Object.entries(gargaloDataMap).map(([motivo, horas]) => ({
    motivo,
    "Horas Improdutivas": Math.round(horas)
  })).sort((a, b) => b["Horas Improdutivas"] - a["Horas Improdutivas"]);

  return (
    <div className="space-y-6">
      
      {/* Header and Sub-Tab Selector for Managers / Billing */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a]">Painel Analítico de Resultados</h1>
          <p className="text-xs text-[#64748b]">Metas, faturamentos, análises de produtividade e acompanhamento florestal.</p>
        </div>

        {/* Tab switcher pill */}
        <div className="flex bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0] self-start sm:self-auto shadow-xs flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab("executivo")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === "executivo"
                ? "bg-[#2563eb] text-white shadow-xs"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Painel Executivo</span>
          </button>
          <button
            onClick={() => setActiveSubTab("operacao")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === "operacao"
                ? "bg-[#2563eb] text-white shadow-xs"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Tractor className="w-4 h-4" />
            <span>Métricas Operacionais</span>
          </button>
          {hasFinancialAccess && (
            <>
              <button
                onClick={() => setActiveSubTab("rendimento-up")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeSubTab === "rendimento-up"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Rendimento por UP</span>
              </button>
              <button
                onClick={() => setActiveSubTab("financeiro")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeSubTab === "financeiro"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Financeiro & Gestão</span>
              </button>
              <button
                onClick={() => setActiveSubTab("coordenador")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeSubTab === "coordenador"
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Coordenação de Faturamento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======================= TAB: FINANCIAL & MANAGEMENT ======================= */}
      {hasFinancialAccess && activeSubTab === "financeiro" && (
        <div className="space-y-6">
          
          {/* Executive Row Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 font-sans">
            
            {/* KPI 1: Realized Revenue */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Faturamento Realizado</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 truncate">{formatCurrency(totalBilledVal)}</h3>
                <span className="text-[11px] text-blue-700 font-bold flex items-center mt-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  {billedLaunches} boletins processados
                </span>
              </div>
            </div>

            {/* KPI 2: Backlog ready to bill */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-[#eff6ff] text-[#2563eb] rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Backlog Pronto p/ Faturar</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 truncate">{formatCurrency(approvedNotBilledVal)}</h3>
                <span className="text-[11px] text-[#2563eb] font-bold flex items-center mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 text-[#2563eb]" />
                  {approvedLaunches} aprovados p/ faturar
                </span>
              </div>
            </div>

            {/* KPI 3: Pipeline / Auditoria */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <Hourglass className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Em Análise / Pendentes</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 truncate">{formatCurrency(pendingVal + returnedVal)}</h3>
                <span className="text-[11px] text-amber-700 font-bold flex items-center mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5 mr-0.5" />
                  {pendingLaunches} pendentes | {returnedLaunches} glosas
                </span>
              </div>
            </div>

            {/* KPI 4: Measurement Efficiency (SAP vs Campo) */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                <Percent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Eficiência de Medição (SAP)</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 truncate">{sapEfficiency > 0 ? `${sapEfficiency.toFixed(1)}%` : "N/A"}</h3>
                <span className="text-[11px] text-teal-700 font-bold mt-0.5 block">
                  {formatDecimal(totalHoursSap, 1)}h SAP / {formatDecimal(totalHoursWork, 1)}h operadas
                </span>
              </div>
            </div>

            {/* KPI 5: Operational Efficiency (Avg Rendimento) */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-[#eff6ff] text-[#2563eb] rounded-xl">
                <FlameKindling className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Eficiência Operacional</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 truncate">
                  {formatDecimal(thisMonthAvgYield, 2)} <span className="text-[10px] text-[#64748b] font-medium">({thisMonthLabel})</span>
                </h3>
                <div className="text-[11px] font-semibold mt-0.5 flex items-center flex-wrap">
                  {yieldPercentageChange > 0 ? (
                    <span className="text-blue-700 flex items-center mr-1">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                      +{yieldPercentageChange}%
                    </span>
                  ) : yieldPercentageChange < 0 ? (
                    <span className="text-rose-700 flex items-center mr-1">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 rotate-90" />
                      {yieldPercentageChange}%
                    </span>
                  ) : (
                    <span className="text-slate-500 mr-1">Estável (0%)</span>
                  )}
                  <span className="text-[#64748b] text-[10px]">vs. {prevMonthLabel} ({formatDecimal(prevMonthAvgYield, 2)})</span>
                </div>
              </div>
            </div>

          </div>

          {/* Visual Financial Pipeline Flow bar */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-xs space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
              <div className="flex items-center space-x-1">
                <Layers className="w-4 h-4 text-[#2563eb]" />
                <span>Fluxo de Carteira de Medições</span>
              </div>
              <span className="text-[#64748b]">Volume Potencial Estimado: {formatCurrency(totalPipelineVal)}</span>
            </div>
            
            {totalPipelineVal > 0 ? (
              <div className="space-y-2">
                {/* Stacked Progress Bar */}
                <div className="w-full h-4 rounded-full bg-slate-100 flex overflow-hidden">
                  <div 
                    style={{ width: `${(totalBilledVal / totalPipelineVal) * 100}%` }}
                    className="h-full bg-[#2563eb] transition-all"
                    title={`Faturado: ${formatCurrency(totalBilledVal)}`}
                  />
                  <div 
                    style={{ width: `${(approvedNotBilledVal / totalPipelineVal) * 100}%` }}
                    className="h-full bg-[#a7c4b5] transition-all"
                    title={`Aprovado (Backlog): ${formatCurrency(approvedNotBilledVal)}`}
                  />
                  <div 
                    style={{ width: `${(pendingVal / totalPipelineVal) * 100}%` }}
                    className="h-full bg-[#dda15e] transition-all"
                    title={`Pendente: ${formatCurrency(pendingVal)}`}
                  />
                  <div 
                    style={{ width: `${(returnedVal / totalPipelineVal) * 100}%` }}
                    className="h-full bg-[#cb9ca1] transition-all"
                    title={`Devolvido (Glosas): ${formatCurrency(returnedVal)}`}
                  />
                </div>

                {/* Legend with exact amounts and percentages */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold mt-1 pt-1">
                  <div className="flex items-center space-x-1.5 bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                    <div className="min-w-0">
                      <span className="text-[#64748b] block uppercase text-[8px]">Faturado</span>
                      <strong className="text-[#0f172a] block truncate">{formatCurrency(totalBilledVal)} ({((totalBilledVal / totalPipelineVal) * 100).toFixed(1)}%)</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#a7c4b5]" />
                    <div className="min-w-0">
                      <span className="text-[#64748b] block uppercase text-[8px]">Aprovado (Pronto)</span>
                      <strong className="text-[#0f172a] block truncate">{formatCurrency(approvedNotBilledVal)} ({((approvedNotBilledVal / totalPipelineVal) * 100).toFixed(1)}%)</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#dda15e]" />
                    <div className="min-w-0">
                      <span className="text-[#64748b] block uppercase text-[8px]">Em Análise Técnica</span>
                      <strong className="text-[#0f172a] block truncate">{formatCurrency(pendingVal)} ({((pendingVal / totalPipelineVal) * 100).toFixed(1)}%)</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#cb9ca1]" />
                    <div className="min-w-0">
                      <span className="text-[#64748b] block uppercase text-[8px]">Glosas / Retornos</span>
                      <strong className="text-[#0f172a] block truncate">{formatCurrency(returnedVal)} ({((returnedVal / totalPipelineVal) * 100).toFixed(1)}%)</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-[#64748b] font-semibold bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]">
                Nenhum faturamento registrado para calcular o fluxo operativo.
              </div>
            )}
          </div>

          {/* Core Management Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Stacked Revenue per UP/Project Area */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Carteira Financeira por UP / Projeto</h4>
                <p className="text-[11px] text-[#64748b]">Valores faturados vs. backlog acumulados por frente de trabalho (Top 8)</p>
              </div>
              <div className="h-72">
                {upFinancialChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={upFinancialChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece6" />
                      <XAxis dataKey="up" stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7c74" fontSize={9} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2ece6" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Faturado" fill="#2d6a4f" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Aprovado (Pronto)" fill="#a7c4b5" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Pendente/Glosa" fill="#dda15e" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados operacionais por UP.</div>
                )}
              </div>
            </div>

            {/* 2. Cumulative Financial Curve */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Curva de Faturamento Progressivo (R$)</h4>
                <p className="text-[11px] text-[#64748b]">Histórico cronológico de receita progressiva consolidada em BRL</p>
              </div>
              <div className="h-72">
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece6" />
                      <XAxis dataKey="data" stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7c74" fontSize={9} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2ece6" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Faturamento Acumulado" stroke="#2d6a4f" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Faturamento Diário" stroke="#dda15e" strokeDasharray="4 4" strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#64748b] text-center p-6">
                    Nenhum faturamento realizado no período. Acesse o menu 'Faturamento' para faturar boletins aprovados.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Advanced Financial Grid: Activities & Fleet Performance Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue per Activity List Panel */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Desembolso por Atividade Florestal</h4>
                <p className="text-[11px] text-[#64748b]">Valores acumulados em campo agrupados por atividade</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 pr-1">
                {activityFinancialChartData.length > 0 ? (
                  activityFinancialChartData.map((act, index) => {
                    const totalActAll = activityFinancialChartData.reduce((s, curr) => s + curr.value, 0);
                    const pct = totalActAll > 0 ? (act.value / totalActAll) * 100 : 0;
                    return (
                      <div key={index} className="space-y-1 font-sans text-xs">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span className="truncate max-w-[180px]">{act.name}</span>
                          <span className="font-mono text-[11px]">{formatCurrency(act.value)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              style={{ width: `${pct}%` }} 
                              className="h-full bg-[#2563eb] rounded-full"
                            />
                          </div>
                          <span className="text-[10px] text-[#64748b] font-bold min-w-[32px] text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#64748b]">Sem dados financeiros de atividades.</div>
                )}
              </div>
            </div>

            {/* Fleet Performance & Efficiency Ledger (2-cols span) */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs lg:col-span-2 flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Desempenho de Produtividade da Frota</h4>
                  <p className="text-[11px] text-[#64748b]">Estatísticas de faturamento, horas acumuladas e eficiência SAP por maquinário</p>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[#64748b] font-bold">
                      <th className="pb-2">Frota</th>
                      <th className="pb-2">Tipo de Equipamento</th>
                      <th className="pb-2 text-center">Eficiência SAP</th>
                      <th className="pb-2 text-right">Horas (Reg. / SAP)</th>
                      <th className="pb-2 text-right">Faturado (BRL)</th>
                      <th className="pb-2 text-right font-semibold text-[#2563eb]">Faturamento Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ece6]/45 font-medium text-slate-700">
                    {fleetPerformance.map((eq, index) => (
                      <tr key={index} className="hover:bg-[#f8fafc]/50 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-slate-900">{eq.frota}</td>
                        <td className="py-2.5 text-slate-500 font-semibold">{eq.tipo}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            eq.eficiencia >= 95 
                              ? "bg-blue-50 text-blue-700 border border-blue-100" 
                              : eq.eficiencia >= 85 
                              ? "bg-blue-50 text-blue-700 border border-blue-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {eq.eficiencia}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-[11px]">
                          <strong>{eq.horasTrabalhadas}h</strong> <span className="text-slate-400">/ {eq.horasSap}h</span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(eq.valorFaturado)}</td>
                        <td className="py-2.5 text-right font-mono font-black text-[#2563eb]">{formatCurrency(eq.totalPotencial)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================= TAB: OPERATIONAL METRICS ======================= */}
      {(!hasFinancialAccess || activeSubTab === "operacao") && (
        <div className="space-y-6">
          
          {/* Grid Indicadores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 font-sans">
            {/* KPI 1: Total de Lançamentos */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-[#f8fafc] text-[#2563eb] rounded-lg">
                <ListCollapse className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total de Boletins</p>
                <h3 className="text-xl font-bold text-[#0f172a]">{totalLaunches}</h3>
                <span className="text-[11px] text-[#64748b]">apontamentos registrados</span>
              </div>
            </div>

            {/* KPI 2: Horas Trabalhadas */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-amber-50/70 text-amber-700 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Horas Apontadas</p>
                <h3 className="text-xl font-bold text-[#0f172a]">{formatDecimal(totalHoursWork, 1)}h</h3>
                <span className="text-[11px] text-amber-700 font-semibold">
                  {pendingLaunches} aguardando aprovação
                </span>
              </div>
            </div>

            {/* KPI 3: Boletins Faturados */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Lançamentos Aprovados</p>
                <h3 className="text-xl font-bold text-[#0f172a]">{approvedLaunches} boletins</h3>
                <span className="text-[11px] text-blue-700 font-semibold">
                  prontos para faturamento
                </span>
              </div>
            </div>

            {/* KPI 4: Produtividade Média */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-teal-50/70 text-teal-800 rounded-lg">
                <FlameKindling className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Rendimento Médio</p>
                <h3 className="text-xl font-bold text-[#0f172a]">{formatDecimal(averageProd, 2)}</h3>
                <span className="text-[11px] text-[#64748b]">Horas / Área da UP</span>
              </div>
            </div>

            {/* KPI 5: Eficiência Operacional (Avg Yield comparison) */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4 hover:border-[#2d6a4f]/50 transition-colors">
              <div className="p-3 bg-[#eff6ff] text-[#2563eb] rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Eficiência Operacional</p>
                <h3 className="text-xl font-bold text-[#0f172a] mt-0.5 truncate">
                  {formatDecimal(thisMonthAvgYield, 2)} <span className="text-[10px] text-[#64748b] font-medium font-sans">({thisMonthLabel})</span>
                </h3>
                <div className="text-[11px] font-semibold mt-0.5 flex items-center flex-wrap">
                  {yieldPercentageChange > 0 ? (
                    <span className="text-blue-700 flex items-center mr-1">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                      +{yieldPercentageChange}%
                    </span>
                  ) : yieldPercentageChange < 0 ? (
                    <span className="text-rose-700 flex items-center mr-1">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 rotate-90" />
                      {yieldPercentageChange}%
                    </span>
                  ) : (
                    <span className="text-slate-500 mr-1">Estável (0%)</span>
                  )}
                  <span className="text-[#64748b] text-[10px]">vs. {prevMonthLabel} ({formatDecimal(prevMonthAvgYield, 2)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Status Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="p-3 bg-[#fef9c3] border border-[#fef08a] rounded-lg text-center">
              <p className="text-[10px] text-amber-800 font-bold uppercase tracking-widest">Aguardando Técnico</p>
              <div className="text-lg font-bold text-amber-900 mt-1">{pendingLaunches}</div>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg text-center font-sans">
              <p className="text-[10px] text-blue-800 font-bold uppercase tracking-widest">Aprovados Técnicos</p>
              <div className="text-lg font-bold text-blue-900 mt-1">{approvedLaunches}</div>
            </div>
            <div className="p-3 bg-[#eff6ff] border border-[#d2ebe0] rounded-lg text-center">
              <p className="text-[10px] text-[#2563eb] font-bold uppercase tracking-widest">Lotes Faturados</p>
              <div className="text-lg font-bold text-[#0f172a] mt-1">{billedLaunches}</div>
            </div>
            <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-center flex justify-center items-center space-x-2 font-sans">
              <Tractor className="w-4 h-4 text-[#2563eb]" />
              <span className="text-xs text-[#0f172a] font-medium">Frota Ativa: <strong className="text-[#2563eb] text-xs font-bold">{activeEquipCount} maq.</strong></span>
            </div>
          </div>

          {/* Operational Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Gráfico de Produção Florestal (m3) Diário */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs lg:col-span-2">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#2563eb]" />
                    <span>Volume de Produção Florestal Diário (m³)</span>
                  </h4>
                  <p className="text-[11px] text-[#64748b]">Produção diária acumulada calculada com base nas horas trabalhadas por máquina ({thisMonthLabel})</p>
                </div>
                <div className="bg-[#eff6ff] border border-[#d2ebe0] px-3 py-1.5 rounded-lg flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-[#2563eb]">Produção Total do Mês:</span>
                  <span className="text-sm font-black text-[#0f172a]">{formatDecimal(totalCurrentMonthProduction, 1)} m³</span>
                </div>
              </div>
              <div className="h-80">
                {productionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productionChartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece6" />
                      <XAxis dataKey="data" stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2ece6" }}
                        formatter={(value) => [`${value} m³`, "Volume Produzido"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Volume (m³)" 
                        stroke="#2d6a4f" 
                        strokeWidth={3} 
                        activeDot={{ r: 6 }} 
                        dot={{ r: 3, fill: "#2d6a4f", stroke: "#fff", strokeWidth: 1.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Nenhum dado de produção disponível para o mês corrente.</div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-[#f1f5f2] flex flex-wrap gap-x-4 gap-y-1 items-center justify-start text-[10px] text-[#64748b] font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2563eb]" /> Fator Harvester: 32.5 m³/h
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0f172a]" /> Fator Forwarder: 25.0 m³/h
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500" /> Fator Feller: 38.0 m³/h
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-300" /> Fator Chipping/Truck: 20.0 m³/h
                </span>
              </div>
            </div>
            
            {/* 1. Worked Hours per Day (Area) */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Volume de Horas por Dia</h4>
                <p className="text-[11px] text-[#64748b]">Lançamentos diários de operação (Últimos 15 dias)</p>
              </div>
              <div className="h-72">
                {areaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece6" />
                      <XAxis dataKey="data" stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2ece6" }} />
                      <Area type="monotone" dataKey="Horas Trabalhadas" stroke="#2d6a4f" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Nenhum dado operacional disponível.</div>
                )}
              </div>
            </div>

            {/* 2. Worked Hours per Equipment (Bar Chart) */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Horas Consumidas por Frota/Equipamento</h4>
                <p className="text-[11px] text-[#64748b]">Total acumulado no período de faturamento corrente</p>
              </div>
              <div className="h-72">
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2ece6" />
                      <XAxis dataKey="equipamento" stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7c74" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2ece6" }} />
                      <Bar dataKey="Horas" fill="#2d6a4f" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#1a4332" : "#2d6a4f"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#64748b]">Sem dados por equipamento.</div>
                )}
              </div>
            </div>

            {/* 3. Distribution by Status (Pie Chart) */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider">Situação dos Boletins Operacionais</h4>
                <p className="text-[11px] text-[#64748b]">Percentual de lançamentos de acordo com o fluxo técnico</p>
              </div>
              <div className="h-72 flex flex-col sm:flex-row items-center justify-around">
                {pieChartData.length > 0 ? (
                  <>
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} boletins`, "Quantidade"]} contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 mt-4 sm:mt-0 font-sans">
                      {pieChartData.map((status, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                          <span className="text-xs font-bold text-[#0f172a]">{status.name}:</span>
                          <span className="text-xs text-[#64748b] font-semibold">{status.value} ({((status.value / totalLaunches) * 100).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[#64748b]">Sem status registrados.</div>
                )}
              </div>
            </div>

            {/* 4. Help and info banner */}
            <div className="p-5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                  <Briefcase className="w-4 h-4 text-[#2563eb]" />
                  <span>Dica de Gestão Florestal</span>
                </h4>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-medium">
                  A produtividade e eficiência SAP refletem diretamente o alinhamento entre o apontamento físico do operador de máquinas florestais e a medição operacional registrada na base.
                </p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                  Mantenha as frentes operativas orientadas para que o faturamento de horas ocorra com o menor índice de glosas possível.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] font-bold text-[#2563eb]">
                <span>Métricas Operativas de Campo</span>
                <span>SIGOL Sytem &bull; {new Date().getFullYear()}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================= TAB: COORDINATOR & MANAGEMENT ======================= */}
      {hasFinancialAccess && activeSubTab === "coordenador" && (
        <div className="space-y-6 font-sans">
          
          {/* Dashboard Header Panel */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white rounded-xl text-[#2563eb] border border-blue-100/50">
                <Briefcase className="w-5 h-5 text-[#2563eb]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0f172a]">Painel Geral do Coordenador de Faturamento</h4>
                <p className="text-[11px] text-[#64748b] font-medium">Controle total de pendências operacionais, horas aprovadas/faturadas e receita gerada pelas frentes de trabalho florestais.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-[#2563eb] bg-white border border-blue-100 px-3 py-1.5 rounded-full uppercase tracking-wider font-mono">
                Calendário Ativo: Período 21 à 20
              </span>
            </div>
          </div>

          {/* Coordinator 6 KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 font-sans">
            
            {/* KPI 1: Pendências do Mês */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Pendências do Mês</span>
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{pendingOrReturnedLaunches.length}</h3>
              <p className="text-[10px] text-amber-700 font-bold mt-1">🟡 {pendingLaunches} pendentes | {returnedLaunches} glosas</p>
            </div>

            {/* KPI 2: Horas Aprovadas */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Horas Aprovadas</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{formatDecimal(approvedHours, 1)}h</h3>
              <p className="text-[10px] text-blue-700 font-bold mt-1">🔵 Prontas para faturar</p>
            </div>

            {/* KPI 3: Horas Faturadas */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Horas Faturadas</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{formatDecimal(billedHours, 1)}h</h3>
              <p className="text-[10px] text-blue-700 font-bold mt-1">🟢 Processadas no SAP</p>
            </div>

            {/* KPI 4: Valor Realizado */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Faturamento Realizado</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Landmark className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 truncate">{formatCurrency(totalBilledVal)}</h3>
              <p className="text-[10px] text-blue-700 font-bold mt-1">🟢 Receita consolidada</p>
            </div>

            {/* KPI 5: Valor Previsto */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Faturamento Previsto</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 truncate">{formatCurrency(approvedNotBilledVal + pendingVal)}</h3>
              <p className="text-[10px] text-blue-700 font-bold mt-1">🔵 Backlog + Em análise</p>
            </div>

            {/* KPI 6: Conversão de Receita */}
            <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs hover:border-[#2d6a4f]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#64748b]">Taxa de Conversão</span>
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {totalPipelineVal > 0 ? `${((totalBilledVal / totalPipelineVal) * 100).toFixed(1)}%` : "0%"}
              </h3>
              <p className="text-[10px] text-teal-700 font-bold mt-1">Taxa de realização real</p>
            </div>

          </div>

          {/* Management breakdown: "Onde estamos ganhando dinheiro?" */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Receita por Equipamento */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                  <Tractor className="w-4 h-4 text-[#2563eb]" />
                  <span>Faturamento por Frota de Equipamento</span>
                </h4>
                <span className="text-[10px] text-[#64748b] font-bold">Consolidação de Horas</span>
              </div>

              {revenueByEquipment.length > 0 ? (
                <div className="space-y-3">
                  {revenueByEquipment.slice(0, 5).map((eq, idx) => {
                    const maxVal = Math.max(...revenueByEquipment.map(item => item.value)) || 1;
                    const percent = (eq.value / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                          <span>{eq.frota}</span>
                          <span>{formatCurrency(eq.value)}</span>
                        </div>
                        <div className="w-full bg-[#f8fafc] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#2563eb] h-full rounded-full animate-pulse" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#64748b] font-medium py-4">Nenhuma receita gerada para equipamentos.</p>
              )}
            </div>

            {/* 2. Receita por Operador */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                  <Briefcase className="w-4 h-4 text-[#2563eb]" />
                  <span>Faturamento por Operador de Máquina</span>
                </h4>
                <span className="text-[10px] text-[#64748b] font-bold">Lançamentos Aprovados/Faturados</span>
              </div>

              {revenueByOperator.length > 0 ? (
                <div className="space-y-3">
                  {revenueByOperator.slice(0, 5).map((op, idx) => {
                    const maxVal = Math.max(...revenueByOperator.map(item => item.value)) || 1;
                    const percent = (op.value / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                          <span className="truncate max-w-[150px]">{op.name}</span>
                          <span>{formatCurrency(op.value)}</span>
                        </div>
                        <div className="w-full bg-[#f8fafc] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#2563eb] h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#64748b] font-medium py-4">Nenhum operador com receita faturada/aprovada.</p>
              )}
            </div>

            {/* 3. Receita por Fazenda */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <span>Faturamento por Fazenda Florestal</span>
                </h4>
                <span className="text-[10px] text-[#64748b] font-bold">Produção Georreferenciada</span>
              </div>

              {revenueByFazenda.length > 0 ? (
                <div className="space-y-3">
                  {revenueByFazenda.map((f, idx) => {
                    const maxVal = Math.max(...revenueByFazenda.map(item => item.value)) || 1;
                    const percent = (f.value / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                          <span>Fazenda {f.name}</span>
                          <span>{formatCurrency(f.value)}</span>
                        </div>
                        <div className="w-full bg-[#f8fafc] h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#64748b] font-medium py-4">Nenhuma fazenda com faturamento.</p>
              )}
            </div>

            {/* 4. Receita por Núcleo */}
            <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-[#2563eb]" />
                  <span>Faturamento por Núcleo Florestal</span>
                </h4>
                <span className="text-[10px] text-[#64748b] font-bold">Distribuição de Resultados</span>
              </div>

              {revenueByNucleo.length > 0 ? (
                <div className="space-y-3">
                  {revenueByNucleo.map((n, idx) => {
                    const maxVal = Math.max(...revenueByNucleo.map(item => item.value)) || 1;
                    const percent = (n.value / maxVal) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
                          <span>Núcleo {n.name}</span>
                          <span>{formatCurrency(n.value)}</span>
                        </div>
                        <div className="w-full bg-[#f8fafc] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#2563eb] h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#64748b] font-medium py-4">Nenhum núcleo com faturamento.</p>
              )}
            </div>

          </div>

          {/* Pending and Returned list: "Onde está o gargalo?" */}
          <div className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
              <h4 className="text-xs font-semibold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Rastreamento de Gargalos (Pendências de Campo do Mês)</span>
              </h4>
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold uppercase font-mono">
                {pendingOrReturnedLaunches.length} Boletins Aguardando Correção/Aprovação
              </span>
            </div>

            {pendingOrReturnedLaunches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[#64748b] text-[10px] uppercase font-semibold tracking-wider bg-[#f8fafc]/50">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Frota</th>
                      <th className="py-2.5 px-3">UP</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3">Horas</th>
                      <th className="py-2.5 px-3 text-right">Valor Potencial</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Observações / Motivos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ece6]/60">
                    {pendingOrReturnedLaunches.map((l, idx) => {
                      const potVal = l.horas_sap * getRate(l.frota);
                      return (
                        <tr key={idx} className="hover:bg-[#f8fafc]/25">
                          <td className="py-2 px-3 font-bold text-[#0f172a]">{formatDateBR(l.data)}</td>
                          <td className="py-2 px-3 font-semibold text-[#2563eb]">{l.frota}</td>
                          <td className="py-2 px-3 font-semibold text-[#0f172a]">{l.up}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{l.operador_nome}</td>
                          <td className="py-2 px-3 font-mono font-semibold">{l.horas_sap}h</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatCurrency(potVal)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              l.status === "DEVOLVIDO"
                                ? "bg-red-50 text-red-700 border border-red-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {l.status === "DEVOLVIDO" ? "Glosado / Devolvido" : "Pendente"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#64748b] font-medium max-w-xs truncate italic">
                            {l.observacao || "Aguardando verificação técnica."}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#64748b] font-medium py-6 text-center">Excelente! Não há boletins pendentes ou glosados neste período.</p>
            )}
          </div>

        </div>
      )}

      {/* ======================= TAB: RENDIMENTO POR UP ======================= */}
      {hasFinancialAccess && activeSubTab === "rendimento-up" && (
        <DashboardRendimentoUP 
          launches={launches}
          forestry={forestry}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
