import { InfoField, focusClass, panelClass } from "./shared";

const pixLabels = { cpf: "CPF", cnpj: "CNPJ", phone: "Telefone", email: "E-mail", random: "Aleatória" };

export default function SupplierProfile({ supplier }) {
  const fields = [
    ["Código", supplier.supplier_code], ["Tipo de pessoa", supplier.is_pf ? "Pessoa física" : "Pessoa jurídica"],
    [supplier.is_pf ? "Nome" : "Nome do responsável", supplier.name], ...(!supplier.is_pf ? [["Razão social", supplier.company_name]] : []),
    [supplier.is_pf ? "CPF" : "CNPJ", supplier.is_pf ? supplier.cpf : supplier.cnpj],
    ["Telefone", supplier.phone], ["E-mail", supplier.email], ["Rua", supplier.rua], ["Número", supplier.numero],
    ["Bairro", supplier.bairro], ["Cidade", supplier.cidade], ["Estado", supplier.estado], ["CEP", supplier.cep], ["País", supplier.pais],
    ["Endereço de referência", supplier.reference_address || supplier.endereco_unificado],
    ["Tipo de chave Pix", pixLabels[supplier.pix_key_type] || supplier.pix_key_type], ["Chave Pix", supplier.pix_key_value],
    ["Transporte / Placa", supplier.needs_fob ? "Preciso de FOB" : supplier.vehicle_plate],
    ["Placas adicionais", (supplier.vehicle_plates_extra || []).join(", ")],
  ];
  return <details className={`${panelClass} group`}>
    <summary className={`cursor-pointer rounded-2xl px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-amber-50/50 ${focusClass}`}>
      Dados cadastrais <span className="ml-2 font-normal text-gray-500">Ver cadastro completo</span>
    </summary>
    <dl className="grid gap-x-6 gap-y-4 border-t border-amber-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([label, value]) => <InfoField key={label} label={label} value={value} />)}
    </dl>
  </details>;
}
