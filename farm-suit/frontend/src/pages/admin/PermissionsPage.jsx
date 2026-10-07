import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { SearchInput } from '../../components/common/SearchInput';

export const PermissionsPage = () => {
  const { addToast } = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getPermissions();
        if (res?.data?.modules) {
          setModules(res.data.modules);
        }
      } catch (err) {
        addToast('Failed to load permissions catalog', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [addToast]);

  const filteredModules = modules.map((m) => {
    if (!search.trim()) return m;
    const q = search.toLowerCase();
    const matchingPerms = m.permissions.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
    return { ...m, permissions: matchingPerms };
  }).filter((m) => m.permissions.length > 0);

  const totalPermissions = modules.reduce((acc, m) => acc + m.permissions.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
            System Permissions Catalog
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Complete directory of granular security policies ({totalPermissions} registered action permissions).
          </p>
        </div>

        <div style={{ width: '280px' }}>
          <SearchInput
            placeholder="Search permissions or codenames..."
            value={search}
            onChange={(v) => setSearch(v)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading permissions catalog...
        </div>
      ) : filteredModules.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No permissions found matching '{search}'.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredModules.map((mod) => (
            <div
              key={mod.module}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {mod.module}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary-text)',
                    fontWeight: '700'
                  }}>
                    {mod.permissions.length} actions
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px'
              }}>
                {mod.permissions.map((p) => (
                  <div
                    key={p.code}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                      <code style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                        {p.code}
                      </code>
                    </div>
                    {p.description && (
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
