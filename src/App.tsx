import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import {Navigate, Route, Routes} from "react-router-dom"

function HasToken() {
  return Boolean (localStorage.getItem("accessToken"));
}

function ProtectedRoute({children}: {children: React.ReactNode}){
  if (!HasToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace/>} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<div style={{padding : 24}}>Not Found</div>}/>

    </Routes>
  );
}