import React from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Events from './pages/Events';
import About from './pages/About';
import Team from './pages/Team';
import { PortalProvider } from './context/PortalContext';
import PortalLanding from './pages/portal/PortalLanding';
import Signup from './pages/portal/Signup';
import Login from './pages/portal/Login';
import ResetPassword from './pages/portal/ResetPassword';
import UpdatePassword from './pages/portal/UpdatePassword';
import ApplyRegister from './pages/portal/ApplyRegister';
import ApplyQuestions from './pages/portal/ApplyQuestions';
import ApplyConsent from './pages/portal/ApplyConsent';
import ApplySubmit from './pages/portal/ApplySubmit';
import Confirmation from './pages/portal/Confirmation';
import Dashboard from './pages/portal/Dashboard';
import DashboardDetails from './pages/portal/DashboardDetails';
import PortalEnvironmentBanner from './components/portal/PortalEnvironmentBanner';
import ApplyLayout from './components/portal/ApplyLayout';
import RequireAuth from './components/portal/RequireAuth';
import RequireOrganizer from './components/portal/RequireOrganizer';
import OrganizerReview from './pages/portal/OrganizerReview';

function PortalLayout() {
  return (
    <PortalProvider>
      <PortalEnvironmentBanner />
      <Outlet />
    </PortalProvider>
  );
}

function App() {
  return (
    <main className="App">
      <Routes>
        <Route path="/events" element={<Events />} />
        <Route path="/about" element={<About />} />
        <Route path="/team" element={<Team />} />
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalLanding />} />
          <Route path="/portal/signup" element={<Signup />} />
          <Route path="/portal/login" element={<Login />} />
          <Route path="/portal/reset-password" element={<ResetPassword />} />
          <Route path="/portal/update-password" element={<UpdatePassword />} />
          <Route element={<ApplyLayout />}>
            <Route path="/portal/apply/register" element={<ApplyRegister />} />
            <Route
              path="/portal/apply/questions"
              element={<ApplyQuestions />}
            />
            <Route path="/portal/apply/consent" element={<ApplyConsent />} />
            <Route path="/portal/apply/submit" element={<ApplySubmit />} />
          </Route>
          <Route
            path="/portal/apply/confirmation"
            element={
              <RequireAuth>
                <Confirmation />
              </RequireAuth>
            }
          />
          <Route
            path="/portal/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/portal/dashboard/details"
            element={
              <RequireAuth>
                <DashboardDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/portal/admin"
            element={
              <RequireAuth>
                <RequireOrganizer>
                  <OrganizerReview />
                </RequireOrganizer>
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </main>
  );
}

export default App;
