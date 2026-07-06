export const unavailableOfficialFieldLabel = 'Não informado pela fonte oficial consultada.';
export const unavailableVersionFieldLabel = 'Ainda não conectado nesta versão.';
export const unavailableNominalVoteListLabel =
  'A fonte oficial não retornou lista nominal para esta votação.';

export const backendFutureRequiredMessage =
  'Exige backend futuro para consulta completa.';

export const officialSenadoCoverageUnavailableMessage =
  'Cobertura oficial do Senado ainda não conectada nesta versão.';

export const officialSenadoStaticCoverageDescription =
  `${unavailableVersionFieldLabel} ${backendFutureRequiredMessage}`;

export const officialSenadoAssociatedMattersUnavailableMessage =
  'Matérias associadas a senador ainda não conectadas nesta versão.';

export const officialSenadoAssociatedMattersUnavailableDescription =
  `${unavailableVersionFieldLabel} A consulta completa por senador ${backendFutureRequiredMessage.toLocaleLowerCase('pt-BR')}`;

export const officialSenadoProposalVotesUnavailableMessage =
  'Votações nominais do Senado ainda não conectadas nesta versão.';

export const officialParliamentarianVoteHistoryUnavailableMessage =
  `Histórico completo por parlamentar ${backendFutureRequiredMessage.toLocaleLowerCase('pt-BR')}`;

export const officialParliamentarianSessionVotesCoverageMessage =
  'Cobertura parcial: votos exibidos vieram de proposições abertas nesta sessão.';

export const officialParliamentarianSessionVotesEmptyMessage =
  'Nenhuma votação de proposição aberta foi carregada nesta sessão.';

export const officialParliamentarianStaticCoverageDescription =
  `Ao abrir uma proposição da Câmara com votações oficiais, os votos ficam disponíveis nesta sessão. ${officialParliamentarianVoteHistoryUnavailableMessage}`;

export const officialCamaraProposalVotesEmptyMessage =
  'A fonte oficial da Câmara retornou lista vazia de votações para esta proposição.';

export const officialCamaraNominalVotesEmptyMessage =
  'A fonte oficial da Câmara não retornou lista nominal para esta votação. Em votações simbólicas ou secretas, votos individuais podem não ser contabilizados.';
