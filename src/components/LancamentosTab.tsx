import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, RefreshCw, Check, X, ClipboardCheck, CornerUpLeft, 
  HelpCircle, Eye, Info, Calendar, Download, AlertTriangle, ChevronDown,
  FileSpreadsheet, Upload, LayoutGrid, List, Pencil
} from "lucide-react";
import { Lancamento, Equipamento, CadastroFlorestal, Colaborador, User, Atividade } from "../types";
import { formatCurrency, formatDecimal, formatDateBR, exportToCSV } from "../utils";
import { supabase, isDemo } from "../lib/supabase";

interface LancamentosTabProps {
  launches: Lancamento[];
  equipments: Equipamento[];
  forestry: CadastroFlorestal[];
  colaboradores: Colaborador[];
  currentUser: User;
  atividades: Atividade[];
  onAddLaunch: (launch: Omit<Lancamento, "id" | "criado_por" | "criado_em" | "status" | "aprovado_por" | "aprovado_em" | "faturado_por" | "faturado_em" | "rendimento" | "horas_trabalhadas" | "equipamento" | "fazenda" | "nucleo" | "area_up"> & { anexo?: string, anexo_nome?: string }) => Promise<void>;
  onUpdateLaunchStatus: (id: string, status: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO", obs?: string, rate?: number, horas_sap?: number, otherFields?: Partial<Lancamento>) => Promise<void>;
  onImportLaunchList?: (list: any[]) => Promise<void>;
}

export default function LancamentosTab({ 
  launches, 
  equipments, 
  forestry, 
  colaboradores, 
  currentUser,
  atividades,
  onAddLaunch,
  onUpdateLaunchStatus,
  onImportLaunchList
}: LancamentosTabProps) {
  
  // 1. States
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formFileBase64, setFormFileBase64] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState<string | null>(null);
  const [formFileDragActive, setFormFileDragActive] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterFrota, setFilterFrota] = useState<string>("ALL");
  const [filterUP, setFilterUP] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedLaunch, setSelectedLaunch] = useState<Lancamento | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Return feedback dialog
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form Field States
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    frota: "",
    up: "",
    horimetro_inicial: "",
    horimetro_final: "",
    horas_sap: "",
    atividade: "",
    operador_codigo: "",
    operador_nome: "",
    observacao: ""
  });

  // Autocomplete search states (UP only)
  const [upSearch, setUpSearch] = useState("");
  const [showUpSuggestions, setShowUpSuggestions] = useState(false);
  const [upResults, setUpResults] = useState<CadastroFlorestal[]>([]);
  const [upSearching, setUpSearching] = useState(false);

  // Debounced UP search via Supabase RPC or in-memory
  useEffect(() => {
    if (upSearch.length < 2) { setUpResults([]); return; }
    const timer = setTimeout(async () => {
      setUpSearching(true);
      if (!isDemo && supabase) {
        const { data } = await supabase.rpc('buscar_up', { termo: upSearch });
        setUpResults(data || []);
      } else {
        const q = upSearch.toLowerCase();
        setUpResults(forestry.filter(f =>
          f.up.toLowerCase().includes(q) || f.fazenda.toLowerCase().includes(q) || f.nucleo.toLowerCase().includes(q)
        ).slice(0, 50));
      }
      setUpSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [upSearch]);

  // Editing general items states (for Faturamento and Gerência)
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
  const [editStatus, setEditStatus] = useState<"PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO">("PENDENTE");

  const handleStartEditGeneral = (launch: Lancamento) => {
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

  const handleSaveEditGeneral = async () => {
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
      alert("Falha ao salvar edições do lançamento.");
    }
  };

  // Calculated Field states for local form rendering
  const [calcEquip, setCalcEquip] = useState("");
  const [calcFazenda, setCalcFazenda] = useState("");
  const [calcNucleo, setCalcNucleo] = useState("");
  const [calcArea, setCalcArea] = useState<number | null>(null);
  const [calcHorasTrabalhadas, setCalcHorasTrabalhadas] = useState<number>(0);
  const [calcRendimento, setCalcRendimento] = useState<number>(0);

  // 2. Operator is always the logged-in user
  useEffect(() => {
    const match = colaboradores.find(c => c.registro === currentUser.codigo) 
      || colaboradores.find(c => c.nome.toLowerCase() === currentUser.nome.toLowerCase());
    if (match) {
      setFormData(prev => ({
        ...prev,
        operador_codigo: match.registro,
        operador_nome: match.nome
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        operador_codigo: currentUser.codigo || "",
        operador_nome: currentUser.nome
      }));
    }
  }, [currentUser, colaboradores]);

  // Alertas Inteligentes
  const getActiveAlerts = () => {
    const alerts: string[] = [];
    const today = new Date();

    // 1. Equipamento sem lançamento há 3 dias
    equipments.filter(e => e.ativo).forEach(eq => {
      const eqLaunches = launches.filter(l => l.frota === eq.frota);
      if (eqLaunches.length === 0) {
        alerts.push(`🚨 Equipamento ${eq.frota} (${eq.tipo.split(" ")[0]}) nunca realizou apontamentos.`);
        return;
      }
      const sortedDates = eqLaunches.map(l => new Date(l.data)).sort((a, b) => b.getTime() - a.getTime());
      const latestDate = sortedDates[0];
      const diffTime = Math.abs(today.getTime() - latestDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 3) {
        alerts.push(`🚨 Frota ${eq.frota} (${eq.tipo.split(" ")[0]}): Sem lançamento operacional há ${diffDays} dias.`);
      }
    });

    // 2. Técnico com lançamentos pendentes há mais de 48h
    const pendingOver48h = launches.filter(l => {
      if (l.status !== "PENDENTE") return false;
      const createdDate = new Date(l.criado_em);
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffHours = diffTime / (1000 * 60 * 60);
      return diffHours >= 48;
    });
    if (pendingOver48h.length > 0) {
      alerts.push(`🚨 Técnico com ${pendingOver48h.length} lançamentos pendentes há mais de 48h.`);
    }

    // 3. Dias até o encerramento do período (dia 20)
    const currentDay = today.getDate();
    let daysLeft = 0;
    if (currentDay > 20) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 20);
      const diff = nextMonth.getTime() - today.getTime();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    } else {
      const thisMonth20 = new Date(today.getFullYear(), today.getMonth(), 20);
      const diff = thisMonth20.getTime() - today.getTime();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    if (daysLeft <= 5 && daysLeft >= 0) {
      alerts.push(`🚨 Período operacional próximo do fechamento! Restam ${daysLeft} dias para o encerramento (Dia 20).`);
    }

    return alerts;
  };

  // CSV/Excel Import Helper
  const handleCSVImport = async (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error("O arquivo CSV está vazio ou não possui cabeçalho.");
      }

      const headerLine = lines[0];
      const separator = headerLine.includes(";") ? ";" : ",";
      const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

      const list: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ""));
        const row: any = {};
        headers.forEach((h, index) => {
          row[h] = columns[index];
        });

        // Helper: convert Brazilian number (comma decimal) to JS number
        const parseBrNumber = (val: string): number => {
          if (!val) return 0;
          return Number(val.replace(/\./g, "").replace(",", "."));
        };

        // Helper: convert dd/mm/yyyy to yyyy-mm-dd
        const parseBrDate = (val: string): string => {
          if (!val) return new Date().toISOString().split("T")[0];
          const parts = val.split("/");
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          return val; // already yyyy-mm-dd
        };

        const mappedRow = {
          data: parseBrDate(row.data || row["data de realização"] || row.date || ""),
          frota: row.frota || row["código da frota"] || row.fleet || row.equipamento_codigo,
          up: row.up || row["unidade de produção"] || row["unidade de producao"] || row.projeto,
          horimetro_inicial: parseBrNumber(row.horimetro_inicial || row["horímetro inicial"] || row["horimetro inicial"] || "0"),
          horimetro_final: parseBrNumber(row.horimetro_final || row["horímetro final"] || row["horimetro final"] || "0"),
          atividade: row.atividade || row.activity || "Corte Mecanizado",
          operador_codigo: row.operador_codigo || row["código do operador"] || row["codigo do operador"] || row.operator_code,
          operador_nome: row.operador_nome || row["nome do operador"] || row.operator_name,
          observacao: row.observacao || row["observações"] || row.observacoes || row.notes || "Importado via planilha"
        };

        if (mappedRow.data && mappedRow.frota && mappedRow.up && !isNaN(mappedRow.horimetro_final)) {
          // Resolve equipment and forestry data
          const eq = equipments.find(e => e.frota === mappedRow.frota);
          const fEntry = forestry.find(f => f.up === mappedRow.up);
          const horas = mappedRow.horimetro_final - mappedRow.horimetro_inicial;
          list.push({
            ...mappedRow,
            equipamento: eq?.tipo || mappedRow.frota,
            fazenda: fEntry?.fazenda || "",
            nucleo: fEntry?.nucleo || "",
            area_up: fEntry?.area || 0,
            rendimento: fEntry?.area && fEntry.area > 0 ? Number((horas / fEntry.area).toFixed(4)) : 0
          });
        }
      }

      if (list.length === 0) {
        throw new Error("Nenhum registro válido foi encontrado no arquivo. Verifique os campos obrigatórios (data, frota, up, horimetro_final).");
      }

      if (onImportLaunchList) {
        await onImportLaunchList(list);
        alert(`Planilha importada com sucesso! ${list.length} apontamentos registrados.`);
        setShowImportModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Falha na leitura ou processamento do arquivo CSV.");
    }
  };

  // Drag & Drop handlers for CSV Import modal
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleCSVImport(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // Drag & Drop / File select handlers for Form Attachments
  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFormFileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setFormFileDragActive(true);
    } else if (e.type === "dragleave") {
      setFormFileDragActive(false);
    }
  };

  const handleFormFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormFileDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFormFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormFileBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. Automated Form Calculations & Fillers
  // A. Pick Frota -> Autocomplete Equip, seek latest horometer final
  const handleFrotaChange = (frotaCode: string) => {
    const equip = equipments.find(e => e.frota === frotaCode);
    if (!equip) {
      setCalcEquip("");
      return;
    }
    setCalcEquip(equip.tipo);

    // Filter relevant launches chronologically for this equipment to find latest horometer final value
    const sortedEqLaunches = [...launches]
      .filter(l => l.frota === frotaCode)
      .sort((a, b) => b.data.localeCompare(a.data) || Number(b.horimetro_final) - Number(a.horimetro_final));

    const latestHorFinal = sortedEqLaunches.length > 0 ? sortedEqLaunches[0].horimetro_final : 0;
    const hasHistory = sortedEqLaunches.length > 0;

    setFormData(prev => ({
      ...prev,
      frota: frotaCode,
      horimetro_inicial: hasHistory ? String(latestHorFinal) : ""
    }));
  };

  // B. Pick UP -> Autocomplete Fazenda, Núcleo, Area
  const handleUPChange = (upCode: string) => {
    const f = forestry.find(item => item.up === upCode);
    if (!f) {
      setCalcFazenda("");
      setCalcNucleo("");
      setCalcArea(null);
      return;
    }
    setCalcFazenda(f.fazenda);
    setCalcNucleo(f.nucleo);
    setCalcArea(f.area);

    setFormData(prev => ({
      ...prev,
      up: upCode
    }));
  };

  const getBrazilDateString = () => {
    const d = new Date();
    const options = { timeZone: 'America/Sao_Paulo', year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(d);
  };

  // C. Calculate Worked Hours and Rendimento
  useEffect(() => {
    const hInit = Number(formData.horimetro_inicial) || 0;
    const hEnd = Number(formData.horimetro_final) || 0;
    const horasTrabalhadas = Number((hEnd - hInit).toFixed(1));
    
    setCalcHorasTrabalhadas(horasTrabalhadas >= 0 ? horasTrabalhadas : 0);
    
    const area = calcArea || 1.0;
    const rendimento = horasTrabalhadas > 0 ? Number((horasTrabalhadas / area).toFixed(2)) : 0;
    setCalcRendimento(rendimento);
  }, [formData.horimetro_inicial, formData.horimetro_final, calcArea]);

  // 4. Filter Launch Listings
  const filteredLaunches = launches.filter(l => {
    // A. Boundary constraints based on user profile: "OPERADOR: Consultar apenas seus lançamentos"
    if (currentUser.perfil === "OPERADOR") {
      const isCreator = l.criado_por.toLowerCase() === currentUser.email.toLowerCase();
      const isOperatorCode = l.operador_codigo === formData.operador_codigo;
      if (!isCreator && !isOperatorCode) return false;
    }

    // B. Search Filters
    const matchesSearch = 
      l.operador_nome.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.equipamento.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.frota.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.up.toLowerCase().includes(filterSearch.toLowerCase()) ||
      l.atividade.toLowerCase().includes(filterSearch.toLowerCase());

    const matchesStatus = filterStatus === "ALL" ? true : l.status === filterStatus;
    const matchesDateFrom = !filterDateFrom || l.data >= filterDateFrom;
    const matchesDateTo = !filterDateTo || l.data <= filterDateTo;
    const matchesFrota = filterFrota === "ALL" ? true : l.frota === filterFrota;
    const matchesUP = filterUP === "ALL" ? true : l.up === filterUP;

    return matchesSearch && matchesStatus && matchesFrota && matchesUP && matchesDateFrom && matchesDateTo;
  });

  // 5. Handlers
  const handleSubmitLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate
    if (!formData.frota) return setValidationError("Favor selecionar a frota do equipamento.");
    if (!formData.up) return setValidationError("Favor selecionar a UP florestal.");
    if (!formData.atividade) return setValidationError("Favor selecionar a atividade operacional.");
    
    // Rule: Não permitir lançamento posterior a data atual.
    const todayStr = getBrazilDateString();
    if (formData.data > todayStr) {
      return setValidationError(`Não é permitido registrar apontamento com data futura (${formatDateBR(formData.data)}). A data máxima permitida é hoje (${formatDateBR(todayStr)}).`);
    }

    // Rule: Bloqueio de data retroativa - Operador só pode lançar hoje ou ontem
    if (currentUser.perfil === "OPERADOR") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      if (formData.data < yesterdayStr) {
        return setValidationError(`Operadores podem lançar apenas no dia atual ou anterior. Para datas mais antigas, solicite ao Faturamento.`);
      }
    }

    // Rule: Alerta de turno duplicado - mesma frota + mesmo dia + mesmo operador
    const duplicateAlert = launches.some(
      l => l.data === formData.data && l.frota === formData.frota && l.operador_codigo === formData.operador_codigo
    );
    if (duplicateAlert) {
      return setValidationError(`Já existe um boletim para a frota ${formData.frota} no dia ${formatDateBR(formData.data)} com seu registro. Verifique antes de lançar novamente.`);
    }

    const hInit = Number(formData.horimetro_inicial);
    const hEnd = Number(formData.horimetro_final);
    
    if (isNaN(hInit) || hInit < 0) return setValidationError("Horímetro Inicial inválido.");
    if (isNaN(hEnd) || hEnd <= hInit) return setValidationError("Horímetro Final deve ser maior que o Horímetro Inicial.");
    
    // Rule: Não permitir lançamentos maiores que 11 horas trabalhadas.
    const workedHours = Number((hEnd - hInit).toFixed(1));
    if (workedHours > 11) {
      return setValidationError(`Não é permitido registrar mais de 11 horas trabalhadas por boletim operacional (calculado: ${workedHours}h).`);
    }

    try {
      await onAddLaunch({
        data: formData.data,
        frota: formData.frota,
        up: formData.up,
        equipamento: calcEquip || formData.frota,
        fazenda: calcFazenda || "",
        nucleo: calcNucleo || "",
        area_up: calcArea || 0,
        horimetro_inicial: hInit,
        horimetro_final: hEnd,
        horas_trabalhadas: workedHours,
        horas_sap: workedHours,
        rendimento: calcArea && calcArea > 0 ? Number((workedHours / calcArea).toFixed(4)) : 0,
        atividade: formData.atividade,
        operador_codigo: formData.operador_codigo,
        operador_nome: formData.operador_nome,
        observacao: formData.observacao,
        anexo: formFileBase64 || undefined,
        anexo_nome: formFileName || undefined
      } as any);

      // Clear states & close
      setShowAddForm(false);
      setFormFileBase64(null);
      setFormFileName(null);
      setUpSearch("");
      setFormData(prev => ({
        ...prev,
        frota: "",
        up: "",
        horimetro_final: "",
        horas_sap: "",
        atividade: "",
        observacao: ""
      }));
      setCalcEquip("");
      setCalcFazenda("");
      setCalcNucleo("");
      setCalcArea(null);
    } catch (err: any) {
      setValidationError("Erro ao registrar lançamento operacional.");
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm("Confirmar aprovação técnica deste lançamento?")) {
      await onUpdateLaunchStatus(id, "APROVADO");
    }
  };

  const handleOpenReject = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Favor descrever o motivo da devolução operacional.");
      return;
    }
    if (rejectingId) {
      await onUpdateLaunchStatus(rejectingId, "DEVOLVIDO", rejectReason);
      setRejectingId(null);
    }
  };

  // HTML5 Drag and drop helpers (Requirement 4)
  const handleDropToStatus = async (launchId: string, targetStatus: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO") => {
    if (targetStatus === "DEVOLVIDO") {
      setRejectingId(launchId);
      setRejectReason("");
    } else {
      await onUpdateLaunchStatus(launchId, targetStatus);
    }
  };

  const onDropColumn = (e: React.DragEvent, status: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      handleDropToStatus(id, status);
    }
  };

  // EXCEL EXPORT trigger
  const handleExportExcel = () => {
    const headers = [
      "ID", "Data", "Frota", "Equipamento", "UP", "Fazenda", "Núcleo", "Área UP (ha)", 
      "Horímetro Inicial", "Horímetro Final", "Horas Trabalhadas", "Horas SAP", 
      "Atividade", "Cód. Operador", "Nome Operador", "Rendimento", "Status", "Observações"
    ];

    const rows = filteredLaunches.map(l => [
      l.id, l.data, l.frota, l.equipamento, l.up, l.fazenda, l.nucleo, l.area_up,
      l.horimetro_inicial, l.horimetro_final, l.horas_trabalhadas, l.horas_sap,
      l.atividade, l.operador_codigo, l.operador_nome, l.rendimento, l.status, l.observacao
    ]);

    exportToCSV(`SIGOL_Lancamentos_${currentUser.perfil}`, headers, rows);
  };

  const alerts = getActiveAlerts();

  return (
    <div className="space-y-6">

      {/* Smart Alerts Box */}
      {alerts.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 shadow-xs space-y-2">
          <div className="flex items-center space-x-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-700 animate-pulse shrink-0" />
            <span>Painel de Alertas Operacionais Críticos ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px] font-semibold text-amber-900 font-mono">
            {alerts.map((al, idx) => (
              <div key={idx} className="flex items-center space-x-1.5 bg-white/75 p-2 rounded-lg border border-amber-200/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>{al}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a]">Apontamentos Operacionais</h1>
          <p className="text-xs text-[#64748b]">
            {currentUser.perfil === "OPERADOR" 
              ? `Histórico de lançamentos pessoais realizados por ${currentUser.nome}.`
              : "Consulte, valide ou devolva os apontamentos florestais realizados pela frota de campo."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Fused View Mode Switch */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Conditional rendering for creation button depending on access controls (GERÊNCIA cannot create) */}
          {(currentUser.perfil === "OPERADOR" || currentUser.perfil === "FATURAMENTO") && (
            <button
              onClick={() => setShowAddForm(true)}
              id="btn_abrir_lancamento"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1e293b] text-white font-semibold rounded-lg text-xs transition-all shadow-xs group cursor-pointer"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span>Criar Lançamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Last horímetro per frota */}
      {(() => {
        const lastHorimetros = new Map<string, { final: number; data: string }>();
        for (const l of launches) {
          if (!lastHorimetros.has(l.frota) || l.data > (lastHorimetros.get(l.frota)?.data || "")) {
            lastHorimetros.set(l.frota, { final: l.horimetro_final, data: l.data });
          }
        }
        const entries = Array.from(lastHorimetros.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        if (entries.length === 0) return null;
        return (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {entries.map(([frota, info]) => (
              <div key={frota} className="shrink-0 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-[#2563eb]">{frota}</span>
                <span className="text-[#64748b] ml-2">Último:</span>
                <span className="font-mono font-bold text-[#0f172a] ml-1">{info.final.toFixed(1)}</span>
                <span className="text-[10px] text-[#94a3b8] ml-1">({formatDateBR(info.data)})</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Advanced Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-3 font-sans">
        <div className="flex items-center space-x-2 text-[#2563eb] font-bold text-[10px] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-[#2563eb]" />
          <span>Filtros Avançados</span>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#64748b]" />
            <input
              type="text"
              placeholder="Buscar operador, frota, UP..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white text-[#0f172a] focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white text-[#0f172a] focus:outline-hidden font-medium"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">🟡 Pendente</option>
            <option value="APROVADO">🔵 Aprovado</option>
            <option value="DEVOLVIDO">🔴 Devolvido</option>
            <option value="FATURADO">🟢 Faturado</option>
          </select>

          {/* Date From */}
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] text-[#0f172a] focus:outline-hidden font-medium"
            title="Data inicial" />

          {/* Date To */}
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] text-[#0f172a] focus:outline-hidden font-medium"
            title="Data final" />

          {/* Frota Filter */}
          <select
            value={filterFrota}
            onChange={(e) => setFilterFrota(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white text-[#0f172a] focus:outline-hidden font-medium"
          >
            <option value="ALL">Todo Equipamento</option>
            {equipments.map(eq => (
              <option key={eq.id} value={eq.frota}>{eq.frota} - {eq.tipo.substring(0, 15)}...</option>
            ))}
          </select>

          {/* UP Filter */}
          <select
            value={filterUP}
            onChange={(e) => setFilterUP(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#f8fafc]/50 border border-[#e2e8f0] rounded-lg text-xs focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white text-[#0f172a] focus:outline-hidden font-medium"
          >
            <option value="ALL">Todas as UPs</option>
            {Array.from(new Set(launches.map(l => l.up))).sort().map(up => (
              <option key={up} value={up}>{up}</option>
            ))}
          </select>

          {/* Export / Import buttons */}
          <div className="flex gap-2 w-full">
            <button
              onClick={handleExportExcel}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] text-[#2563eb] rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Exportar apontamentos para Excel/CSV"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Exportar</span>
            </button>
            {onImportLaunchList && currentUser.perfil === "FATURAMENTO" && (
              <button
                onClick={() => setShowImportModal(true)}
                className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#eff6ff] hover:bg-[#d2ebe0] border border-[#d2ebe0] text-[#2563eb] rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Importar apontamentos via Excel/CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#2563eb] shrink-0" />
                <span>Importar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal Overlay */}
      {showImportModal && (
        <div className="fixed inset-0 bg-[#1a2e24]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#e2e8f0] p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2 text-[#2563eb] font-bold">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Importar Apontamentos (Excel/CSV)</span>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-[#64748b] hover:text-[#0f172a] font-semibold text-[10px] cursor-pointer">FECHAR</button>
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed font-sans">
              Carregue sua planilha de apontamentos de campo no formato CSV. O arquivo deve conter os seguintes cabeçalhos básicos: <strong className="text-slate-700 font-bold">data</strong>, <strong className="text-slate-700 font-bold">frota</strong>, <strong className="text-slate-700 font-bold">up</strong>, <strong className="text-slate-700 font-bold">horimetro_final</strong>.
            </p>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all ${
                dragActive
                  ? "border-[#2d6a4f] bg-[#eff6ff]/30 scale-95"
                  : "border-[#e2e8f0] hover:border-[#2d6a4f]/50 bg-[#f8fafc]/25"
              }`}
              onClick={() => document.getElementById("csv-file-input")?.click()}
            >
              <Upload className="w-8 h-8 text-[#2563eb]" />
              <div className="text-center font-sans">
                <span className="text-xs font-bold text-[#0f172a] block">Arraste e solte o arquivo aqui</span>
                <span className="text-[11px] text-[#64748b] block mt-0.5 font-medium">ou clique para selecionar do computador</span>
              </div>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      if (evt.target?.result) {
                        handleCSVImport(evt.target.result as string);
                      }
                    };
                    reader.readAsText(file, "ISO-8859-1");
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="flex justify-between items-center text-[10.5px] font-bold text-[#2563eb] pt-1 font-sans">
              <button
                onClick={() => {
                  const demoCSV = `data;frota;up;horimetro_inicial;horimetro_final;atividade;operador_codigo;operador_nome;observacao\n2026-06-22;FRT-101;UP-001;2010.5;2018.0;Corte Mecanizado;REG-001;João Silva;Frente de corte normal\n2026-06-22;FRT-102;UP-002;3015.0;3024.5;Baldeio de Madeira;REG-002;Carlos Oliveira;Operação noturna`;
                  const blob = new Blob([demoCSV], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "modelo_apontamentos.csv";
                  link.click();
                }}
                className="hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo de Planilha</span>
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-[#64748b] bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal overlay */}
      {rejectingId && (
        <div className="fixed inset-0 bg-[#1a2e24]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#e2e8f0] p-5 space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>Devolver Apontamento Técnico</span>
            </div>
            <p className="text-xs text-[#64748b] font-medium leading-relaxed">
              Descreva os motivos ou inconsistências operacionais identificados neste boletim técnico. O operador visualizará estas informações para efetuar a devida correção.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Horímetro final inconsistente por 4 horas..."
              className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-[#0f172a] focus:outline-hidden focus:ring-1 focus:ring-red-500 font-sans min-h-[100px]"
            />
            <div className="flex justify-end space-x-2 text-xs font-bold">
              <button
                onClick={() => setRejectingId(null)}
                className="px-3 py-2 text-[#64748b] bg-[#f8fafc] hover:bg-[#e2ece6] rounded-lg border border-[#e2e8f0] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-3 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#1a2e24]/40 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-4 sm:p-6 space-y-4 flex flex-col max-h-[92vh] font-sans">
            <div className="flex justify-between items-center pb-3 border-b border-[#e2e8f0] shrink-0">
              <h2 className="text-base font-bold text-[#0f172a] flex items-center space-x-2">
                <Plus className="w-4.5 h-4.5 text-[#2563eb]" />
                <span>Novo Boletim Operacional Florestal</span>
              </h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-[#f8fafc] rounded-full text-[#64748b]/80 transition-colors cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-bold shrink-0">
                {validationError}
              </div>
            )}

            <form onSubmit={handleSubmitLaunch} className="space-y-4 text-xs font-sans overflow-y-auto flex-1 pr-1.5 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Data */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Data de Realização</label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#0f172a] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                  />
                </div>

                {/* Atividade */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Atividade Operacional</label>
                  <select
                    value={formData.atividade}
                    onChange={(e) => setFormData(prev => ({ ...prev, atividade: e.target.value }))}
                    className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-bold text-[#0f172a] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                  >
                    <option value="">-- Selecione a Atividade --</option>
                    {atividades.filter(a => a.ativo).map(a => (
                      <option key={a.id} value={a.nome}>{a.nome}{a.descricao ? ` (${a.descricao})` : ""}</option>
                    ))}
                  </select>
                </div>

                {/* Frota - Lista suspensa */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Código da Frota (Equipamento)</label>
                  <select
                    required
                    value={formData.frota}
                    onChange={(e) => handleFrotaChange(e.target.value)}
                    className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#2563eb] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                  >
                    <option value="">-- Selecione uma Frota --</option>
                    {equipments.filter(eq => eq.ativo).sort((a, b) => a.frota.localeCompare(b.frota)).map(eq => (
                      <option key={eq.id} value={eq.frota}>{eq.frota} — {eq.tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Autocomplete Equip details (readonly) */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Equipamento Resolvido</label>
                  <input
                    type="text"
                    disabled
                    value={calcEquip || "Nenhum selecionado"}
                    className="w-full p-2 bg-[#f8fafc]/40 border border-[#e2e8f0] text-[#64748b] font-semibold rounded-lg cursor-not-allowed"
                  />
                </div>

                {/* Horimetro Inicial */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Horímetro Inicial</label>
                  {(() => {
                    const hasHistory = launches.some(l => l.frota === formData.frota);
                    return (
                      <>
                        <input
                          type="number"
                          step="0.1"
                          required
                          disabled={hasHistory}
                          value={formData.horimetro_inicial}
                          onChange={!hasHistory ? (e) => setFormData(prev => ({ ...prev, horimetro_inicial: e.target.value })) : undefined}
                          placeholder="Ex: 2000.0"
                          className={`w-full p-2 border border-[#e2e8f0] rounded-lg font-semibold ${
                            hasHistory 
                              ? "bg-[#f8fafc]/50 text-[#64748b] cursor-not-allowed select-none" 
                              : "bg-[#f8fafc] text-[#0f172a] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                          }`}
                        />
                        <span className="text-[10px] text-[#64748b] font-semibold mt-1 block leading-tight">
                          {hasHistory ? "Bloqueado — continuação do último horímetro lançado" : "Primeiro lançamento desta frota — informe o horímetro inicial"}
                        </span>
                      </>
                    );
                  })()}
                </div>

                {/* Horimetro Final */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Horímetro Final</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.horimetro_final}
                    onChange={(e) => setFormData(prev => ({ ...prev, horimetro_final: e.target.value }))}
                    placeholder="Ex: 2008.5"
                    className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#0f172a] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                  />
                </div>

                {/* UP Select - Autocomplete */}
                <div className="relative">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Unidade de Produção (UP)</label>
                  <input
                    type="text"
                    required
                    value={upSearch}
                    onChange={(e) => { setUpSearch(e.target.value); setShowUpSuggestions(true); }}
                    onFocus={() => setShowUpSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowUpSuggestions(false), 200)}
                    placeholder="Digite a UP ou fazenda... Ex: T1A001"
                    className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#2563eb] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                  />
                  {showUpSuggestions && upSearch.length >= 2 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {upSearching && <p className="px-3 py-2 text-xs text-[#94a3b8]">Buscando...</p>}
                      {!upSearching && upResults.map(f => (
                        <button key={f.id} type="button"
                          onClick={() => {
                            setUpSearch(f.up);
                            setShowUpSuggestions(false);
                            setCalcFazenda(f.fazenda);
                            setCalcNucleo(f.nucleo);
                            setCalcArea(f.area);
                            setFormData(prev => ({ ...prev, up: f.up }));
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#eff6ff] border-b border-[#f1f5f9] last:border-0 transition-colors">
                          <span className="font-semibold text-[#2563eb]">{f.up}</span>
                          <span className="text-[#64748b] ml-2">{f.fazenda}</span>
                          <span className="text-[#94a3b8] ml-1">• {f.nucleo} • {f.area} ha</span>
                        </button>
                      ))}
                      {!upSearching && upResults.length === 0 && upSearch.length >= 2 && (
                        <p className="px-3 py-2 text-xs text-[#94a3b8]">Nenhuma UP encontrada</p>
                      )}
                    </div>
                  )}
                </div>

                {/* UP Calculations Area / Nucleo (Readonly) */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Fazenda / Núcleo / Área</label>
                  <input
                    type="text"
                    disabled
                    value={calcFazenda ? `${calcFazenda} | ${calcNucleo} | ${calcArea} ha` : "Nenhum selecionado"}
                    className="w-full p-2 bg-[#f8fafc]/40 border border-[#e2e8f0] text-[#64748b] font-semibold rounded-lg cursor-not-allowed"
                  />
                </div>

                {/* Operador - sempre o usuário logado */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Código do Operador</label>
                  {currentUser.perfil === "FATURAMENTO" ? (
                    <select
                      value={formData.operador_codigo}
                      onChange={(e) => {
                        const selected = colaboradores.find(c => c.registro === e.target.value);
                        setFormData(prev => ({ ...prev, operador_codigo: e.target.value, operador_nome: selected?.nome || "" }));
                      }}
                      className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-semibold rounded-lg focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
                    >
                      <option value="">-- Selecione o Operador --</option>
                      {colaboradores.sort((a, b) => a.nome.localeCompare(b.nome)).map(c => (
                        <option key={c.id} value={c.registro}>{c.registro} — {c.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" required disabled value={formData.operador_codigo}
                      className="w-full p-2 bg-[#f8fafc]/50 border border-[#e2e8f0] text-[#64748b] font-semibold rounded-lg cursor-not-allowed select-none" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Nome do Operador</label>
                  <input type="text" required disabled value={formData.operador_nome}
                    className="w-full p-2 bg-[#f8fafc]/50 border border-[#e2e8f0] text-[#64748b] font-semibold rounded-lg cursor-not-allowed select-none" />
                  <span className="text-[10px] text-[#64748b] mt-1 block">
                    {currentUser.perfil === "FATURAMENTO" 
                      ? "Lançamento realizado pelo FATURAMENTO em nome do operador selecionado." 
                      : "Operador vinculado ao login. Não é possível alterar."}
                  </span>
                </div>

                {/* Math values on the fly */}
                <div className="p-3 bg-[#eff6ff] rounded-lg border border-[#d2ebe0] grid grid-cols-2 text-center items-center col-span-1 sm:col-span-2">
                  <div>
                    <span className="block text-[10px] font-semibold text-[#2563eb] uppercase tracking-wider">Horas Trabalhadas</span>
                    <strong className="text-sm font-semibold text-[#0f172a]">{calcHorasTrabalhadas}h</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#2563eb] uppercase tracking-wider">Rendimento</span>
                    <strong className="text-sm font-semibold text-[#0f172a]">{calcRendimento} h/ha</strong>
                  </div>
                </div>

              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Observações Relativas ao Turno</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Ex: Condições de chuva no final da tarde, máquina operou com limite de tração..."
                  className="w-full p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg font-sans text-xs min-h-[70px] text-[#0f172a] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                />
              </div>

              {/* Foto do Horímetro ou Evidência */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">Foto do Horímetro ou Evidência de Campo (Opcional)</label>
                
                <div
                  onDragEnter={handleFormFileDrag}
                  onDragOver={handleFormFileDrag}
                  onDragLeave={handleFormFileDrag}
                  onDrop={handleFormFileDrop}
                  onClick={() => document.getElementById("form-file-input")?.click()}
                  className={`border border-dashed rounded-lg p-4 flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                    formFileDragActive
                      ? "border-[#2d6a4f] bg-[#eff6ff]/30 scale-[0.99]"
                      : "border-[#e2e8f0] hover:border-[#2d6a4f]/50 bg-[#f8fafc]/25"
                  }`}
                >
                  <Upload className="w-5 h-5 text-[#2563eb]" />
                  <div className="text-center font-sans">
                    <span className="text-[11px] font-bold text-[#0f172a] block">
                      {formFileName ? `Arquivo: ${formFileName}` : "Arraste e solte uma imagem ou clique para selecionar"}
                    </span>
                    <span className="text-[9px] text-[#64748b] block mt-0.5 font-medium">Permite comprovar com foto do painel/horímetro</span>
                  </div>
                  <input
                    id="form-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFormFileChange}
                    className="hidden"
                  />
                </div>
                {formFileBase64 && (
                  <div className="flex items-center space-x-2 bg-[#eff6ff] p-1.5 rounded-lg border border-[#d2ebe0]">
                    <img src={formFileBase64} alt="Evidência" className="w-10 h-10 object-cover rounded-md border border-[#d2ebe0]" />
                    <div className="text-[10px] font-semibold text-[#0f172a] truncate flex-1 font-mono">
                      <span>{formFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormFileBase64(null);
                        setFormFileName(null);
                      }}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase font-sans cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#e2e8f0] font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-[#64748b] bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-[#2563eb] hover:bg-[#0f172a] rounded-lg text-xs cursor-pointer"
                >
                  Registrar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table vs Kanban Views (Requirement 4) */}
      {viewMode === "table" ? (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden font-sans">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3">Data</th>
                  <th className="p-3">Frota/Equipamento</th>
                  <th className="p-3">UP / Fazenda</th>
                  <th className="p-3">Horímetros (I/F)</th>
                  <th className="p-3 text-center">Horas Imp.</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3 text-center">Rendimento</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55 font-sans">
                {filteredLaunches.length > 0 ? (
                  filteredLaunches.map((launch) => (
                    <tr key={launch.id} className="hover:bg-[#f8fafc]/30 transition-colors">
                      
                      {/* Data */}
                      <td className="p-3 font-semibold whitespace-nowrap text-[#64748b]">
                        <div className="flex items-center space-x-1.5 font-sans">
                          <Calendar className="w-3.5 h-3.5 text-[#64748b]/75" />
                          <span>{formatDateBR(launch.data)}</span>
                        </div>
                      </td>

                      {/* Equip */}
                      <td className="p-3">
                        <div>
                          <span className="font-mono bg-[#f8fafc] text-[#2563eb] border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1.5">
                            {launch.frota}
                          </span>
                          <span className="text-[#0f172a] font-bold">{launch.equipamento}</span>
                        </div>
                      </td>

                      {/* UP / Fazenda */}
                      <td className="p-3 whitespace-nowrap">
                        <div>
                          <span className="font-semibold text-[#0f172a]">{launch.up}</span>
                          <span className="block text-[10px] text-[#64748b] font-semibold">{launch.fazenda} ({launch.nucleo})</span>
                        </div>
                      </td>

                      {/* Horímetro */}
                      <td className="p-3 whitespace-nowrap font-mono text-[#64748b] font-medium">
                        <span>{launch.horimetro_inicial} → {launch.horimetro_final}</span>
                      </td>

                      {/* Horas */}
                      <td className="p-3 text-center">
                        <div>
                          <span className="font-semibold text-[#0f172a]">{launch.horas_trabalhadas}h</span>
                          {launch.horas_sap !== launch.horas_trabalhadas && (
                            <span className="block text-[10px] text-amber-700 font-semibold" title="Horas SAP editadas">
                              SAP: {launch.horas_sap}h
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Operador */}
                      <td className="p-3 whitespace-nowrap">
                        <div>
                          <span className="text-[#0f172a] font-bold">{launch.operador_nome}</span>
                          <span className="block text-[10px] text-[#64748b] font-mono font-medium">
                            {launch.operador_codigo}
                            {launch.criado_por && !launch.criado_por.startsWith(launch.operador_codigo) && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded text-[8px] font-bold">VIA FATURAMENTO</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Rendimento */}
                      <td className="p-3 text-center font-semibold text-[#2563eb]">
                        {launch.rendimento} <span className="text-[10px] text-[#64748b] font-semibold">h/ha</span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center whitespace-nowrap font-sans">
                        {launch.status === "PENDENTE" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-250">
                            PENDENTE
                          </span>
                        )}
                        {launch.status === "APROVADO" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            APROVADO
                          </span>
                        )}
                        {launch.status === "DEVOLVIDO" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold bg-rose-50 text-rose-800 border border-rose-200" title={launch.observacao}>
                            DEVOLVIDO ⚠️
                          </span>
                        )}
                        {launch.status === "FATURADO" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0]">
                            FATURADO
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Expand View */}
                          <button
                            onClick={() => setSelectedLaunch(launch)}
                            className="p-1 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] rounded cursor-pointer transition-colors"
                            title="Ver detalhes completos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Faturamento General Edit Button */}
                          {currentUser.perfil === "FATURAMENTO" && (
                            <button
                              onClick={() => handleStartEditGeneral(launch)}
                              className="p-1 text-[#2563eb] hover:bg-[#eff6ff] rounded cursor-pointer transition-colors"
                              title="Editar qualquer informação deste apontamento"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Technical Flows Permissions checks: TÉCNICO can approve or reject if status is PENDENTE (GERÊNCIA is view-only) */}
                          {launch.status === "PENDENTE" && currentUser.perfil === "TÉCNICO" && (
                            <>
                              <button
                                onClick={() => handleApprove(launch.id)}
                                className="p-1 px-2 bg-[#eff6ff] hover:bg-[#d2ebe0] text-[#2563eb] rounded border border-[#d2ebe0] font-bold font-sans flex items-center space-x-0.5 cursor-pointer transition-all"
                                title="Aprovar apontamento"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Aprovar</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(launch.id)}
                                className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200/60 font-bold font-sans flex items-center space-x-0.5 cursor-pointer transition-all"
                                title="Devolver para ajustes"
                              >
                                <CornerUpLeft className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Devolver</span>
                              </button>
                            </>
                          )}

                          {/* If status is DEVOLVIDO, show warning message on hover or click info, allow edit if user is creator/operator */}
                          {launch.status === "DEVOLVIDO" && (
                            <div className="text-[10px] text-red-600 font-bold px-1.5 py-0.5 bg-red-50 rounded max-w-[120px] truncate border border-red-100" title={launch.observacao}>
                              Motivo: {launch.observacao}
                            </div>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#64748b]/70 font-semibold font-sans">
                      Nenhum apontamento operacional florestal encontrado para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View (Optimized for Operators on mobile devices) */}
        <div className="block md:hidden space-y-4">
          {filteredLaunches.length > 0 ? (
            filteredLaunches.map((launch) => (
              <div key={launch.id} className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-4 space-y-3 font-sans">
                {/* Card Header: ID, Date, and Status */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0f172a] text-sm">Boletim #{launch.id}</span>
                      <span className="font-mono bg-[#f8fafc] text-[#2563eb] border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {launch.frota}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#64748b] font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDateBR(launch.data)}</span>
                    </div>
                  </div>
                  <div>
                    {launch.status === "PENDENTE" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        PENDENTE
                      </span>
                    )}
                    {launch.status === "APROVADO" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        APROVADO
                      </span>
                    )}
                    {launch.status === "DEVOLVIDO" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        DEVOLVIDO
                      </span>
                    )}
                    {launch.status === "FATURADO" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0]">
                        FATURADO
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#f8fafc]/40 p-2.5 rounded-xl border border-[#e2e8f0]/40">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#64748b] block">UP / Fazenda</span>
                    <strong className="text-[#0f172a]">{launch.up} - {launch.fazenda}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#64748b] block">Horímetros (I/F)</span>
                    <strong className="text-[#0f172a] font-mono">{launch.horimetro_inicial} → {launch.horimetro_final}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#64748b] block">Horas Realizadas</span>
                    <strong className="text-[#0f172a]">{launch.horas_trabalhadas}h</strong>
                    {launch.horas_sap !== launch.horas_trabalhadas && (
                      <span className="block text-[9px] text-amber-700 font-bold">
                        (SAP: {launch.horas_sap}h)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#64748b] block">Rendimento</span>
                    <strong className="text-[#2563eb]">{launch.rendimento} h/ha</strong>
                  </div>
                </div>

                {/* Operador info */}
                <div className="flex justify-between items-center text-[11px] text-[#64748b] px-1 border-t border-slate-100 pt-2">
                  <span>Operador: <strong className="text-[#0f172a]">{launch.operador_nome}</strong> ({launch.operador_codigo})</span>
                </div>

                {/* Devolvido feedback warning */}
                {launch.status === "DEVOLVIDO" && launch.observacao && (
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 font-medium">
                    <strong className="block text-[10px] uppercase font-semibold mb-0.5">Motivo da Devolução:</strong>
                    <p className="italic">"{launch.observacao}"</p>
                  </div>
                )}

                {/* Mobile Actions block */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 shrink-0">
                  {/* View Details (Always visible, touch-friendly) */}
                  <button
                    onClick={() => setSelectedLaunch(launch)}
                    className="p-2 text-[#2563eb] hover:bg-[#eff6ff] border border-[#e2e8f0] rounded-xl flex items-center justify-center gap-1 cursor-pointer text-xs font-bold transition-all h-10 px-3"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ficha</span>
                  </button>

                  {/* Faturamento General Edit Button */}
                  {currentUser.perfil === "FATURAMENTO" && (
                    <button
                      onClick={() => handleStartEditGeneral(launch)}
                      className="p-2 text-[#2563eb] hover:bg-[#eff6ff] border border-[#d2ebe0] rounded-xl flex items-center justify-center gap-1 cursor-pointer text-xs font-bold transition-all h-10 px-3"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  )}

                  {/* Technical approvals */}
                  {launch.status === "PENDENTE" && currentUser.perfil === "TÉCNICO" && (
                    <div className="flex gap-1.5 flex-1">
                      <button
                        onClick={() => handleApprove(launch.id)}
                        className="flex-1 p-2 bg-[#eff6ff] hover:bg-[#d2ebe0] text-[#2563eb] rounded-xl border border-[#d2ebe0] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all h-10"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprovar</span>
                      </button>
                      <button
                        onClick={() => handleOpenReject(launch.id)}
                        className="flex-1 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200/60 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all h-10"
                      >
                        <CornerUpLeft className="w-4 h-4" />
                        <span>Devolver</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-[#e2e8f0] text-[#64748b]/70 font-semibold text-xs">
              Nenhum apontamento operacional florestal encontrado para esta consulta.
            </div>
          )}
        </div>
      </>
      ) : (
        /* Kanban Board Grid View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start select-none font-sans">
          {[
            { id: "PENDENTE", label: "Pendente (Técnico)", color: "border-t-4 border-amber-500 bg-amber-50/10 text-amber-800" },
            { id: "APROVADO", label: "Aprovado Técnico", color: "border-t-4 border-blue-500 bg-blue-50/10 text-blue-800" },
            { id: "DEVOLVIDO", label: "Devolvido (Glosado)", color: "border-t-4 border-rose-500 bg-rose-50/10 text-rose-800" },
            { id: "FATURADO", label: "Faturado SAP", color: "border-t-4 border-blue-500 bg-blue-50/10 text-blue-800" }
          ].map((col) => {
            const colLaunches = filteredLaunches.filter(l => l.status === col.id);
            const totalHours = colLaunches.reduce((sum, current) => sum + current.horas_trabalhadas, 0);
            
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropColumn(e, col.id as any)}
                className={`flex flex-col p-4 rounded-xl border border-[#e2e8f0] bg-white shadow-xs min-h-[500px] transition-all ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3 shrink-0">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{col.label}</h3>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">Total: {totalHours}h</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-black">
                    {colLaunches.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {colLaunches.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-300 font-semibold text-[10px] uppercase">
                      <span>Arraste itens aqui</span>
                    </div>
                  ) : (
                    colLaunches.map((launch) => (
                      <div
                        key={launch.id}
                        draggable={true}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", launch.id)}
                        className="bg-white p-3 rounded-xl border border-slate-200/80 hover:border-[#2d6a4f]/50 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative select-none"
                      >
                        {/* Little indicator on the side */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${
                          launch.status === "PENDENTE" ? "bg-amber-400" :
                          launch.status === "APROVADO" ? "bg-blue-400" :
                          launch.status === "DEVOLVIDO" ? "bg-rose-450" : "bg-blue-500"
                        }`} />

                        {/* Card Content */}
                        <div className="space-y-2 pl-1 text-[11px] font-sans">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-[9.5px] font-black text-[#2563eb]">#{launch.id}</span>
                            <span className="text-[9px] text-slate-400 font-bold font-mono">{formatDateBR(launch.data)}</span>
                          </div>

                          <div>
                            <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">{launch.operador_nome}</span>
                            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block font-mono">Reg: {launch.operador_codigo}</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[9px] font-bold bg-[#f8fafc] text-[#2563eb] px-1.5 py-0.5 rounded border border-slate-100">
                              {launch.frota}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]" title={launch.equipamento}>{launch.equipamento}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Fazenda</span>
                              <span className="font-semibold text-slate-700 block mt-0.5 truncate max-w-[80px]">{launch.fazenda}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Horas</span>
                              <span className="font-mono font-black text-[#0f172a] block mt-0.5">{launch.horas_trabalhadas}h</span>
                            </div>
                          </div>
                          
                          {/* Quick expand */}
                          <div className="pt-1 flex justify-end gap-1.5 border-t border-slate-100/50">
                            <button
                              type="button"
                              onClick={() => setSelectedLaunch(launch)}
                              className="p-1 hover:bg-[#f8fafc] text-slate-500 hover:text-slate-800 rounded transition-colors inline-flex items-center gap-1 text-[9px] font-semibold uppercase cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ficha</span>
                            </button>

                            {/* General edit button */}
                            {currentUser.perfil === "FATURAMENTO" && (
                              <button
                                type="button"
                                onClick={() => handleStartEditGeneral(launch)}
                                className="p-1 hover:bg-[#eff6ff] text-[#2563eb] rounded transition-colors inline-flex items-center gap-1 text-[9px] font-semibold uppercase cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Launch detailed modal */}
      {selectedLaunch && (
        <div className="fixed inset-0 bg-[#1a2e24]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-[#e2e8f0] p-5 space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#2563eb]" />
                <span>Boletim Técnico #{selectedLaunch.id}</span>
              </h3>
              <button onClick={() => setSelectedLaunch(null)} className="text-[#64748b] hover:text-[#0f172a] font-semibold text-[10px] cursor-pointer">FECHAR</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Data Operacional</strong>
                <span className="text-[#0f172a] font-semibold">{formatDateBR(selectedLaunch.data)}</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Status do Processo</strong>
                <span className="text-[#0f172a] font-semibold uppercase">{selectedLaunch.status}</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Equipamento</strong>
                <span className="text-[#0f172a] font-semibold">{selectedLaunch.equipamento} ({selectedLaunch.frota})</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Unidade de Produção (UP)</strong>
                <span className="text-[#0f172a] font-semibold">{selectedLaunch.up} - {selectedLaunch.fazenda}</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Horímetros</strong>
                <span className="text-[#0f172a] font-mono font-bold">Inicial: {selectedLaunch.horimetro_inicial} | Final: {selectedLaunch.horimetro_final}</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Horas Trabalhadas (Sinal SAP)</strong>
                <span className="text-[#0f172a] font-bold">{selectedLaunch.horas_trabalhadas}h (SAP: {selectedLaunch.horas_sap}h)</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Operador do Turno</strong>
                <span className="text-[#0f172a] font-semibold">{selectedLaunch.operador_nome} ({selectedLaunch.operador_codigo})</span>
              </div>
              <div className="bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]/40">
                <strong className="block text-[#64748b] text-[9px] uppercase font-bold tracking-wider">Rendimento Calculado</strong>
                <span className="text-[#2563eb] font-semibold">{selectedLaunch.rendimento ? `${selectedLaunch.rendimento} h/ha` : "Não calculado"}</span>
              </div>
            </div>

            <div className="bg-[#eff6ff]/60 border border-[#d2ebe0] p-3 rounded text-xs space-y-1">
              <strong className="block text-[#2563eb] text-[9px] uppercase font-semibold tracking-wider">Histórico do Boletim</strong>
              <div className="text-[#64748b] text-[10.5px] space-y-1 font-semibold leading-relaxed">
                <p>Criado por: <span className="text-[#0f172a] font-semibold">{selectedLaunch.operador_nome} ({selectedLaunch.operador_codigo})</span> em {new Date(selectedLaunch.criado_em).toLocaleString("pt-BR")}</p>
                {selectedLaunch.aprovado_por && (
                  <p>Aprovado por: <span className="text-[#0f172a] font-semibold">{colaboradores.find(c => c.registro === selectedLaunch.aprovado_por)?.nome || selectedLaunch.aprovado_por}</span> em {new Date(selectedLaunch.aprovado_em!).toLocaleString("pt-BR")}</p>
                )}
                {selectedLaunch.faturado_por && (
                  <p>Faturado por: <span className="text-[#0f172a] font-semibold">{colaboradores.find(c => c.registro === selectedLaunch.faturado_por)?.nome || selectedLaunch.faturado_por}</span> em {new Date(selectedLaunch.faturado_em!).toLocaleString("pt-BR")}</p>
                )}
              </div>
            </div>

            {selectedLaunch.observacao && (
              <div className="p-3 bg-amber-50 rounded border border-amber-200/50 text-xs">
                <strong className="block text-amber-800 text-[9px] uppercase font-semibold tracking-wider">Observações / Motivo de Devolução</strong>
                <p className="text-amber-800 font-semibold mt-1 italic">"{selectedLaunch.observacao}"</p>
              </div>
            )}

            {selectedLaunch.anexo && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1.5 font-sans">
                <strong className="block text-slate-700 text-[9px] uppercase font-semibold tracking-wider">Evidência de Campo / Foto do Painel</strong>
                <a href={selectedLaunch.anexo} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200">
                  <img src={selectedLaunch.anexo} alt="Evidência Anexa" className="w-full max-h-40 object-cover group-hover:scale-[1.02] transition-transform duration-200" />
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10.5px] font-semibold gap-1">
                    <Eye className="w-4 h-4" />
                    <span>Visualizar imagem em nova aba</span>
                  </div>
                </a>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLaunch(null)}
                className="px-4 py-2 bg-[#2563eb] text-white hover:bg-[#0f172a] rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Lançamento (Para Faturamento e Gerência) */}
      {editingLaunch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="p-5 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Pencil className="w-5 h-5 text-[#4ade80]" />
                <div>
                  <h3 className="text-sm font-bold">Ajustar Lançamento Operacional</h3>
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
                onClick={handleSaveEditGeneral}
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
}
