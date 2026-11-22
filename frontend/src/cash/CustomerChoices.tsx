import type { Customer, DeliveryZone } from '../api/types';
import { formatAddress } from './address';

interface CustomerChoicesProps {
  choices: Customer[];
  zones: DeliveryZone[];
  onChoose(customer: Customer): void;
}

/**
 * Homônimos achados pelo nome: o caixa reconhece o cliente pela rua e pelo bairro (o telefone
 * saiu em 2026-11-21). Não escolher nenhum segue como cliente novo.
 */
export function CustomerChoices({
  choices,
  zones,
  onChoose,
}: CustomerChoicesProps) {
  const neighborhoodOf = (customer: Customer) =>
    zones.find((zone) => zone.id === customer.deliveryZoneId)?.neighborhood;
  return (
    <div className="customer-choices">
      <p id="customer-choices-hint">
        {choices.length} clientes com esse nome: escolha pelo endereço, ou siga
        para cadastrar um novo.
      </p>
      <ul aria-describedby="customer-choices-hint">
        {choices.map((customer) => (
          <li key={customer.id}>
            <button
              type="button"
              className="customer-choice"
              onClick={() => onChoose(customer)}
            >
              <span>
                {customer.street
                  ? formatAddress(customer.street, customer.number)
                  : 'Sem endereço'}
              </span>
              <small>{neighborhoodOf(customer)}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
