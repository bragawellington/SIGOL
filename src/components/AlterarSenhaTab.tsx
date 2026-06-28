import { useState } from "react";
import { Lock, Eye, EyeOff, Check, AlertTriangle, KeyRound } from "lucide-react";
import { User } from "../types";
import { supabase, isDemo } from "../lib/supabase";

interface AlterarSenhaTabProps {
  currentUser: User;
  onSuccess?: () => void;
}

export default function AlterarSenhaTab({ currentUser, onSuccess }: AlterarSenhaTabProps) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!senhaAtual.trim()) { setError("Informe a senha atual."); return; }
    if (!novaSenha.trim()) { setError("Informe a nova senha."); return; }
    if (novaSenha.length < 6) { setError("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarSenha) { setError("A confirmação não confere com a nova senha."); return; }
    if (novaSenha === senhaAtual) { setError("A nova senha deve ser diferente da atual."); return; }

    setLoading(true);

    try {
      if (isDemo || !supabase) {
        // Demo mode - simulate
        await new Promise(r => setTimeout(r, 800));
        if (senhaAtual !== "sigol123") {
          setError("Senha atual incorreta.");
          setLoading(false);
          return;
        }
        setSuccess(true); onSuccess?.();
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      } else {
        // Supabase - verify current password then update
        const { data: verifyData, error: verifyError } = await supabase
          .rpc('login_usuario', { p_codigo: currentUser.codigo, p_senha: senhaAtual });

        if (verifyError || !verifyData || verifyData.length === 0) {
          setError("Senha atual incorreta.");
          setLoading(false);
          return;
        }

        // Update password
        const { error: updateError } = await supabase
          .rpc('alterar_senha', { p_codigo: currentUser.codigo, p_nova_senha: novaSenha });

        if (updateError) {
          setError("Erro ao alterar senha. Tente novamente.");
          setLoading(false);
          return;
        }

        setSuccess(true); onSuccess?.();
        setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Info card */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Alterar Senha</h3>
            <p className="text-[11px] text-[#64748b]">Usuário: {currentUser.nome} ({currentUser.codigo})</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-fadeIn">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">Senha alterada com sucesso!</p>
          </div>
        )}

        {/* Senha atual */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">Senha Atual</label>
          <div className="relative">
            <input
              type={showAtual ? "text" : "password"}
              value={senhaAtual}
              onChange={(e) => { setSenhaAtual(e.target.value); setError(null); setSuccess(false); }}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none transition-all"
            />
            <button type="button" onClick={() => setShowAtual(!showAtual)} className="absolute right-3 top-2.5 text-[#94a3b8] hover:text-[#64748b]">
              {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Nova senha */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">Nova Senha</label>
          <div className="relative">
            <input
              type={showNova ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => { setNovaSenha(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2.5 pr-10 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:outline-none transition-all"
            />
            <button type="button" onClick={() => setShowNova(!showNova)} className="absolute right-3 top-2.5 text-[#94a3b8] hover:text-[#64748b]">
              {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {novaSenha && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className={`h-1 flex-1 rounded-full ${novaSenha.length >= 8 ? "bg-green-400" : novaSenha.length >= 6 ? "bg-amber-400" : "bg-red-400"}`} />
              <span className={`text-[10px] font-medium ${novaSenha.length >= 8 ? "text-green-600" : novaSenha.length >= 6 ? "text-amber-600" : "text-red-500"}`}>
                {novaSenha.length >= 8 ? "Forte" : novaSenha.length >= 6 ? "Razoável" : "Fraca"}
              </span>
            </div>
          )}
        </div>

        {/* Confirmar */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">Confirmar Nova Senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => { setConfirmarSenha(e.target.value); setError(null); setSuccess(false); }}
            placeholder="Repita a nova senha"
            className={`w-full px-3 py-2.5 bg-[#f8fafc] border rounded-lg text-sm text-[#0f172a] focus:ring-2 focus:ring-[#2563eb] focus:outline-none transition-all ${
              confirmarSenha && confirmarSenha !== novaSenha ? "border-red-300" : "border-[#e2e8f0] focus:border-[#2563eb]"
            }`}
          />
          {confirmarSenha && confirmarSenha !== novaSenha && (
            <p className="text-[10px] text-red-500 mt-1">As senhas não conferem.</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !senhaAtual || !novaSenha || !confirmarSenha}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? "Processando..." : <><Lock className="w-4 h-4" /> Alterar Senha</>}
        </button>
      </div>
    </div>
  );
}
