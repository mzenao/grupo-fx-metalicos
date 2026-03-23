// Camada central de dados mock para facilitar futura migracao para backend/banco.

export const STORAGE_KEYS = {
  purchases: "fx_orders_purchases",
  employees: "fx_employees_records",
  suppliers: "fx_suppliers_records",
};

export const ACTIVE_USER_ID = 1;

export const MOCK_USERS = [
  {
    id: 1,
    name: "Joao Pedro Lima",
    email: "joao.lima@fornecedor.com",
    role: "user",
    accountType: "pf",
    supplierId: 1,
  },
  {
    id: 2,
    name: "Ana Souza",
    email: "ana@fenix.com.br",
    role: "funcionario",
  },
];

export const MOCK_SUPPLIERS = [
  { id: 1, label: "Joao Pedro Lima (PF)" },
  { id: 2, label: "Distribuidora Vale Sul (PJ)" },
  { id: 3, label: "Marcos Almeida (PF)" },
];

export const MOCK_EMPLOYEES = [
  { id: 1, label: "Ana Souza" },
  { id: 2, label: "Carlos Mendes" },
  { id: 3, label: "Juliana Nogueira" },
];

export const MOCK_EMPLOYEES_DETAILED = [
  {
    id: 1,
    name: "Ana Souza",
    phone: "(32) 99999-0001",
    email: "ana@fenix.com.br",
    ocupance: "Gerente",
    password: "",
  },
  {
    id: 2,
    name: "Carlos Mendes",
    phone: "(32) 98888-0002",
    email: "carlos@fenix.com.br",
    ocupance: "Colaborador",
    password: "",
  },
  {
    id: 3,
    name: "Juliana Nogueira",
    phone: "(32) 97777-0003",
    email: "juliana@fenix.com.br",
    ocupance: "Colaboradora",
    password: "",
  },
];

export const MOCK_SUPPLIERS_DETAILED = [
  {
    id: 1,
    personType: "PF",
    name: "Joao Pedro Lima",
    companyName: "",
    cpf: "123.456.789-00",
    cnpj: "",
    vehiclePlate: "ABC1D23",
    referenceAddress: "Rua das Palmeiras, 120 - Centro",
    email: "joao.lima@fornecedor.com",
    phone: "(32) 98888-1234",
    password: "",
  },
  {
    id: 2,
    personType: "PJ",
    name: "",
    companyName: "Distribuidora Vale Sul",
    cpf: "",
    cnpj: "12.345.678/0001-90",
    vehiclePlate: "QWE4R56",
    referenceAddress: "Avenida Industrial, 455 - Distrito 2",
    email: "contato@valesul.com.br",
    phone: "(32) 3777-9000",
    password: "",
  },
  {
    id: 3,
    personType: "PF",
    name: "Marcos Almeida",
    companyName: "",
    cpf: "987.654.321-00",
    cnpj: "",
    vehiclePlate: "JKL9M87",
    referenceAddress: "Rua da Usina, 40 - Bairro Novo",
    email: "marcos.almeida@fornecedor.com",
    phone: "(32) 97777-1010",
    password: "",
  },
];

export const MOCK_PURCHASES = [
  {
    id: 317,
    SupplierId: 1,
    SupplierName: "Joao Pedro Lima (PF)",
    employeeId: 1,
    employeeName: "Ana Souza",
    weight: "820",
    value: "1790",
    datetime: "2026-03-03T14:20",
    attachmentNames: ["ticket-balanca-317.pdf", "comprovante-pagamento-317.jpg"],
  },
  {
    id: 301,
    SupplierId: 1,
    SupplierName: "Joao Pedro Lima (PF)",
    employeeId: 2,
    employeeName: "Carlos Mendes",
    weight: "1450",
    value: "4280.5",
    datetime: "2026-02-14T09:10",
    attachmentNames: ["ticket-balanca-301.pdf"],
  },
];

export function getActiveUser() {
  return MOCK_USERS.find((user) => user.id === ACTIVE_USER_ID) || MOCK_USERS[0] || null;
}

export function readStorageArray(storageKey, fallback) {
  if (typeof window === "undefined") return [...fallback];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...fallback];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...fallback];

    return parsed;
  } catch {
    return [...fallback];
  }
}

export function writeStorageArray(storageKey, records) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(records || []));
  } catch {
    // Ignora falhas de persistencia local no ambiente de desenvolvimento.
  }
}
