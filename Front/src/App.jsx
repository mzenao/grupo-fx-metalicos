import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Employees from "./pages/Employees.jsx";
import Orders from "./pages/Orders.jsx";
import Sells from "./pages/Sells.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Account from "./pages/Account.jsx";
import InternalLayout from "./layout.jsx";
import Navbar from "./components/landing/Navbar.jsx";
import Footer from "./components/landing/Footer.jsx";

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

function App() {
  return (
    <Routes>
      {/* Rotas públicas com estrutura da landing page */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/account" element={<Account />} />
        <Route path="/sells" element={<Sells />} />
      </Route>

      {/* Rotas internas sem Navbar/Footer */}
      <Route
        path="/dashboard"
        element={
          <InternalLayout>
            <Dashboard />
          </InternalLayout>
        }
      />
      <Route
        path="/employees"
        element={
          <InternalLayout>
            <Employees />
          </InternalLayout>
        }
      />
      <Route
        path="/orders"
        element={
          <InternalLayout>
            <Orders />
          </InternalLayout>
        }
      />
      <Route
        path="/suppliers"
        element={
          <InternalLayout>
            <Suppliers />
          </InternalLayout>
        }
      />

      {/* Rota interna extra */}
      <Route
        path="/internal"
        element={
          <InternalLayout>
            <Dashboard />
          </InternalLayout>
        }
      />

      {/* Rotas inválidas */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;