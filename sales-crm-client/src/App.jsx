import React from "react";
import "./index.css"
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Emailverification from "./pages/auth/Emailverification";
import Resetpassword from "./pages/auth/Resetpassword";
import SetPassword from "./pages/auth/SetPassword";
import Successpage from "./pages/auth/Successpage";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin dashboard
import DashboardLayout from "./components/DashboardLayout";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import DealsDashboard from "./pages/dashboard/DealsDashboard";
import CompaniesDashboard from "./pages/dashboard/CompaniesDashboard";
import ContactsDashboard from "./pages/dashboard/ContactsDashboard";
import UsersDashboard from "./pages/dashboard/UsersDashboard";
import AuditLogs from "./pages/dashboard/AuditLogs";
import TrashDashboard from "./pages/dashboard/TrashDashboard";
import ArchiveDashboard from "./pages/dashboard/ArchiveDashboard";
import DealDetails from "./pages/dashboard/DealDetails";
import CompanyDetails from "./pages/dashboard/CompanyDetails";
import ContactDetails from "./pages/dashboard/ContactDetails";

// Sales Manager dashboard
import SalesManagerLayout from "./components/SalesManagerLayout";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerTeam from "./pages/manager/ManagerTeam";
import ManagerDeals from "./pages/manager/ManagerDeals";
import ManagerCompanies from "./pages/manager/ManagerCompanies";
import ManagerContacts from "./pages/manager/ManagerContacts";

// Sales Rep dashboard
import SalesRepLayout from "./components/SalesRepLayout";
import RepDashboard from "./pages/rep/RepDashboard";
import RepDeals from "./pages/rep/RepDeals";
import RepCompanies from "./pages/rep/RepCompanies";
import RepContacts from "./pages/rep/RepContacts";

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/dashboard" replace />;
  if (user.role === "sales_manager") return <Navigate to="/manager" replace />;
  if (user.role === "sales_rep") return <Navigate to="/rep" replace />;

  return <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "login", element: <Login /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "email-verification", element: <Emailverification /> },
      { path: "reset-password", element: <Resetpassword /> },
      { path: "setup-password", element: <SetPassword /> },
      { path: "success", element: <Successpage /> },
    ]
  },
  {
    // Admin dashboard
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "deals", element: <DealsDashboard /> },
      { path: "companies", element: <CompaniesDashboard /> },
      { path: "contacts", element: <ContactsDashboard /> },
      { path: "users", element: <UsersDashboard /> },
      { path: "audit-logs", element: <AuditLogs /> },
      { path: "trash", element: <TrashDashboard /> },
      { path: "archive", element: <ArchiveDashboard /> },
      { path: "deals/:id", element: <DealDetails /> },
      { path: "companies/:id", element: <CompanyDetails /> },
      { path: "contacts/:id", element: <ContactDetails /> },
    ]
  },
  {
    // Sales Manager dashboard
    path: "/manager",
    element: (
      <ProtectedRoute allowedRoles={["sales_manager", "admin"]}>
        <SalesManagerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/manager/dashboard" replace /> },
      { path: "dashboard", element: <ManagerDashboard /> },
      { path: "team", element: <ManagerTeam /> },
      { path: "deals", element: <ManagerDeals /> },
      { path: "companies", element: <ManagerCompanies /> },
      { path: "contacts", element: <ManagerContacts /> },
      { path: "deals/:id", element: <DealDetails /> },
      { path: "companies/:id", element: <CompanyDetails /> },
      { path: "contacts/:id", element: <ContactDetails /> },
    ]
  },
  {
    // Sales Rep dashboard
    path: "/rep",
    element: (
      <ProtectedRoute allowedRoles={["sales_rep", "sales_manager", "admin"]}>
        <SalesRepLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/rep/dashboard" replace /> },
      { path: "dashboard", element: <RepDashboard /> },
      { path: "deals", element: <RepDeals /> },
      { path: "companies", element: <RepCompanies /> },
      { path: "contacts", element: <RepContacts /> },
      { path: "deals/:id", element: <DealDetails /> },
      { path: "companies/:id", element: <CompanyDetails /> },
      { path: "contacts/:id", element: <ContactDetails /> },
    ]
  },
]);

import SessionTimeoutManager from "./components/SessionTimeoutManager";

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SessionTimeoutManager>
          <RouterProvider router={router} />
        </SessionTimeoutManager>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App;