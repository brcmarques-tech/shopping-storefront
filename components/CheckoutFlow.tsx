'use client';

import { useRef, useState } from 'react';
import {
  X, ChevronLeft, Loader2, CheckCircle, MapPin,
  QrCode, CreditCard, Banknote, Copy, Check,
} from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, itemTotal, formatWeight } from '@/lib/useCart';
import { CREATE_ORDER, GET_MINIMUM_ORDER_PLATFORM } from '@/lib/graphql';

type Step = 'address' | 'payment' | 'confirm' | 'success';

/** Os meios que o checkout web oferece, e o que cada um faz depois. */
type MetodoPagamento = 'ON_DELIVERY' | 'PIX' | 'CREDIT_CARD';

const METODOS: {
  valor: MetodoPagamento;
  titulo: string;
  ajuda: string;
  Icone: typeof Banknote;
}[] = [
  {
    valor: 'PIX',
    titulo: 'PIX',
    ajuda: 'QR Code na hora. O pedido é confirmado assim que o pagamento cai.',
    Icone: QrCode,
  },
  {
    valor: 'CREDIT_CARD',
    titulo: 'Cartão de crédito',
    ajuda: 'Você é levado para a página segura do provedor de pagamento.',
    Icone: CreditCard,
  },
  {
    valor: 'ON_DELIVERY',
    titulo: 'Na entrega',
    ajuda: '',
    Icone: Banknote,
  },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  deliveryFee: number;
  minimumOrder: number;
  freeDelivery?: boolean;
  freeDeliveryAbove?: number | null;
  /**
   * BUGFIX: o checkout mandava `paymentMethod: 'ON_DELIVERY'` fixo e nunca
   * `isPickup`. O backend recusa exatamente essa combinacao quando a loja NAO
   * tem frota propria ("Pagamento na entrega nao disponivel para esta loja"),
   * entao 100% dos pedidos pelo site falhavam no ultimo toque para toda loja
   * que usa entregadores da plataforma — e o site nao oferece nenhuma outra
   * forma de pagamento nem a opcao de retirada. O dado ja vinha do servidor e
   * simplesmente nao era usado.
   */
  hasOwnDelivery?: boolean;
  /** Ha item +18 no carrinho? O backend exige confirmacao explicita. */
  hasAgeRestrictedItem?: boolean;
  /** Loja aberta AGORA (revalidada no cliente) — fechada bloqueia o confirmar. */
  storeOpen?: boolean;
  /** Endereco fisico da loja — mostrado como local de RETIRADA (8.13). */
  storeAddress?: string;
}

