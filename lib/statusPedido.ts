/** Texto e cor de cada status de pedido (lista de pedidos e detalhe do pedido). */
export const STATUS_PEDIDO: Record<string, { texto: string; cor: string }> = {
  AWAITING_PAYMENT: { texto: 'Aguardando pagamento', cor: 'bg-amber-100 text-amber-800' },
  PAYMENT_REVIEW: { texto: 'Pagamento em análise', cor: 'bg-amber-100 text-amber-800' },
  PENDING: { texto: 'Aguardando a loja', cor: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { texto: 'Aceito', cor: 'bg-blue-100 text-blue-800' },
  PREPARING: { texto: 'Preparando', cor: 'bg-blue-100 text-blue-800' },
  READY: { texto: 'Pronto', cor: 'bg-indigo-100 text-indigo-800' },
  VENDOR_CONFIRMED_PICKUP: { texto: 'Saindo da loja', cor: 'bg-indigo-100 text-indigo-800' },
  PICKED_UP: { texto: 'A caminho', cor: 'bg-indigo-100 text-indigo-800' },
  DELIVERING: { texto: 'A caminho', cor: 'bg-indigo-100 text-indigo-800' },
  DELIVERER_CONFIRMED_DELIVERY: { texto: 'Entregue', cor: 'bg-green-100 text-green-800' },
  COMPLETED: { texto: 'Concluído', cor: 'bg-green-100 text-green-800' },
  CANCELLED: { texto: 'Cancelado', cor: 'bg-red-100 text-red-800' },
  REJECTED: { texto: 'Recusado pela loja', cor: 'bg-red-100 text-red-800' },
  EXPIRED: { texto: 'Expirado', cor: 'bg-gray-100 text-gray-700' },
  DISPUTED: { texto: 'Em análise', cor: 'bg-amber-100 text-amber-800' },
};

/** Mesmos status que a API deixa o cliente cancelar (orders.service cancelByCustomer). */
export const PODE_CANCELAR = ['AWAITING_PAYMENT', 'PENDING', 'ACCEPTED'];

export function formatarReais(valor: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}
