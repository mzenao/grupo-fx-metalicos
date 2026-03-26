import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import Orders from "./pages/Orders.jsx";
import Sells from "./pages/Sells.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Account from "./pages/Account.jsx";
import SupplierPortal from "./pages/SupplierPortal.jsx";
import InternalLayout from "./layout.jsx";
import Navbar from "./components/landing/Navbar.jsx";
import Footer from "./components/landing/Footer.jsx";
import { getActiveUser, initializeMockUsers } from "./services/mockDatabase.js";

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
  const activeUser = getActiveUser();
  
  if (!activeUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    initializeMockUsers();
  }, []);

  return (
    <Routes>
      {/* Rotas públicas com estrutura da landing page */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sells"
          element={
            <ProtectedRoute>
              <Sells />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Portal do Fornecedor - com sidebar interno */}
      <Route
        path="/supplier-portal"
        element={
          <ProtectedRoute>
            <SupplierPortal />
          </ProtectedRoute>
        }
      />

      {/* Rotas internas protegidas sem Navbar/Footer */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <InternalLayout>
              <Dashboard />
            </InternalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <InternalLayout>
              <Employees />
            </InternalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <InternalLayout>
              <Orders />
            </InternalLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <InternalLayout>
              <Suppliers />
            </InternalLayout>
          </ProtectedRoute>
        }
      />

      {/* Rota interna extra */}
      <Route
        path="/internal"
        element={
          <ProtectedRoute>
            <InternalLayout>
              <Dashboard />
            </InternalLayout>
          </ProtectedRoute>
        }
      />

      {/* Rotas inválidas */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;