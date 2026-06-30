import { describe, expect, it } from 'vitest';
import { CAMARA_API_BASE_URL } from '$lib/api/camaraClient';
import { SENADO_API_BASE_URL } from '$lib/api/senadoClient';
import { createOfficialApiClients } from './officialApiClientFactory';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('createOfficialApiClients', () => {
  it('creates direct official clients with an injected fetcher', async () => {
    const calls: string[] = [];
    const { config, camaraClient, senadoClient } = createOfficialApiClients({
      dataSourceEnv: {},
      fetch: async (input) => {
        calls.push(input);

        if (input.startsWith(CAMARA_API_BASE_URL)) {
          return jsonResponse({
            dados: []
          });
        }

        return jsonResponse({
          ListaParlamentarEmExercicio: {
            Parlamentares: {
              Parlamentar: []
            }
          }
        });
      }
    });

    await camaraClient.getDeputados({
      nome: 'Ana'
    });
    await senadoClient.getSenadoresAtuais();

    expect(config.mode).toBe('direct');
    expect(calls[0]).toContain(`${CAMARA_API_BASE_URL}/deputados`);
    expect(calls[1]).toBe(`${SENADO_API_BASE_URL}/senador/lista/atual.json`);
  });

  it('routes official client requests through the configured public proxy', async () => {
    const calls: string[] = [];
    const { config, camaraClient } = createOfficialApiClients({
      dataSourceEnv: {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      fetch: async (input) => {
        calls.push(input);

        return jsonResponse({
          dados: []
        });
      }
    });

    await camaraClient.getProposicoes({
      keywords: 'educacao'
    });

    const proxiedUrl = new URL(calls[0]);

    expect(config.mode).toBe('proxy');
    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
    expect(proxiedUrl.searchParams.get('url')).toContain(`${CAMARA_API_BASE_URL}/proposicoes`);
    expect(proxiedUrl.searchParams.get('url')).toContain('keywords=educacao');
  });
});
