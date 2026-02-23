import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ListDetail from './pages/ListDetail'
import BorrowRequests from './pages/BorrowRequests'
import Roadtrips from './pages/Roadtrips'
import RoadtripDetail from './pages/RoadtripDetail'
import MyLists from './pages/MyLists'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/my-lists" element={<MyLists />} />
            <Route path="/lists/:id" element={<ListDetail />} />
            <Route path="/borrow-requests" element={<BorrowRequests />} />
            <Route path="/roadtrips" element={<Roadtrips />} />
            <Route path="/roadtrips/:id" element={<RoadtripDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
