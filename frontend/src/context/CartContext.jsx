import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      const data = await api.get('/cart');
      setCart(data);
    } catch (e) {
      /* keep empty cart */
    }
  }, []);

  // Reload cart whenever auth state changes (handles guest->user merge).
  useEffect(() => {
    load();
  }, [load, user]);

  const addItem = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      const data = await api.post('/cart/items', { productId, quantity });
      setCart(data);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (itemId, quantity) => {
    const data = await api.patch(`/cart/items/${itemId}`, { quantity });
    setCart(data);
  };

  const removeItem = async (itemId) => {
    const data = await api.del(`/cart/items/${itemId}`);
    setCart(data);
  };

  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateItem, removeItem, reload: load }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
