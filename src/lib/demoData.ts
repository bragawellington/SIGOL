import { User, Colaborador, Equipamento, CadastroFlorestal, Lancamento, Auditoria, Atividade } from '../types';

export const demoAtividades: Atividade[] = [
  { id: "atv_1", nome: "Corte Mecanizado", descricao: "Harvester", ativo: true },
  { id: "atv_2", nome: "Baldeio de Madeira", descricao: "Forwarder", ativo: true },
  { id: "atv_3", nome: "Derrubada e Traçamento", ativo: true },
  { id: "atv_4", nome: "Derrubada Mecanizada", descricao: "Feller Buncher", ativo: true },
  { id: "atv_5", nome: "Destocamento", ativo: true },
  { id: "atv_6", nome: "Preparo de Solo", ativo: true },
  { id: "atv_7", nome: "Limpeza de Área", ativo: true },
  { id: "atv_8", nome: "Abertura de Estrada", ativo: true },
  { id: "atv_9", nome: "Manutenção de Estrada", ativo: true },
  { id: "atv_10", nome: "Terraplanagem", ativo: true },
  { id: "atv_11", nome: "Carregamento", ativo: true },
  { id: "atv_12", nome: "Trabalho Geral", ativo: true }
];

export const demoUsers: User[] = [
  { id: "usr_1", nome: "João Silva", email: "joao@sigol.com.br", codigo: "OP1001", perfil: "OPERADOR", ativo: true, created_at: "2026-05-10", senha: "sigol123" },
  { id: "usr_2", nome: "Pedro Santos", email: "pedro@sigol.com.br", codigo: "TEC001", perfil: "TÉCNICO", ativo: true, created_at: "2026-05-11", senha: "sigol123" },
  { id: "usr_3", nome: "Maria Souza", email: "maria@sigol.com.br", codigo: "FAT001", perfil: "FATURAMENTO", ativo: true, created_at: "2026-05-12", senha: "sigol123" },
  { id: "usr_4", nome: "Carlos Oliveira", email: "carlos@sigol.com.br", codigo: "GER001", perfil: "GERÊNCIA", ativo: true, created_at: "2026-05-01", senha: "sigol123" },
  { id: "usr_5", nome: "Ana Costa", email: "ana@sigol.com.br", codigo: "OP1002", perfil: "OPERADOR", ativo: true, created_at: "2026-05-15", senha: "sigol123" }
];

export const demoColaboradores: Colaborador[] = [
  { id: "col_1", registro: "OP1001", nome: "João Silva", funcao: "Operador de Harvester", equipe: "Equipe Alfa", ativo: true },
  { id: "col_2", registro: "OP1002", nome: "Ana Costa", funcao: "Operador de Forwarder", equipe: "Equipe Beta", ativo: true },
  { id: "col_3", registro: "OP1003", nome: "Marcos Ribeiro", funcao: "Operador de Feller Buncher", equipe: "Equipe Alfa", ativo: true },
  { id: "col_4", registro: "OP1004", nome: "Paula Fernandes", funcao: "Operador de Harvester", equipe: "Equipe Gama", ativo: true },
  { id: "col_5", registro: "OP1005", nome: "Rodrigo Lima", funcao: "Ajudante Florestal", equipe: "Equipe Beta", ativo: true }
];

export const demoEquipamentos: Equipamento[] = [
  { id: "eq_1", frota: "FRT-101", tipo: "Harvester John Deere 1270G", chave: "CHV-HD1270", ni: "NI-98721", valor_hora: 320, ativo: true },
  { id: "eq_2", frota: "FRT-102", tipo: "Forwarder Komatsu 895", chave: "CHV-FW895", ni: "NI-65431", valor_hora: 280, ativo: true },
  { id: "eq_3", frota: "FRT-103", tipo: "Harvester Ponsse Ergo", chave: "CHV-HPON", ni: "NI-12345", valor_hora: 350, ativo: true },
  { id: "eq_4", frota: "FRT-104", tipo: "Feller Buncher CAT 521B", chave: "CHV-FB521", ni: "NI-55612", valor_hora: 380, ativo: true },
  { id: "eq_5", frota: "FRT-105", tipo: "Chipping Truck Wood", chave: "CHV-CTWOOD", ni: "NI-44510", valor_hora: 190, ativo: true }
];

export const demoCadastroFlorestal: CadastroFlorestal[] = [
  { id: "fl_1", up: "UP-201", fazenda: "Fazenda Bela Vista", area: 12.5, nucleo: "Núcleo Sul" },
  { id: "fl_2", up: "UP-202", fazenda: "Fazenda Bela Vista", area: 15.0, nucleo: "Núcleo Sul" },
  { id: "fl_3", up: "UP-304", fazenda: "Fazenda Monte Alegre", area: 24.8, nucleo: "Núcleo Norte" },
  { id: "fl_4", up: "UP-405", fazenda: "Fazenda Refúgio", area: 8.4, nucleo: "Núcleo Oeste" },
  { id: "fl_5", up: "UP-101", fazenda: "Fazenda Primavera", area: 18.2, nucleo: "Núcleo Leste" }
];

