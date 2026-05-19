import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import Advances from "./pages/Advances.jsx";
import Orders from "./pages/Orders.jsx";
import Sells from "./pages/Sells.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Account from "./pages/Account.jsx";
import SupplierPortal from "./pages/SupplierPortal.jsx";
import InternalLayout from "./layout.jsx";
import Navbar from "./components/landing/Navbar.jsx";
import Footer from "./components/landing/Footer.jsx";
import { fetchMe, getSessionSnapshot } from "./services/authApi";
import { fetchEmployees, fetchSuppliers } from "./services/entityData";
import { fetchMaterialTypes, fetchPurchases } from "./services/ordersData";

function LandingLayout() {
  return (
    <div className="App flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const session = getSessionSnapshot();
  
  if (!session.isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const session = getSessionSnapshot();

  if (!session.isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    if (session.role === "supplier") return <Navigate to="/supplier-portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    fetchMe()
      .then(async (user) => {
        const role = user?.role;

        if (role === "admin" || role === "employee") {
          await Promise.all([fetchEmployees(), fetchSuppliers(), fetchMaterialTypes()]);
          await fetchPurchases();
          return;
        }

        if (role === "supplier") {
          await Promise.all([fetchMaterialTypes(), fetchPurchases()]);
        }
      })
      .catch(() => {
      // token invalido/expirado: o guard de rota lida com redirecionamento.
      });
  }, []);

  return (
    <Routes>
      {/* Rotas públicas com estrutura da landing page */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/account"
          element={
            <RoleProtectedRoute allowedRoles={["supplier"]}>
              <Account />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/sells"
          element={
            <RoleProtectedRoute allowedRoles={["supplier"]}>
              <Sells />
            </RoleProtectedRoute>
          }
        />
      </Route>

      {/* Portal do Fornecedor - com sidebar interno */}
      <Route
        path="/supplier-portal"
        element={
          <RoleProtectedRoute allowedRoles={["supplier"]}>
            <SupplierPortal />
          </RoleProtectedRoute>
        }
      />

      {/* Rotas internas protegidas sem Navbar/Footer */}
      <Route
        path="/dashboard"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
              <Dashboard />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
              <Employees />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
              <Orders />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/adiantamentos"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
                <Advances />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
              <Suppliers />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Rota interna extra */}
      <Route
        path="/internal"
        element={
          <RoleProtectedRoute allowedRoles={["admin", "employee"]}>
            <InternalLayout>
              <Dashboard />
            </InternalLayout>
          </RoleProtectedRoute>
        }
      />

      {/* Rotas inválidas */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
