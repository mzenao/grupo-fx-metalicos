import { useMemo, useState } from "react";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	Users,
	Phone,
	Mail,
	Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeModal from "@/components/internal/employeeModal.jsx";

const INITIAL_EMPLOYEES = [
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
];

export default function Employees() {
	const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
	const [search, setSearch] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState(null);
	const [showAllEmployees, setShowAllEmployees] = useState(false);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return employees;

		return employees.filter((e) => {
			const name = (e.name || "").toLowerCase();
			const phone = (e.phone || "").toLowerCase();
			const email = (e.email || "").toLowerCase();
			const ocupance = (e.ocupance || "").toLowerCase();
			return (
				name.includes(q) ||
				phone.includes(q) ||
				email.includes(q) ||
				ocupance.includes(q)
			);
		});
	}, [employees, search]);

	const visibleEmployees = useMemo(() => {
		if (showAllEmployees) return filtered;
		return filtered.slice(0, 5);
	}, [filtered, showAllEmployees]);

	const handleDelete = (id) => {
		if (!window.confirm("Remover este funcionario?")) return;
		setEmployees((prev) => prev.filter((e) => e.id !== id));
	};

	const handleSave = (employeeData) => {
		if (employeeData?.id) {
			setEmployees((prev) =>
				prev
					.map((e) => (e.id === employeeData.id ? { ...e, ...employeeData } : e))
					.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
			);
		} else {
			const nextId =
				employees.length > 0 ? Math.max(...employees.map((e) => Number(e.id) || 0)) + 1 : 1;

			const newEmployee = { ...employeeData, id: nextId };
			setEmployees((prev) =>
				[...prev, newEmployee].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
			);
		}

		setShowModal(false);
		setEditingEmployee(null);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						placeholder="Buscar funcionario..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#d6ab4a]"
					/>
				</div>

				<Button
					onClick={() => {
						setEditingEmployee(null);
						setShowModal(true);
					}}
					className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white rounded-xl gap-2"
				>
					<Plus className="w-4 h-4" /> Novo Funcionario
				</Button>
			</div>

			<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
				{filtered.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
						<p>Nenhum funcionario encontrado</p>
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{visibleEmployees.map((employee) => (
							<div key={employee.id} className="flex items-center gap-4 p-4 hover:bg-amber-50/40 transition-colors">
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] flex items-center justify-center flex-shrink-0">
									<span className="text-white font-bold">{employee.name?.[0] || "F"}</span>
								</div>

								<div className="flex-1 min-w-0">
									<p className="font-semibold text-gray-900">{employee.name}</p>
									<div className="flex flex-wrap gap-3 mt-0.5">
										{employee.phone && (
											<span className="flex items-center gap-1 text-xs text-gray-500">
												<Phone className="w-3 h-3" />
												{employee.phone}
											</span>
										)}
										{employee.email && (
											<span className="flex items-center gap-1 text-xs text-gray-500">
												<Mail className="w-3 h-3" />
												{employee.email}
											</span>
										)}
									</div>
								</div>

								{employee.ocupance && (
									<span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-lg hidden sm:inline-flex items-center gap-1">
										<Briefcase className="w-3 h-3" />
										{employee.ocupance}
									</span>
								)}

								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											setEditingEmployee(employee);
											setShowModal(true);
										}}
										className="w-8 h-8 text-gray-400 hover:text-[#b8891f]"
									>
										<Edit2 className="w-4 h-4" />
									</Button>

									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(employee.id)}
										className="w-8 h-8 text-gray-400 hover:text-red-500"
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							</div>
						))}

						{!showAllEmployees && filtered.length > 5 && (
							<div className="p-3 flex justify-center">
								<button
									type="button"
									onClick={() => setShowAllEmployees(true)}
									className="text-xs text-gray-500 hover:text-[#b8891f] underline underline-offset-2"
								>
									Exibir mais funcionarios
								</button>
							</div>
						)}

						{showAllEmployees && filtered.length > 5 && (
							<div className="p-3 flex justify-center">
								<button
									type="button"
									onClick={() => setShowAllEmployees(false)}
									className="text-xs text-gray-400 hover:text-[#b8891f] underline underline-offset-2"
								>
									Exibir menos
								</button>
							</div>
						)}
					</div>
				)}
			</section>

			{showModal && (
				<EmployeeModal
					employee={editingEmployee}
					onClose={() => {
						setShowModal(false);
						setEditingEmployee(null);
					}}
					onSave={handleSave}
				/>
			)}
		</div>
	);
}
