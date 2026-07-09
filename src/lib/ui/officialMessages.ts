export const unavailableOfficialFieldLabel = 'Não informado pela fonte oficial consultada.';
export const unavailableVersionFieldLabel = 'Ainda não conectado nesta versão.';
export const unavailableNominalVoteListLabel =
  'A fonte oficial não retornou lista nominal para esta votação.';

export const backendFutureRequiredMessage =
  'Exige backend futuro para consulta completa.';

export const officialSenadoCoverageUnavailableMessage =
  'Cobertura oficial do Senado ainda não conectada nesta versão.';

export const officialSenadoStaticCoverageDescription =
  `Consulta completa por parlamentar ${backendFutureRequiredMessage.toLocaleLowerCase('pt-BR')}`;

export const officialSenadoAssociatedMattersUnavailableMessage =
  'Matérias associadas a senador não puderam ser carregadas nesta consulta.';

export const officialSenadoAssociatedMattersEmptyMessage =
  'Nenhuma autoria ou relatoria foi retornada pelo Senado para este senador nesta consulta.';

export const officialSenadoAssociatedMattersUnavailableDescription =
  `A fonte oficial retornou lista vazia para autoria e relatoria nesta consulta. Consulta completa por senador ${backendFutureRequiredMessage.toLocaleLowerCase('pt-BR')}`;

export const officialSenadoProposalVotesUnavailableMessage =
  'Votações do Senado não puderam ser carregadas nesta consulta.';

export const officialSenadoProposalVotesEmptyMessage =
  'A fonte oficial do Senado retornou lista vazia de votações para esta proposição.';

export const officialParliamentarianVoteHistoryUnavailableMessage =
  `Histórico completo por parlamentar ${backendFutureRequiredMessage.toLocaleLowerCase('pt-BR')}`;

export const officialParliamentarianSessionVotesCoverageMessage =
  'Cobertura parcial: votos exibidos vieram de proposições abertas nesta sessão.';

export const officialParliamentarianSessionVotesEmptyMessage =
  'Nenhuma votação de proposição aberta foi carregada nesta sessão.';

export const officialParliamentarianStaticCoverageDescription =
  `Ao abrir uma proposição com votações oficiais, os votos ficam disponíveis nesta sessão. ${officialParliamentarianVoteHistoryUnavailableMessage}`;

export const officialCamaraProposalVotesEmptyMessage =
  'A fonte oficial da Câmara retornou lista vazia de votações para esta proposição.';

export const officialCamaraNominalVotesEmptyMessage =
  'A fonte oficial da Câmara não retornou lista nominal para esta votação. Em votações simbólicas ou secretas, votos individuais podem não ser contabilizados.';
