'use client';

import { gql, useQuery } from '@apollo/client';
import { CreditCard } from 'lucide-react';

const MEUS_CARTOES = gql`
  query MeusCartoes {
    myCards {
      id
      lastFourDigits
      brand
      holderName
      expMonth
      expYear
    }
  }
`;

export interface NovoCartao {
  numero: string;
  nome: string;
  validade: string; // MM/AA
  cvv: string;
  cep: string;
  rua: string;
  numeroEndereco: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type EscolhaCartao = { modo: 'salvo'; id: string } | { modo: 'novo'; dados: NovoCartao };

export const CARTAO_VAZIO: NovoCartao = {
  numero: '', nome: '', validade: '', cvv: '', cep: '', rua: '', numeroEndereco: '', bairro: '', cidade: '', uf: '',
};

/** Valida o cartão novo. Devolve a mensagem do primeiro problema, ou null. */
export function problemaNoCartao(d: NovoCartao): string | null {
  const num = d.numero.replace(/\D/g, '');
  if (num.length < 13 || num.length > 19) return 'Número do cartão inválido.';
  if (d.nome.trim().length < 3) return 'Informe o nome como está no cartão.';
  const m = d.validade.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return 'Validade no formato MM/AA.';
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return 'Mês da validade inválido.';
  const agora = new Date();
  if (ano < agora.getFullYear() || (ano === agora.getFullYear() && mes < agora.getMonth() + 1)) return 'Cartão vencido.';
  if (!/^\d{3,4}$/.test(d.cvv)) return 'CVV inválido.';
  if (d.cep.replace(/\D/g, '').length !== 8) return 'CEP de cobrança inválido.';
  if (!d.rua.trim() || !d.numeroEndereco.trim() || !d.bairro.trim() || !d.cidade.trim()) return 'Preencha o endereço de cobrança do cartão.';
  if (!/^[A-Za-z]{2}$/.test(d.uf.trim())) return 'UF com 2 letras.';
  return null;
}

/**
 * KAN-325: troca o número do cartão por um token direto no Pagar.me, com a chave
 * PÚBLICA. O número nunca passa pela nossa API — ela recebe só o token e faz a
 * pré-autorização (capturada com split na conclusão do pedido).
 */
export async function tokenizarCartao(chavePublica: string, d: NovoCartao): Promise<string> {
  const [mm, aa] = d.validade.split('/');
  const resp = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(chavePublica)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'card',
      card: {
        number: d.numero.replace(/\D/g, ''),
        holder_name: d.nome.trim().toUpperCase(),
        exp_month: Number(mm),
        exp_year: 2000 + Number(aa),
        cvv: d.cvv,
        billing_address: {
          line_1: `${d.numeroEndereco.trim()}, ${d.rua.trim()}, ${d.bairro.trim()}`,
          zip_code: d.cep.replace(/\D/g, ''),
          city: d.cidade.trim(),
          state: d.uf.trim().toUpperCase(),
          country: 'BR',
        },
      },
    }),
  });
  if (!resp.ok) {
    if (resp.status === 400 || resp.status === 422) throw new Error('Dados do cartão inválidos. Confira número, validade e CVV.');
    throw new Error('Não foi possível validar o cartão agora. Tente de novo.');
  }
  const json = await resp.json();
  if (!json?.id) throw new Error('Não foi possível validar o cartão agora. Tente de novo.');
  return json.id as string;
}