export function generateDemoLaunches(): Lancamento[] {
  const launches: Lancamento[] = [];
  const upsSpecs = [
    { up: "UP-201", fazenda: "Fazenda Bela Vista", nucleo: "Núcleo Sul", area: 12.5 },
    { up: "UP-304", fazenda: "Fazenda Monte Alegre", nucleo: "Núcleo Norte", area: 24.8 },
    { up: "UP-405", fazenda: "Fazenda Refúgio", nucleo: "Núcleo Oeste", area: 8.4 }
  ];
  const activities = ["Corte Mecanizado", "Baldeio de Madeira", "Derrubada e Traçamento", "Trabalho Geral"];
  let baseId = 1001;

  const targetDays = [
    "2026-05-21","2026-05-22","2026-05-23","2026-05-25","2026-05-26","2026-05-27","2026-05-28","2026-05-29","2026-05-30",
    "2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06","2026-06-08","2026-06-09","2026-06-10",
    "2026-06-11","2026-06-12","2026-06-13","2026-06-15","2026-06-16","2026-06-17","2026-06-18","2026-06-19","2026-06-20"
  ];

  for (let idx = 0; idx < targetDays.length; idx++) {
    const data = targetDays[idx];
    // Operator 1
    if (idx % 1.3 < 1) {
      const hInit = 2300 + idx * 8;
      const hEnd = hInit + 8.1 + (idx % 3) * 0.4;
      const worked = Number((hEnd - hInit).toFixed(1));
      const up = upsSpecs[idx % upsSpecs.length];
      const rendimento = Number((worked / up.area).toFixed(2));
      const statusList: Array<"PENDENTE"|"APROVADO"|"FATURADO"|"DEVOLVIDO"> = ["FATURADO","APROVADO","PENDENTE","FATURADO"];
      const status = statusList[idx % statusList.length];
      launches.push({
        id: `lan_${baseId++}`, data, frota: "FRT-101", equipamento: "Harvester John Deere 1270G",
        up: up.up, fazenda: up.fazenda, nucleo: up.nucleo, area_up: up.area,
        horimetro_inicial: hInit, horimetro_final: hEnd, horas_trabalhadas: worked, horas_sap: worked,
        atividade: activities[0], operador_codigo: "OP1001", operador_nome: "João Silva",
        rendimento, status, observacao: `Apontamento operacional normal referente ao dia ${data}.`,
        criado_por: "joao@sigol.com.br", criado_em: `${data}T17:30:00Z`,
        aprovado_por: status !== "PENDENTE" && status !== "DEVOLVIDO" ? "pedro@sigol.com.br" : null,
        aprovado_em: status !== "PENDENTE" && status !== "DEVOLVIDO" ? `${data}T19:00:00Z` : null,
        faturado_por: status === "FATURADO" ? "maria@sigol.com.br" : null,
        faturado_em: status === "FATURADO" ? `${data}T21:00:00Z` : null,
        valor_hora_faturamento: status === "FATURADO" ? 320 : undefined,
        valor_total_faturamento: status === "FATURADO" ? Number((worked * 320).toFixed(2)) : undefined
      });
    }
    // Operator 2
    if (idx % 1.5 < 1) {
      const hInit = 1450 + idx * 7.5;
      const hEnd = hInit + 7.2 + (idx % 2) * 0.5;
      const worked = Number((hEnd - hInit).toFixed(1));
      const up = upsSpecs[(idx + 1) % upsSpecs.length];
      const rendimento = Number((worked / up.area).toFixed(2));
      const statusList: Array<"PENDENTE"|"APROVADO"|"FATURADO"|"DEVOLVIDO"> = ["FATURADO","APROVADO","DEVOLVIDO","PENDENTE"];
      const status = statusList[idx % statusList.length];
      launches.push({
        id: `lan_${baseId++}`, data, frota: "FRT-102", equipamento: "Forwarder Komatsu 895",
        up: up.up, fazenda: up.fazenda, nucleo: up.nucleo, area_up: up.area,
        horimetro_inicial: hInit, horimetro_final: hEnd, horas_trabalhadas: worked, horas_sap: worked,
        atividade: activities[1], operador_codigo: "OP1002", operador_nome: "Ana Costa",
        rendimento, status,
        observacao: status === "DEVOLVIDO" ? "Horímetro final inconsistente com relatório de bordo." : "Serviço operacional de baldeio florestal regular.",
        criado_por: "ana@sigol.com.br", criado_em: `${data}T17:45:00Z`,
        aprovado_por: status === "APROVADO" || status === "FATURADO" ? "pedro@sigol.com.br" : null,
        aprovado_em: status === "APROVADO" || status === "FATURADO" ? `${data}T19:15:00Z` : null,
        faturado_por: status === "FATURADO" ? "maria@sigol.com.br" : null,
        faturado_em: status === "FATURADO" ? `${data}T21:15:00Z` : null,
        valor_hora_faturamento: status === "FATURADO" ? 280 : undefined,
        valor_total_faturamento: status === "FATURADO" ? Number((worked * 280).toFixed(2)) : undefined
      });
    }
  }
  return launches;
}

export const demoAuditoria: Auditoria[] = [
  { id: "aud_1", usuario: "carlos@sigol.com.br", acao: "LOGIN", registro: "SESSÃO", descricao: "Acesso administrativo bem-sucedido via perfil GERÊNCIA.", data_hora: "2026-06-23T07:15:00-03:00" },
  { id: "aud_2", usuario: "maria@sigol.com.br", acao: "LOGIN", registro: "SESSÃO", descricao: "Acesso à central de faturamento operacional.", data_hora: "2026-06-23T07:30:00-03:00" },
  { id: "aud_3", usuario: "pedro@sigol.com.br", acao: "LOGIN", registro: "SESSÃO", descricao: "Acesso técnico para análise e aprovação de boletins.", data_hora: "2026-06-23T07:45:00-03:00" }
];