export function CheckoutFlow({ open, onClose, storeId, deliveryFee, minimumOrder, freeDelivery, freeDeliveryAbove, hasOwnDelivery, hasAgeRestrictedItem, storeOpen, storeAddress }: Props) {
  // Sem frota propria o site so consegue concluir na modalidade RETIRADA
  // (pagamento na retirada) — que o backend aceita.
  const somenteRetirada = hasOwnDelivery === false;
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  // 8.11: o total que VALE e o do servidor (precos atuais) — a resposta do
  // createOrder era descartada e o cliente ficava com o total estimado da tela.
  const [paymentMethod, setPaymentMethod] = useState<MetodoPagamento>('PIX');
  // O que o servidor devolveu para o cliente PAGAR. Guardado em estado porque
  // a tela de sucesso precisa dele: no PIX é o QR e o copia-e-cola; no cartão
  // é a URL do checkout do provedor.
  const [pix, setPix] = useState<{ codigo?: string; imagem?: string } | null>(null);
  const [cartaoUrl, setCartaoUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [totalDivergiu, setTotalDivergiu] = useState(false);
  const [error, setError] = useState('');

  const { items, subtotal, clearCart, storeId: cartStoreId } = useCart();
  // KAN-218: aplica a MESMA regra de frete gratis do backend
  // (orders.service.ts) — antes o checkout ignorava freeDelivery/freeDeliveryAbove
  // e cobrava a taxa mesmo com o cabecalho anunciando "Frete gratis".
  const isFreeDelivery =
    !!freeDelivery ||
    (freeDeliveryAbove != null && Number(freeDeliveryAbove) > 0 && subtotal() >= Number(freeDeliveryAbove));
  // BUGFIX: `somenteRetirada` nao entrava na conta. Como o site so consegue
  // concluir pedido de loja sem frota propria — e nesse caso envia
  // `isPickup: true`, que faz o servidor zerar o frete — a tela dizia
  // "Retirada no local" E somava a taxa de entrega ao mesmo tempo. O cliente
  // confirmava um total maior do que o pedido realmente criado.
  const { data: minPlatData } = useQuery(GET_MINIMUM_ORDER_PLATFORM);
  const minimoPlataforma = Number(minPlatData?.minimumOrderPlatform) || 0;
  const minimoEfetivo =
    hasOwnDelivery === false ? Math.max(minimoPlataforma, minimumOrder) : minimumOrder;

  const effectiveDeliveryFee = somenteRetirada || isFreeDelivery ? 0 : deliveryFee;
  const total = subtotal() + effectiveDeliveryFee;

  const [createOrder, { loading }] = useMutation(CREATE_ORDER);
  // KAN-247: trava sincrona de double-submit (o `loading` do useMutation so
  // atualiza no proximo render, tarde demais para um toque duplo).
  const submittingRef = useRef(false);

  const handleConfirm = async () => {
    // KAN-247: trava SINCRONA contra envio duplicado. A unica protecao era
    // `disabled={loading}`, mas `loading` so vira true depois do React
    // re-renderizar — um toque duplo rapido (comum no mobile) disparava
    // createOrder duas vezes antes disso, gerando pedido duplicado: retrabalho
    // para a loja e risco de cobranca/entrega em dobro. O ref muda no mesmo
    // tick, entao a segunda chamada volta imediatamente.
    if (submittingRef.current) return;
    submittingRef.current = true;

    setError('');
    // O carrinho é global e pertence a UMA loja (cartStoreId). Se o usuário
    // abre outra loja e finaliza por aqui, os itens são da loja do carrinho mas
    // o storeId da página é outro — o pedido sairia com itens de uma loja
    // atribuídos a outra (erro no backend ou pedido corrompido). Bloqueia.
    if (cartStoreId && cartStoreId !== storeId) {
      setError(
        'Seu carrinho é de outra loja. Abra a loja correta para finalizar ou limpe o carrinho.',
      );
      submittingRef.current = false;
      return;
    }
    // Mesma regra do backend: sem frota propria, vale o MAIOR entre o minimo da
    // loja e o da plataforma.
    if (subtotal() < minimoEfetivo && minimoEfetivo > 0) {
      setError(`Pedido mínimo: ${formatCurrency(minimoEfetivo)}`);
      submittingRef.current = false;
      return;
    }
    // KAN-282: a loja pode ter fechado enquanto o cliente montava o pedido
    // (o isOpen do SSR nao era revalidado). O servidor rejeita de qualquer
    // forma; aqui a mensagem chega ANTES de o cliente achar que concluiu.
    if (storeOpen === false) {
      setError('A loja está fechada no momento. Seu carrinho fica salvo para quando ela reabrir.');
      submittingRef.current = false;
      return;
    }
    // 8.11: item marcado como indisponivel na reconciliacao nao pode ir no
    // pedido — o cliente decide (remove) em vez de o item sumir em silencio.
    if (items.some((i) => i.unavailable)) {
      setError('Há itens indisponíveis no carrinho. Remova-os para continuar.');
      submittingRef.current = false;
      return;
    }
    try {
      const { data } = await createOrder({
        variables: {
          input: {
            storeId,
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes,
              // KAN-282: sem o peso, o servidor tratava produto de peso
              // variavel como unidade e cobrava o preco DO KG por peca.
              ...(i.isVariableWeight && i.weightGrams
                ? { weightGrams: i.weightGrams }
                : {}),
            })),
            // 8.13: retirada nao tem endereco de entrega — o servidor grava o
            // endereco DA LOJA no pedido quando isPickup e true.
            deliveryAddress: somenteRetirada ? undefined : address,
            paymentMethod,
            isPickup: somenteRetirada,
            ageVerified: hasAgeRestrictedItem ? ageConfirmed : undefined,
            notes,
          },
        },
      });
      setOrderNumber(data.createOrder.orderNumber);

      // CARTÃO: o provedor hospeda a página de pagamento. Abro em nova aba em
      // vez de trocar a página atual, para o cliente não perder a tela do
      // pedido se desistir ou se o pop-up for bloqueado — e o número do pedido
      // continua visível aqui.
      if (data.createOrder.paymentMethod === 'CREDIT_CARD' && data.createOrder.checkoutUrl) {
        setCartaoUrl(data.createOrder.checkoutUrl);
        window.open(data.createOrder.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
      // PIX: guardo o copia-e-cola e a imagem do QR para a tela de sucesso.
      if (data.createOrder.paymentMethod === 'PIX') {
        setPix({
          codigo: data.createOrder.pixQrCode || undefined,
          imagem: data.createOrder.pixQrCodeBase64 || undefined,
        });
      }

      const totalServidor = Number(data.createOrder.total);
      if (Number.isFinite(totalServidor)) {
        setServerTotal(totalServidor);
        // centavos de tolerancia: arredondamento nao e divergencia
        setTotalDivergiu(Math.abs(totalServidor - total) > 0.009);
      }
      clearCart();
      setStep('success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erro ao criar pedido');
    } finally {
      // KAN-247: libera a trava para o usuario poder tentar de novo apos erro.
      submittingRef.current = false;
    }
  };

  // Copia o copia-e-cola do PIX. clipboard.writeText exige contexto seguro
  // (https/localhost) e permissao; quando falha, caio no textarea+execCommand
  // para o cliente nao ficar sem como pagar.
  const copiarPix = async () => {
    const codigo = pix?.codigo;
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = codigo;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        return; // nao marca "copiado" se nao copiou
      }
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const reset = () => {
    setStep('address');
    setAddress('');
    setNotes('');
    setOrderNumber(null);
    setPix(null);
    setCartaoUrl(null);
    setCopiado(false);
    setServerTotal(null);
    setTotalDivergiu(false);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[var(--z-overlay)]"
            onClick={step === 'success' ? reset : undefined}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl z-[var(--z-modal)] max-h-[90vh] overflow-y-auto"
          >
            {step === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
                <CheckCircle size={56} className="text-green-500" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {paymentMethod === 'ON_DELIVERY'
                    ? 'Pedido realizado!'
                    : 'Pedido criado — falta pagar'}
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Pedido <strong>#{orderNumber}</strong>
                  {serverTotal != null && (
                    <> — total <strong>{formatCurrency(serverTotal)}</strong></>
                  )}
                  .
                  <br />
                  {/* Pagamento online nasce em AWAITING_PAYMENT: a loja so
                      recebe o pedido quando o pagamento e confirmado, e o
                      scheduler expira em 30 min (mesma validade do QR do PIX).
                      Dizer "aguarde o contato da loja" aqui seria mentira. */}
                  {paymentMethod !== 'ON_DELIVERY'
                    ? 'A loja recebe o pedido assim que o pagamento for confirmado. Você tem 30 minutos para pagar.'
                    : somenteRetirada && storeAddress
                      ? <>Retire seu pedido em: <strong>{storeAddress}</strong></>
                      : 'Acompanhe pelo app ou aguarde o contato da loja.'}
                </p>

                {paymentMethod === 'PIX' && (
                  <div className="w-full max-w-xs flex flex-col items-center gap-3 bg-[var(--bg-muted)] rounded-2xl p-4">
                    {/* O QR é desenhado AQUI, a partir do copia e cola, em vez
                        de carregar a imagem do provedor: os dois codificam o
                        mesmo payload, e desenhar local não depende de uma
                        requisição externa que pode falhar, expirar ou ser
                        bloqueada justamente na hora de pagar. A imagem do
                        provedor fica como plano B para o caso de vir só ela.
                        (`qrcode.react` já era dependência do projeto, instalada
                        e nunca usada — era esta tela que faltava.) */}
                    {pix?.codigo ? (
                      <div className="bg-white rounded-xl p-3">
                        <QRCodeSVG value={pix.codigo} size={160} level="M" />
                      </div>
                    ) : pix?.imagem ? (
                      /* pixQrCodeBase64 guarda, na verdade, a URL da imagem do
                         QR devolvida pelo provedor (qr_code_url) — o nome ficou
                         do tempo do Mercado Pago. Aceito os dois formatos. */
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={
                          /^(https?:|data:)/.test(pix.imagem)
                            ? pix.imagem
                            : `data:image/png;base64,${pix.imagem}`
                        }
                        alt="QR Code do PIX"
                        className="w-44 h-44 bg-white rounded-xl p-2"
                      />
                    ) : null}
                    {pix?.codigo ? (
                      <>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Escaneie o QR Code no app do seu banco ou pague com o
                          código copia e cola.
                        </p>
                        <code className="w-full max-h-20 overflow-y-auto text-left text-[10px] leading-relaxed break-all text-[var(--text-muted)] bg-[var(--bg-card)] rounded-xl p-2">
                          {pix.codigo}
                        </code>
                        <button
                          onClick={copiarPix}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                        >
                          {copiado ? (
                            <>
                              <Check size={16} /> Código copiado
                            </>
                          ) : (
                            <>
                              <Copy size={16} /> Copiar código PIX
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">
                        O código do PIX não veio na resposta. Abra o pedido{' '}
                        <strong>#{orderNumber}</strong> no aplicativo para pagar.
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'CREDIT_CARD' && (
                  <div className="w-full max-w-xs flex flex-col items-center gap-3 bg-[var(--bg-muted)] rounded-2xl p-4">
                    <CreditCard size={28} className="text-[var(--brand-primary)]" />
                    {cartaoUrl ? (
                      <>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Abrimos a página segura de pagamento em outra aba. Se o
                          navegador bloqueou, use o botão abaixo.
                        </p>
                        <a
                          href={cartaoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                        >
                          Pagar com cartão
                        </a>
                      </>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">
                        A página de pagamento não veio na resposta. Abra o pedido{' '}
                        <strong>#{orderNumber}</strong> no aplicativo para pagar.
                      </p>
                    )}
                  </div>
                )}

                {totalDivergiu && (
                  <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl p-3">
                    O total foi recalculado pela loja com os preços atuais —
                    esse é o valor que vale para o pagamento.
                  </p>
                )}
                <button
                  onClick={reset}
                  className="mt-4 w-full max-w-xs py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                >
                  Voltar à loja
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)]">
                  {step !== 'address' && (
                    <button
                      onClick={() =>
                        setStep(step === 'confirm' ? 'payment' : 'address')
                      }
                      className="text-[var(--text-muted)]"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="flex-1 font-bold text-[var(--text-primary)]">
                    {step === 'address' && (somenteRetirada ? 'Retirada no local' : 'Endereço de entrega')}
                    {step === 'payment' && 'Pagamento'}
                    {step === 'confirm' && 'Confirmar pedido'}
                  </h2>
                  <button onClick={onClose}>
                    <X size={20} className="text-[var(--text-muted)]" />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {error && (
                    <p className="text-xs text-[var(--status-error-text)] bg-[var(--status-error-bg)] px-3 py-2 rounded-lg">
                      {error}
                    </p>
                  )}

                  {step === 'address' && (
                    <>
                      {/* 8.13: retirada NAO pede endereco de entrega — o cliente
                          digitava a propria casa e ficava esperando uma entrega
                          que nunca viria. Aqui mostra ONDE retirar. */}
                      {somenteRetirada ? (
                        <div className="flex items-start gap-3 bg-[var(--bg-muted)] rounded-xl p-3">
                          <MapPin size={18} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                          <div className="text-sm text-[var(--text-primary)]">
                            <p className="font-semibold mb-0.5">Retire seu pedido na loja</p>
                            <p className="text-[var(--text-secondary)]">
                              {storeAddress || 'Endereço disponível na confirmação do pedido'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 bg-[var(--bg-muted)] rounded-xl p-3">
                          <MapPin size={18} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                          <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Rua, número, bairro, complemento..."
                            rows={3}
                            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (!somenteRetirada && !address.trim()) {
                            setError('Informe o endereço de entrega');
                            return;
                          }
                          setError('');
                          setStep('payment');
                        }}
                        className="w-full py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                      >
                        Continuar
                      </button>
                    </>
                  )}

                  {step === 'payment' && (
                    <>
                      {/* ─── ESCOLHA DO PAGAMENTO (KAN-252) ───────────────────
                          Antes daqui só saía `ON_DELIVERY` fixo, enquanto o
                          site institucional prometia "PIX e cartão no
                          checkout" e "QR Code instantâneo". A promessa existia
                          e o produto não cumpria.

                          PIX e cartão são seguros de oferecer AQUI porque o
                          storefront nunca faz entrega por entregador do app:
                          ou é retirada, ou a própria loja entrega. É a entrega
                          por app que exige cartão, para o entregador ter
                          garantia de recebimento. */}
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          Como você quer pagar?
                        </p>
                        {METODOS.map((m) => (
                          <button
                            key={m.valor}
                            onClick={() => setPaymentMethod(m.valor)}
                            className={`flex items-start gap-3 text-left p-3 rounded-xl border transition ${
                              paymentMethod === m.valor
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                                : 'border-[var(--border-color)] bg-[var(--bg-input)]'
                            }`}
                          >
                            <m.Icone
                              size={20}
                              className="shrink-0 mt-0.5 text-[var(--brand-primary)]"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[var(--text-primary)]">
                                {m.titulo}
                              </span>
                              <span className="block text-xs text-[var(--text-muted)]">
                                {m.valor === 'ON_DELIVERY'
                                  ? somenteRetirada
                                    ? 'Pague em dinheiro ou cartão ao retirar na loja.'
                                    : 'Pague em dinheiro ou cartão quando receber.'
                                  : m.ajuda}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                      {paymentMethod !== 'ON_DELIVERY' && (
                        <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl p-3">
                          Pagamento online exige CPF no cadastro — é requisito do
                          provedor de pagamento.
                        </p>
                      )}
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observações do pedido (opcional)"
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm resize-none"
                      />
                      <button
                        onClick={() => setStep('confirm')}
                        className="w-full py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                      >
                        Revisar pedido
                      </button>
                    </>
                  )}

                  {step === 'confirm' && (
                    <>
                      {/* Resumo dos itens */}
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-[var(--text-secondary)]">
                              {/* 8.11: item de peso variavel mostrava "1x" e o
                                  preco DO KG como se fosse o total da peca */}
                              {item.isVariableWeight && item.weightGrams
                                ? `${formatWeight(item.weightGrams)} ${item.name}`
                                : `${item.quantity}x ${item.name}`}
                            </span>
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatCurrency(itemTotal(item))}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-[var(--border-color)] pt-3 space-y-1.5">
                        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                          <span>Subtotal</span>
                          <span>{formatCurrency(subtotal())}</span>
                        </div>
                        {!somenteRetirada && (
                          <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                            <span>Entrega</span>
                            <span>
                              {effectiveDeliveryFee === 0
                                ? 'Grátis'
                                : formatCurrency(effectiveDeliveryFee)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-[var(--text-primary)]">
                          <span>Total</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl p-3">
                        {/* 8.13: na retirada o endereco que importa e o DA LOJA */}
                        {somenteRetirada
                          ? <>🏪 Retire em: {storeAddress || 'endereço da loja'}</>
                          : <>📍 {address}</>}
                        <br />
                        {/* KAN-252: esta linha era fixa em "Pagamento na
                            entrega" e passou a mentir no instante em que o
                            checkout ganhou PIX e cartao. */}
                        {paymentMethod === 'PIX'
                          ? '💠 PIX — QR Code na próxima tela'
                          : paymentMethod === 'CREDIT_CARD'
                            ? '💳 Cartão de crédito — página segura do provedor'
                            : somenteRetirada
                              ? '🏪 Retirada no local — pague ao retirar'
                              : '💵 Pagamento na entrega'}
                        {notes && <><br />📝 {notes}</>}
                      </div>

                      {somenteRetirada && (
                        <div className="text-xs rounded-xl p-3 bg-amber-50 text-amber-900 border border-amber-200">
                          Esta loja usa entregadores da plataforma, e o site aceita
                          apenas <strong>retirada no local</strong>. Para receber em
                          casa, faça o pedido pelo aplicativo.
                        </div>
                      )}

                      {hasAgeRestrictedItem && (
                        <label className="flex items-start gap-2 text-xs rounded-xl p-3 bg-red-50 text-red-900 border border-red-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ageConfirmed}
                            onChange={(e) => setAgeConfirmed(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            Este pedido contém produto com restrição de idade.
                            Confirmo que tenho <strong>18 anos ou mais</strong>.
                          </span>
                        </label>
                      )}

                      <button
                        onClick={handleConfirm}
                        disabled={loading || (hasAgeRestrictedItem && !ageConfirmed)}
                        className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Confirmar pedido
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
