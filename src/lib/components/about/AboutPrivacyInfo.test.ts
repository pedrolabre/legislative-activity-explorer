import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AboutPrivacyInfo from './AboutPrivacyInfo.svelte';

describe('AboutPrivacyInfo', () => {
  it('renders the header and all 5 civic and informational topics in tabular format', () => {
    const { body: html } = render(AboutPrivacyInfo, {
      props: {
        onBack: () => undefined,
        onStartOver: () => undefined
      }
    });

    expect(html).toContain('Sobre, privacidade e responsabilidade');
    expect(html).toContain(
      'Esta área reúne informações sobre a finalidade do projeto, os limites da consulta e as escolhas de privacidade da aplicação.'
    );

    // 5 topic labels
    expect(html).toContain('Finalidade pública');
    expect(html).toContain('Neutralidade');
    expect(html).toContain('Privacidade');
    expect(html).toContain('Acessibilidade');
    expect(html).toContain('Dados oficiais');

    // Tabular CSS classes
    expect(html).toContain('about-list');
    expect(html).toContain('about-row');
    expect(html).toContain('about-label');
    expect(html).toContain('about-desc');
    expect(html).toContain('about-actions');

    // Content of descriptions
    expect(html).toContain('O projeto tem caráter público, cívico, educativo e acadêmico.');
    expect(html).toContain('Esta aplicação não possui vínculo institucional com o Congresso Nacional');
    expect(html).toContain('Não há login, cadastro ou perfil de usuário.');
    expect(html).toContain('Não há cookies, LocalStorage, banco próprio, analytics ou rastreamento nesta aplicação.');
    expect(html).toContain('A consulta permanece apenas na memória da página aberta.');
    expect(html).toContain('Ao recarregar a página, o fluxo da consulta é reiniciado.');
    expect(html).toContain('foco visível e área conversacional com atualização anunciada por tecnologias assistivas');
    expect(html).toContain('consulte as fontes oficiais da Câmara dos Deputados, do Senado Federal');

    // Navigation buttons
    expect(html).toContain('← Voltar à consulta');
    expect(html).toContain('Nova consulta');
  });

  it('renders navigation buttons with correct CSS classes and accessible types', () => {
    const { body: html } = render(AboutPrivacyInfo, {
      props: {
        onBack: () => undefined,
        onStartOver: () => undefined
      }
    });

    expect(html).toMatch(/<button[^>]*type="button"[^>]*class="[^"]*btn secondary[^"]*"[^>]*>\s*← Voltar à consulta\s*<\/button>/);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*class="[^"]*btn primary[^"]*"[^>]*>\s*Nova consulta\s*<\/button>/);
  });
});