const mascaraNumero = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const mascaraValidade = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const mascaraCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/** Cartões salvos (os mesmos do app) ou um cartão novo. */
export function EscolhaDoCartao({ valor, onChange }: { valor: EscolhaCartao; onChange: (v: EscolhaCartao) => void }) {
  const { data } = useQuery(MEUS_CARTOES, { fetchPolicy: 'cache-and-network' });
  const cartoes: any[] = data?.myCards || [];
  const novo = valor.modo === 'novo' ? valor.dados : CARTAO_VAZIO;
  const campo = 'w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm';
  const muda = (k: keyof NovoCartao, v: string) => onChange({ modo: 'novo', dados: { ...novo, [k]: v } });

  return (
    <div className="space-y-2">
      {cartoes.map((c) => {
        const escolhido = valor.modo === 'salvo' && valor.id === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={escolhido}
            onClick={() => onChange({ modo: 'salvo', id: c.id })}
            className={`w-full flex items-center gap-3 text-left p-3 rounded-xl border text-sm ${
              escolhido ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-[var(--border-color)] bg-[var(--bg-input)]'
            }`}
          >
            <CreditCard size={18} className="text-[var(--brand-primary)] shrink-0" />
            <span className="text-[var(--text-primary)]">
              {(c.brand || 'Cartão').toString().toUpperCase()} final {c.lastFourDigits}
              <span className="block text-xs text-[var(--text-muted)]">
                {c.holderName} · {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
              </span>
            </span>
          </button>
        );
      })}

      <button
        type="button"
        aria-pressed={valor.modo === 'novo'}
        onClick={() => onChange({ modo: 'novo', dados: novo })}
        className={`w-full text-left p-3 rounded-xl border text-sm font-semibold ${
          valor.modo === 'novo' ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--text-primary)]' : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)]'
        }`}
      >
        {cartoes.length ? '+ Usar outro cartão' : 'Dados do cartão'}
      </button>

      {valor.modo === 'novo' && (
        <div className="grid grid-cols-2 gap-2">
          <input className={`${campo} col-span-2`} inputMode="numeric" autoComplete="cc-number" placeholder="Número do cartão" aria-label="Número do cartão"
            value={novo.numero} onChange={(e) => muda('numero', mascaraNumero(e.target.value))} />
          <input className={`${campo} col-span-2`} autoComplete="cc-name" placeholder="Nome impresso no cartão" aria-label="Nome no cartão"
            value={novo.nome} onChange={(e) => muda('nome', e.target.value)} />
          <input className={campo} inputMode="numeric" autoComplete="cc-exp" placeholder="Validade MM/AA" aria-label="Validade"
            value={novo.validade} onChange={(e) => muda('validade', mascaraValidade(e.target.value))} />
          <input className={campo} inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" aria-label="CVV"
            value={novo.cvv} onChange={(e) => muda('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <p className="col-span-2 text-xs font-semibold text-[var(--text-secondary)] pt-1">Endereço de cobrança do cartão</p>
          <input className={campo} inputMode="numeric" placeholder="CEP" aria-label="CEP de cobrança"
            value={novo.cep} onChange={(e) => muda('cep', mascaraCep(e.target.value))} />
          <input className={campo} placeholder="UF" aria-label="UF de cobrança" maxLength={2}
            value={novo.uf} onChange={(e) => muda('uf', e.target.value.toUpperCase())} />
          <input className={`${campo} col-span-2`} placeholder="Rua" aria-label="Rua de cobrança"
            value={novo.rua} onChange={(e) => muda('rua', e.target.value)} />
          <input className={campo} placeholder="Número" aria-label="Número do endereço de cobrança"
            value={novo.numeroEndereco} onChange={(e) => muda('numeroEndereco', e.target.value)} />
          <input className={campo} placeholder="Bairro" aria-label="Bairro de cobrança"
            value={novo.bairro} onChange={(e) => muda('bairro', e.target.value)} />
          <input className={`${campo} col-span-2`} placeholder="Cidade" aria-label="Cidade de cobrança"
            value={novo.cidade} onChange={(e) => muda('cidade', e.target.value)} />
          <p className="col-span-2 text-[11px] text-[var(--text-muted)]">
            Os dados do cartão vão direto para o Pagar.me; a BCM não guarda o número. O valor fica reservado e só é cobrado quando o pedido for concluído.
          </p>
        </div>
      )}
    </div>
  );
}
