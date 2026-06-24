import { useState } from "react";
import { 
  ShieldAlert, Trash2, Calendar, ClipboardList, Search, RefreshCw, Filter, 
  UserX, UserCheck, KeyRound, Download, Save, Undo2
} from "lucide-react";
import { Auditoria, User } from "../types";
import { formatDateTimeBR, exportToCSV } from "../utils";

interface AuditoriaTabProps {
  logs: Auditoria[];
  currentUser: User;
  onClearLogs: () => Promise<void>;
}

export default function AuditoriaTab({ logs, currentUser, onClearLogs }: AuditoriaTabProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "ALL" ? true : log.acao === actionFilter;

    return matchesSearch && matchesAction;
  });

  const handleClear = async () => {
    if (window.confirm("ATENÇÃO: Deseja realmente esvaziar todo o histórico rastro de auditoria? Esta ação é irreversível e ficará registrada.")) {
      await onClearLogs();
    }
  };

  // Export audit logs as CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Data/Hora", "Usuário Responsável", "Ação Operacional", "Chave Registro", "Detalhamento"];
    const rows = filteredLogs.map(l => [
      l.id, l.data_hora, l.usuario, l.acao, l.registro, l.descricao
    ]);

    exportToCSV("Rastro_Auditoria_SIGOL", headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#e2e8f0] gap-4">
        <div>
          <h1 className="text-xl font-bold  text-[#0f172a] flex items-center space-x-2 font-sans">
            <ShieldAlert className="w-5 h-5 text-[#2563eb]" />
            <span>Rastro de Auditoria e Segurança (GF)</span>
          </h1>
          <p className="text-xs text-[#64748b]">
            Monitoramento de conformidade técnica. Histórico inalterável de lançamentos, faturamento, autenticação e alterações corporativas.
          </p>
        </div>

        {/* Action button */}
        <div className="flex flex-wrap items-center gap-2 font-sans">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#f8fafc] hover:bg-[#e2ece6] border border-[#e2e8f0] text-[#2563eb] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Logs</span>
          </button>
          
          {/* Limpar Registro disabled for GERÊNCIA as they are view-only */}
          {false && (
            <button
              onClick={handleClear}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs border border-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Registro</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter log bar */}
      <div className="p-4 bg-white rounded-xl border border-[#e2e8f0] shadow-xs space-y-3 font-sans">
        <div className="flex items-center space-x-2 text-[#0f172a] font-semibold text-xs uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#2563eb]" />
          <span>Filtros do Rastro</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search text */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Filtrar por usuário, registro, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb]"
            />
          </div>

          {/* Action categorisation code */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs focus:border-[#2563eb] focus:outline-hidden focus:ring-1 focus:ring-[#2563eb] text-[#0f172a] font-semibold"
          >
            <option value="ALL">Todas as Ações</option>
            <option value="CRIAÇÃO"> CRIAÇÃO</option>
            <option value="EDIÇÃO"> EDIÇÃO</option>
            <option value="APROVAÇÃO"> APROVAÇÃO</option>
            <option value="DEVOLUÇÃO"> DEVOLUÇÃO</option>
            <option value="FATURAMENTO"> FATURAMENTO</option>
            <option value="IMPORTAÇÃO"> IMPORTAÇÃO</option>
            <option value="LOGIN"> LOGIN</option>
            <option value="LIMPEZA"> LIMPEZA</option>
          </select>

          {/* Info Badge */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-1.5 px-3 flex items-center justify-between text-[11px] text-[#64748b] font-bold">
            <span>Resultados retornados:</span>
            <strong className="text-[#0f172a] text-xs font-semibold font-mono bg-white px-2 py-0.5 rounded border border-[#e2e8f0]">
              {filteredLogs.length} logs
            </strong>
          </div>

        </div>
      </div>

      {/* Grid listing */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#2563eb] font-semibold uppercase tracking-wider font-mono">
                <th className="p-3">Data/Hora Evento</th>
                <th className="p-3">Ação executada</th>
                <th className="p-3">Usuário Autenticado</th>
                <th className="p-3">Referência Registro</th>
                <th className="p-3">Detalhamento Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2ece6]/55 font-mono text-[11px] text-[#64748b]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => {
                  
                  // Style based on actions code
                  let actionBadge = "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]";
                  if (log.acao === "APROVAÇÃO") actionBadge = "bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] font-bold";
                  if (log.acao === "DEVOLUÇÃO") actionBadge = "bg-red-50 text-red-600 border border-red-100 font-bold";
                  if (log.acao === "FATURAMENTO") actionBadge = "bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] font-bold";
                  if (log.acao === "CRIAÇÃO") actionBadge = "bg-[#eff6ff] text-[#2563eb] border border-[#d2ebe0] font-bold";
                  if (log.acao === "IMPORTAÇÃO") actionBadge = "bg-amber-50 text-amber-750 border border-amber-100 font-bold";
                  if (log.acao === "LOGIN") actionBadge = "bg-blue-50 text-blue-700 border border-blue-100 font-bold";

                  return (
                    <tr key={log.id} className="hover:bg-[#f8fafc]/30">
                      {/* Timestamp */}
                      <td className="p-3 whitespace-nowrap text-[#64748b] font-semibold">
                        {formatDateTimeBR(log.data_hora)}
                      </td>
                      
                      {/* Action Code */}
                      <td className="p-2 whitespace-nowrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] ${actionBadge}`}>
                          {log.acao}
                        </span>
                      </td>

                      {/* User */}
                      <td className="p-3 font-bold text-[#0f172a]">
                        {log.usuario}
                      </td>

                      {/* Reference key */}
                      <td className="p-3 font-semibold text-[#0f172a] truncate max-w-[130px]" title={log.registro}>
                        {log.registro}
                      </td>

                      {/* Description words */}
                      <td className="p-3 text-[#64748b] font-sans text-xs font-medium">
                        {log.descricao}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#64748b] font-sans text-xs font-semibold">
                    Nenhum registro de auditoria disponível para essa consulta no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
