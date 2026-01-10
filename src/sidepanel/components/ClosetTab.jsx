import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ClosetTab() {
  const { user, supabase, signIn } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [user, supabase]);

  const loadItems = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📦</div>
        <h3>No items yet</h3>
        <p>Start browsing fashion sites to build your closet</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-3)',
    }}>
      {items.map((item) => (
        <div key={item.id} className="card">
          {item.meta?.image && (
            <img
              src={item.meta.image}
              alt={item.meta.title || 'Item'}
              className="product-image"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
          {item.meta?.title && (
            <div style={{ marginTop: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                lineHeight: '1.5',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.meta.title}
              </h4>
              {item.meta.price && (
                <p style={{
                  fontSize: '12px',
                  lineHeight: '1.5',
                  fontWeight: 400,
                  color: 'var(--color-text-secondary)',
                }}>
                  {item.meta.price}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
