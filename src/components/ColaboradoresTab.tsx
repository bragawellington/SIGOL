import React, { useState } from "react";
import { 
  Users, Plus, ListPlus, UploadCloud, FileSpreadsheet, Info, 
  ToggleLeft, ToggleRight, Check, X, ShieldAlert
} from "lucide-react";
import { Colaborador, User } from "../types";

interface ColaboradoresTabProps {
  colaboradores: Colaborador[];
  currentUser: User;
  onAddColaborador: (col: Omit<Colaborador, "id">) => Promise<void>;
  onImportColaboradorList: (list: Omit<Colaborador, "id">[]) => Promise<void>;
}

export default function ColaboradoresTab({ 
  colaboradores, 
  currentUser, 
  onAddColaborador,
  onImportColaboradorList
}: ColaboradoresTabProps) {
  
  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    registro: "",
    nome: "",
    funcao: "Operador de Harvester",
    equipe: "Equipe Alfa",
    ativo: true
  });

  // KPI Calculations
  const totalEmployees = colaboradores.length;
  const activeEmployees = colaboradores.filter(c => c.ativo).length;
  const teamCount = new Set(colaboradores.map(c => c.equipe)).size;

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.registro.trim()) return setValidationError("Favor colocar o registro nacional / código identificador.");
    if (!formData.nome.trim()) return setValidationError("Favor colocar o nome do colaborador.");
    
    // Check duplication
    const duplicated = colaboradores.some(c => c.registro.trim().toUpperCase() === formData.registro.trim().toUpperCase());
    if (duplicated) return setValidationError(`O registro de colaborador ${formData.registro} já está cadastrado.`);

    try {
      await onAddColaborador({
        registro: formData.registro.toUpperCase(),
        nome: formData.nome,
        funcao: formData.funcao,
        equipe: formData.equipe,
        ativo: formData.ativo
      });

      setShowAddForm(false);
      setFormData({
        registro: "",
        nome: "",
        funcao: "Operador de Harvester",
        equipe: "Equipe Alfa",
        ativo: true
      });
    } catch {
      setValidationError("Erro ao registrar novo colaborador.");
    }
  };

  // Simulated Excel Import Parsing
  const handleSimulateExcelImport = async () => {
    const mockExcelRows: Omit<Colaborador, "id">[] = [
      { registro: "OP1006", nome: "Marcos Vinícius", funcao: "Operador de Harvester", equipe: "Equipe Gama", ativo: true },
      { registro: "OP1007", nome: "Paula Toledo", funcao: "Operador de Forwarder", equipe: "Equipe Alfa", ativo: true },
      { registro: "OP1008", nome: "Evandro Chaves", funcao: "Operador de Forwarder", equipe: "Equipe Beta", ativo: true },
      { registro: "OP1009", nome: "Juliana Lins", funcao: "Fiscal Florestal", equipe: "Equipe Gama", ativo: true }
    ];

    try {
      await onImportColaboradorList(mockExcelRows);
      setImportFeedback("Planilha de operadores processada! Foram importados 4 novos colaboradores florestais.");
      setTimeout(() => setImportFeedback(null), 4000);
    } catch {
      alert("Erro ao executar importação de colaboradores.");
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleSimulateExcelImport();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#2563eb]" />
            <span>Colaboradores e Operadores de Campo</span>
          </h1>
          <p className="text-xs text-[#64748b]">
            Gerencie o registro nacional de operadores, designações para equipes, atribuições técnicas e situação operacional ativa.
          </p>
        </div>

        {/* Action Buttons disabled for GERÊNCIA as they are view-only */}
        {false && (
          <div className="flex flex-wrap items-center gap-2 font-sans font-semibold">
            <button
              onClick={handleSimulateExcelImport}
              className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#f8fafc] hover:bg-[#e2ece6] text-[#2563eb] font-bold rounded-lg text-xs transition-all border border-[#e2e8f0]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Importar Excel</span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1e293b] text-white font-bold rounded-lg text-xs transition-all shadow-xs animate-flicker"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Colaborador</span>
            </button>
          </div>
        )}
      </div>

      {importFeedback && (
        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-xs text-blue-800 font-semibold flex items-center space-x-2 font-sans">
          <Check className="w-4 h-4" />
          <span>{importFeedback}</span>
        </div>
      )}

      {/* Staff KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#f8fafc] text-[#2563eb] rounded-lg border border-[#e2e8f0]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">Total de Colaboradores</span>
            <strong className="text-[#0f172a] text-lg font-bold">{totalEmployees} Colaboradores</strong>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-[#2563eb] rounded-lg border border-[#d2ebe0]">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block font-sans">Efetivo Ativo em Campo</span>
            <strong className="text-[#0f172a] text-lg font-bold">{activeEmployees} Operadores ativos</strong>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-blue-700 rounded-lg border border-blue-100">
            <Plus className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">Trens de Trabalho / Equipes</span>
            <strong className="text-[#0f172a] text-lg font-bold">{teamCount} Equipes ativas</strong>
          </div>
        </div>
      </div>

      {/* Manual ADD Form (Disabled for GERÊNCIA as they are view-only) */}
      {showAddForm && false && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4 font-sans">
          <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <ListPlus className="w-5 h-5 text-[#2563eb]" />
              <span>Cadastrar Novo Operador Florestal</span>
            </h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[#64748b] hover:text-[#0f172a] font-sans font-bold">
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-xs text-rose-700 font-bold">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs font-medium text-[#0f172a]">
            {/* Registro ID */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Registro MOP</label>
              <input
                type="text"
                required
                placeholder="Ex: OP1008"
                value={formData.registro}
                onChange={(e) => setFormData(prev => ({ ...prev, registro: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-bold uppercase"
              />
            </div>

            {/* Nome Completo */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: Pedro Henrique Chaves"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden"
              />
            </div>

            {/* Função florestal */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Função Técnico-Operacional</label>
              <select
                value={formData.funcao}
                onChange={(e) => setFormData(prev => ({ ...prev, funcao: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden text-[#0f172a]"
              >
                <option value="Operador de Harvester">Operador de Harvester</option>
                <option value="Operador de Forwarder">Operador de Forwarder</option>
                <option value="Operador de Feller Buncher">Operador de Feller Buncher</option>
                <option value="Ajudante Florestal">Ajudante Florestal</option>
                <option value="Líder de Equipe">Líder de Equipe</option>
                <option value="Fiscal Florestal">Fiscal Florestal</option>
              </select>
            </div>

            {/* Equipe / Trecho */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Equipe Operacional</label>
              <select
                value={formData.equipe}
                onChange={(e) => setFormData(prev => ({ ...prev, equipe: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden text-[#0f172a]"
              >
                <option value="Equipe Alfa">Equipe Alfa</option>
                <option value="Equipe Beta">Equipe Beta</option>
                <option value="Equipe Gama">Equipe Gama</option>
                <option value="Equipe Sênior">Equipe Sênior</option>
              </select>
            </div>

            {/* Status active */}
            <div className="flex items-center space-x-2 pt-2 sm:col-span-2">
              <input
                type="checkbox"
                id="col_ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-4 h-4 text-[#2563eb] focus:ring-[#2563eb] rounded border-[#e2e8f0]"
              />
              <label htmlFor="col_ativo" className="text-[#64748b] text-xs font-bold select-none cursor-pointer">Colaborador Operando Ativamente</label>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end space-x-2 pt-3 border-t border-[#e2e8f0]">
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
                Registrar Colaborador
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TWO SECTIONS: Excel Uploader + Registry list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Table list column (spanning 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden text-xs">
          <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] font-bold text-[#2563eb]">
            Ficha de Operadores Florestais ({colaboradores.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3">Registro MOP</th>
                  <th className="p-3">Nome Completo</th>
                  <th className="p-3">Cargo Executivo</th>
                  <th className="p-3">Equipe Alocada</th>
                  <th className="p-3 text-center">Status Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55 font-sans">
                {colaboradores.map(col => (
                  <tr key={col.id} className="hover:bg-[#f8fafc]/45 transition-colors">
                    <td className="p-3 font-mono font-semibold text-[#0f172a]">{col.registro}</td>
                    <td className="p-3 font-semibold text-[#0f172a]">{col.nome}</td>
                    <td className="p-3 text-[#64748b] font-medium">{col.funcao}</td>
                    <td className="p-3 font-bold text-[#64748b]">{col.equipe}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {col.ativo ? (
                        <span className="bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] px-2 py-0.5 rounded-md text-[9px] font-semibold">ATIVO</span>
                      ) : (
                        <span className="bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] px-2 py-0.5 rounded-md text-[9px] font-semibold">INATIVO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Excel simulated drag-box column */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <UploadCloud className="w-5 h-5 text-[#2563eb]" />
              <span>Importação de Pessoal XLS</span>
            </h3>
            <p className="text-xs text-[#64748b]">
              Adicione novos operadores no banco de dados importando arquivos da folha de pagamento corporativa ou sistemas de RH integrados.
            </p>
          </div>

          {/* Simulated Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSimulateExcelImport}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
              isDragging 
                ? "border-[#2d6a4f] bg-[#eff6ff]/40" 
                : "border-[#e2e8f0] hover:border-[#2d6a4f]/50 hover:bg-[#f8fafc]/40"
            }`}
          >
            <div className="p-3 bg-[#eff6ff] text-[#2563eb] rounded-full">
              <UploadCloud className="w-5 h-5 animate-bounce" />
            </div>
            
            <div className="space-y-1">
              <span className="block text-xs font-bold text-[#0f172a]">Arraste a planilha de RH ou clique</span>
              <span className="block text-[9.5px] text-[#64748b] font-semibold">Formatos recomendados: .xlsx, .csv</span>
            </div>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg flex items-start space-x-2 text-[10px] leading-relaxed text-[#64748b]">
            <Info className="w-4 h-4 text-[#2563eb] mt-0.5 flex-shrink-0" />
            <p className="font-semibold">
              Clicando na caixa de drag-and-drop, o sistema executará um carregador e integrará 4 novos operadores na escala técnica com audição ativada.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
