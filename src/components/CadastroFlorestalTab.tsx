import React, { useState } from "react";
import { 
  Tractor, Plus, ShieldCheck, ListPlus, Landmark, FileSpreadsheet, 
  MapPin, SlidersHorizontal, UploadCloud, Info, Check, X
} from "lucide-react";
import { CadastroFlorestal, User } from "../types";
import { formatDecimal } from "../utils";

interface CadastroFlorestalTabProps {
  forestry: CadastroFlorestal[];
  currentUser: User;
  onAddForest: (fl: Omit<CadastroFlorestal, "id">) => Promise<void>;
  onImportForestList: (list: Omit<CadastroFlorestal, "id">[]) => Promise<void>;
}

export default function CadastroFlorestalTab({ 
  forestry, 
  currentUser, 
  onAddForest,
  onImportForestList
}: CadastroFlorestalTabProps) {
  
  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    up: "",
    fazenda: "Fazenda Bela Vista",
    area: "",
    nucleo: "Núcleo Sul"
  });

  // KPI Calculations
  const totalAreas = Number(forestry.reduce((sum, curr) => sum + curr.area, 0).toFixed(1));
  const uniqueFarms = new Set(forestry.map(f => f.fazenda)).size;
  const totalUPs = forestry.length;

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.up.trim()) return setValidationError("Favor preencher a Unidade de Produção (UP).");
    
    // Check duplication
    const duplicated = forestry.some(f => f.up.trim().toUpperCase() === formData.up.trim().toUpperCase());
    if (duplicated) return setValidationError(`A Unidade de Produção ${formData.up} já está cadastrada.`);

    const areaNum = Number(formData.area);
    if (isNaN(areaNum) || areaNum <= 0) {
      return setValidationError("Área da UP deve ser maior do que zero.");
    }

    try {
      await onAddForest({
        up: formData.up.toUpperCase(),
        fazenda: formData.fazenda,
        area: areaNum,
        nucleo: formData.nucleo
      });

      setShowAddForm(false);
      setFormData({
        up: "",
        fazenda: "Fazenda Bela Vista",
        area: "",
        nucleo: "Núcleo Sul"
      });
    } catch {
      setValidationError("Erro ao registrar cadastro forestal.");
    }
  };

  // Simulated Excel Import Parsing
  const handleSimulateExcelImport = async () => {
    const mockExcelRows: Omit<CadastroFlorestal, "id">[] = [
      { up: "UP-501", fazenda: "Fazenda Monte Belo", area: 34.2, nucleo: "Núcleo Sul" },
      { up: "UP-502", fazenda: "Fazenda Monte Belo", area: 18.5, nucleo: "Núcleo Sul" },
      { up: "UP-503", fazenda: "Fazenda Refúgio", area: 45.0, nucleo: "Núcleo Oeste" },
      { up: "UP-504", fazenda: "Fazenda Monte Alegre", area: 11.2, nucleo: "Núcleo Norte" }
    ];

    try {
      await onImportForestList(mockExcelRows);
      setImportFeedback("Planilha florestal processada! Foram importadas 4 novas UPs de teste.");
      setTimeout(() => setImportFeedback(null), 4000);
    } catch {
      alert("Erro ao executar importação florestal.");
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a] flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-[#2563eb]" />
            <span>Cadastro Florestal da Companhia</span>
          </h1>
          <p className="text-xs text-[#64748b]">
            Unidades de Produção (UP), áreas físicas (hectares), fazendas incorporadas e zoneamento por núcleo operacional.
          </p>
        </div>

        {/* Action Buttons disabled for GERÊNCIA as they are view-only */}
        {false && (
          <div className="flex flex-wrap items-center gap-2 font-sans">
            <button
              onClick={handleSimulateExcelImport}
              className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#f8fafc] hover:bg-[#e2ece6] text-[#2563eb] font-bold rounded-lg text-xs transition-all border border-[#e2e8f0]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Importar Excel</span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center justify-center space-x-2 px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1e293b] text-white font-bold rounded-lg text-xs transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova UP</span>
            </button>
          </div>
        )}
      </div>

      {importFeedback && (
        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-xs text-blue-800 font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{importFeedback}</span>
        </div>
      )}

      {/* Forest KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-[#2563eb] rounded-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">Total de UPs ativas</span>
            <strong className="text-[#0f172a] text-lg font-bold">{totalUPs} Unidades</strong>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#eff6ff] text-blue-700 rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">Fazendas Cadastradas</span>
            <strong className="text-[#0f172a] text-lg font-bold">{uniqueFarms} Fazendas</strong>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs flex items-center space-x-4">
          <div className="p-2.5 bg-[#fef9c3] text-amber-800 rounded-lg">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">Hectares Totais de Plantio</span>
            <strong className="text-[#0f172a] text-lg font-bold">{formatDecimal(totalAreas, 1)} ha</strong>
          </div>
        </div>
      </div>

      {/* Manual ADD Form (Disabled for GERÊNCIA as they are view-only) */}
      {showAddForm && false && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-4 font-sans">
          <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5">
              <ListPlus className="w-5 h-5 text-[#2563eb]" />
              <span>Cadastrar Nova Unidade de Produção</span>
            </h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[#64748b] hover:text-[#0f172a]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationError && (
            <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-xs text-rose-700 font-bold">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            {/* UP designation */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Código da UP</label>
              <input
                type="text"
                required
                placeholder="Ex: UP-380"
                value={formData.up}
                onChange={(e) => setFormData(prev => ({ ...prev, up: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-bold text-[#0f172a]"
              />
            </div>

            {/* Fazenda Name */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Nome Fazenda</label>
              <select
                value={formData.fazenda}
                onChange={(e) => setFormData(prev => ({ ...prev, fazenda: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden text-[#0f172a]"
              >
                <option value="Fazenda Bela Vista">Fazenda Bela Vista</option>
                <option value="Fazenda Monte Alegre">Fazenda Monte Alegre</option>
                <option value="Fazenda Refúgio">Fazenda Refúgio</option>
                <option value="Fazenda Primavera">Fazenda Primavera</option>
                <option value="Fazenda Esperança">Fazenda Esperança</option>
              </select>
            </div>

            {/* Área ha */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Área da UP (Hectares)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 22.45"
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden font-mono"
              />
            </div>

            {/* Núcleo zone */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#64748b] mb-1">Núcleo Operacional</label>
              <select
                value={formData.nucleo}
                onChange={(e) => setFormData(prev => ({ ...prev, nucleo: e.target.value }))}
                className="w-full p-2 bg-white border border-[#e2e8f0] rounded-lg focus:border-[#2563eb] focus:ring-[#2563eb] focus:ring-1 focus:outline-hidden text-[#0f172a]"
              >
                <option value="Núcleo Sul">Núcleo Sul</option>
                <option value="Núcleo Norte">Núcleo Norte</option>
                <option value="Núcleo Leste">Núcleo Leste</option>
                <option value="Núcleo Oeste">Núcleo Oeste</option>
              </select>
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
                Registrar UP Florestal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TWO SECTIONS: Excel Uploader + Registry list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table list column (spanning 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden text-xs font-sans">
          <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] font-bold text-[#2563eb]">
            Unidades de Produção Cadastradas ({forestry.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider">
                  <th className="p-3">Código UP</th>
                  <th className="p-3">Fazenda Matriz</th>
                  <th className="p-3 text-center">Extensão (Hectares)</th>
                  <th className="p-3">Núcleo de Logística</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2ece6]/55">
                {forestry.map(f => (
                  <tr key={f.id} className="hover:bg-[#f8fafc]/45 transition-colors">
                    <td className="p-3 font-semibold text-[#0f172a]">{f.up}</td>
                    <td className="p-3 font-semibold text-[#64748b]">{f.fazenda}</td>
                    <td className="p-3 text-center font-mono font-bold text-[#2563eb]">{formatDecimal(f.area, 2)} ha</td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 bg-[#f8fafc] border border-[#e2e8f0] rounded font-bold font-mono text-[9px] text-[#2563eb]">
                        {f.nucleo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Excel simulated drag-box column */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 space-y-4 flex flex-col justify-between font-sans">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-1.5 animate-pulse-slow">
              <UploadCloud className="w-5 h-5 text-[#2563eb]" />
              <span>Importação Planilhas XLS</span>
            </h3>
            <p className="text-xs text-[#64748b]">
              Adicione UPs em lote importando arquivos oficiais do inventário florestal SAP ou arquivos gerados pelo SIG corporativo.
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
              <span className="block text-xs font-bold text-[#0f172a]">Arraste a planilha florestal ou clique</span>
              <span className="block text-[9.5px] text-[#64748b] font-semibold">Tipos aceitos: .xlsx, .xls, .csv</span>
            </div>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg flex items-start space-x-2 text-[10px] leading-relaxed text-[#64748b]">
            <Info className="w-4 h-4 text-[#2563eb] mt-0.5 flex-shrink-0" />
            <p className="font-semibold">
              Ao arrastar ou clicar na caixa, o sistema executará um analisador estrutural simulado integrando em lote 4 novas UPs de teste na tabela atual.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
