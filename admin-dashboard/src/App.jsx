import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Shipping from './pages/Shipping';
import Payments from './pages/Payments';
import Smtp from './pages/Smtp';
import Templates from './pages/Templates';
import EmailLogs from './pages/EmailLogs';
import Downloads from './pages/Downloads';
import Account from './pages/Account';
import Discounts from './pages/Discounts';

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/smtp" element={<Smtp />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/email-logs" element={<EmailLogs />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/account" element={<Account />} />
            <Route path="/discounts" element={<Discounts />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
