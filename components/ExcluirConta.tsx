'use client';

import { useState } from 'react';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Trash2 } from 'lucide-react';
import { sair } from '@/lib/sessao';
import { EVENTO_SESSAO } from '@/components/BotaoDaConta';

const IMPEDIMENTOS = gql`
  query ImpedimentosParaExcluirConta {
    impedimentosParaExcluirConta
  }
`;
const EXCLUIR = gql`
  mutation ExcluirMinhaConta($senha: String, $confirmacao: String) {
    excluirMinhaConta(senha: $senha, confirmacao: $confirmacao)
  }
`;

/**
 * KAN-326 / LGPD: o titular exclui a própria conta pela loja web também.
 * Dados pessoais são apagados; pedidos ficam no histórico da loja como "Cliente removido".
 */
export function ExcluirConta() {
  const [aberto, setAberto] = useState(false);
  const [comGoogle, setComGoogle] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [certeza, setCerteza] = useState(false);
  const [erro, setErro] = useState('');
  const [buscar, { data, loading }] = useLazyQuery(IMPEDIMENTOS, { fetchPolicy: 'network-only' });
  const [excluir, { loading: excluindo }] = useMutation(EXCLUIR);
  const impedimentos: string[] = data?.impedimentosParaExcluirConta || [];
  const preenchido = comGoogle ? confirmacao.trim().toUpperCase() === 'EXCLUIR' : senha.length > 0;

  async function enviar() {
    setErro('');
    try {
      await excluir({ variables: comGoogle ? { confirmacao } : { senha } });
      await sair();
      window.dispatchEvent(new Event(EVENTO_SESSAO));
      window.location.assign('/');
    } catch (e: any) {
      setErro(e?.graphQLErrors?.[0]?.message || e?.message || 'Não foi possível excluir a conta.');
      setCerteza(false);
    }
  }

  if (!aberto) {
    return (
      <div className="text-center">
        <button
          onClick={() => { setAberto(true); buscar(); }}
          className="text-sm text-[var(--text-muted)] underline hover:text-[var(--status-error-text)]"
        >
          Excluir minha conta
        </button>
      </div>
    );
  }

  const campo = 'w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-primary)]';

  return (
    <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 space-y-4">
      <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Trash2 size={18} /> Excluir minha conta
      </h2>
      <div className="text-sm text-[var(--text-secondary)] space-y-2">
        <p>
          <strong className="text-[var(--text-primary)]">O que é apagado:</strong>{' '}nome, e-mail, telefone, CPF, foto,
          endereços salvos, endereços dos pedidos e cartões salvos.
        </p>
        <p>
          <strong className="text-[var(--text-primary)]">O que fica:</strong>{' '}os pedidos e valores continuam no histórico
          das lojas, sem o seu nome (&quot;Cliente removido&quot;), por obrigação fiscal.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Conferindo...</p>
      ) : impedimentos.length > 0 ? (
        <div className="rounded-xl bg-amber-50 text-amber-900 p-4 text-sm space-y-1">
          <p className="font-semibold">Ainda não dá para excluir</p>
          {impedimentos.map((m) => <p key={m}>{m}</p>)}
        </div>
      ) : (
        <div className="space-y-3">
          {comGoogle ? (
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Digite EXCLUIR para confirmar
              <input className={`${campo} mt-1`} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder="EXCLUIR" />
            </label>
          ) : (
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Confirme com a sua senha
              <input type="password" className={`${campo} mt-1`} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
            </label>
          )}
          <button
            onClick={() => { setComGoogle(!comGoogle); setErro(''); }}
            className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
          >
            {comGoogle ? 'Tenho senha' : 'Entrei com o Google e não tenho senha'}
          </button>
          {erro && <p className="text-sm text-[var(--status-error-text)]">{erro}</p>}
          {certeza ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-900">Sua conta e seus dados pessoais serão apagados. Isso não pode ser desfeito.</p>
              <div className="flex gap-2">
                <button onClick={() => setCerteza(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-semibold text-[var(--text-primary)]">
                  Voltar
                </button>
                <button
                  onClick={enviar}
                  disabled={excluindo}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setAberto(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-semibold text-[var(--text-primary)]">
                Cancelar
              </button>
              <button
                onClick={() => setCerteza(true)}
                disabled={!preenchido}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Excluir minha conta
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
