export type ProfilOption = "OPERADOR" | "TÉCNICO" | "FATURAMENTO" | "GERÊNCIA";

export interface User {
  id: string;
  nome: string;
  email: string;
  codigo: string;
  perfil: ProfilOption;
  ativo: boolean;
  created_at: string;
  senha?: string;
}

export interface Colaborador {
  id: string;
  registro: string;
  nome: string;
  funcao: string;
  equipe: string;
  ativo: boolean;
}

export interface Equipamento {
  id: string;
  frota: string;
  tipo: string;
  chave: string;
  ni: string;
  valor_hora: number;
  ativo: boolean;
  // Computed fields injected by API
  horas_acumuladas?: number;
  valor_produzido?: number;
  utilizacao_mensal?: number;
}

export interface CadastroFlorestal {
  id: string;
  up: string;
  fazenda: string;
  area: number;
  nucleo: string;
}

export interface Lancamento {
  id: string;
  data: string;
  frota: string;
  equipamento: string;
  up: string;
  fazenda: string;
  nucleo: string;
  area_up: number;
  horimetro_inicial: number;
  horimetro_final: number;
  horas_trabalhadas: number;
  horas_sap: number;
  atividade: string;
  operador_codigo: string;
  operador_nome: string;
  rendimento: number;
  status: "PENDENTE" | "APROVADO" | "DEVOLVIDO" | "FATURADO";
  observacao: string;
  criado_por: string;
  criado_em: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  faturado_por: string | null;
  faturado_em: string | null;
  valor_hora_faturamento?: number;
  valor_total_faturamento?: number;
  anexo?: string;
  anexo_nome?: string;
}

export interface Auditoria {
  id: string;
  usuario: string;
  acao: string;
  registro: string;
  descricao: string;
  data_hora: string;
}
