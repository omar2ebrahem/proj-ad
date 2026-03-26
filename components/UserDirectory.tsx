import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import { Employee } from '../lib/types';
import dirStyles from '../styles/directory.module.css';

/* ─── column definition ──────────────────────────── */
interface ColDef {
  key: string;
  label: string;
  editable: boolean;
}

const COLUMNS: ColDef[] = [
  { key: 'displayName', label: 'Name', editable: true },
  { key: 'mail', label: 'E-Mail', editable: false },
  { key: 'jobTitle', label: 'Position', editable: true },
  { key: 'department', label: 'Abteilung', editable: true },
  { key: 'companyName', label: 'Firma', editable: true },
  { key: 'phone', label: 'Telefon', editable: true },
  { key: 'officeLocation', label: 'Standort', editable: true },
  { key: 'city', label: 'Stadt', editable: true },
  { key: 'customAttribute2', label: 'CustomAttribute2', editable: true },
];

const COLUMN_LABELS: Record<string, string> = {};
COLUMNS.forEach((c) => { COLUMN_LABELS[c.key] = c.label; });

/* filterable columns */
const FILTER_KEYS = ['department', 'companyName', 'officeLocation', 'jobTitle', 'city'] as const;

const FILTER_LABELS: Record<string, string> = {
  department: 'Abteilung',
  companyName: 'Firma',
  officeLocation: 'Standort',
  jobTitle: 'Position',
  city: 'Stadt',
};

/* ─── helpers ─────────────────────────────────────── */
function getCellValue(user: Employee, key: string): string {
  if (key === 'phone') return user.businessPhones?.[0] || user.mobilePhone || '';
  if (key === 'customAttribute2') return user.onPremisesExtensionAttributes?.extensionAttribute2 || '';
  return (user as any)[key] || '';
}

/* ─── pending change type ─────────────────────────── */
interface PendingChange {
  userId: string;
  key: string;
  userName: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

/* ─── props ───────────────────────────────────────── */
interface UserDirectoryProps {
  onEmployeeSelected: (employee: Employee) => void;
  refreshKey?: number;
}

/* ═══════════════════════════════════════════════════ */
export default function UserDirectory({ onEmployeeSelected, refreshKey }: UserDirectoryProps) {
  const { accounts } = useMsal();
  const [users, setUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});

  /* inline edit state */
  const [editCell, setEditCell] = useState<{ userId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── fetch users ─────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/graph/list-users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Fehler');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  /* ── progressive photo loading ──────────────────── */
  useEffect(() => {
    if (users.length === 0) return;
    let cancelled = false;
    const BATCH = 5;

    async function loadPhotos() {
      for (let i = 0; i < users.length; i += BATCH) {
        if (cancelled) break;
        const batch = users.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (u) => {
            try {
              const res = await fetch(`/api/graph/user-photo?id=${u.id}`);
              if (!res.ok) return { id: u.id, url: '' };
              const data = await res.json();
              return { id: u.id, url: data.photoUrl || '' };
            } catch {
              return { id: u.id, url: '' };
            }
          })
        );
        if (cancelled) break;
        setPhotos((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value.url) {
              next[r.value.id] = r.value.url;
            }
          }
          return next;
        });
      }
    }

    loadPhotos();
    return () => { cancelled = true; };
  }, [users]);

  /* ── filter options ─────────────────────────────── */
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const fk of FILTER_KEYS) {
      const set = new Set<string>();
      for (const u of users) {
        const v = (u as any)[fk];
        if (v) set.add(v);
      }
      opts[fk] = Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
    }
    return opts;
  }, [users]);

  /* ── apply search + filters ─────────────────────── */
  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.mail?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.jobTitle?.toLowerCase().includes(q) ||
        u.companyName?.toLowerCase().includes(q) ||
        u.officeLocation?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q) ||
        u.userPrincipalName?.toLowerCase().includes(q) ||
        u.givenName?.toLowerCase().includes(q) ||
        u.surname?.toLowerCase().includes(q)
      );
    }

    for (const [key, val] of Object.entries(filters)) {
      if (val) {
        result = result.filter((u) => (u as any)[key] === val);
      }
    }

    return result;
  }, [users, search, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  /* ── inline edit handlers ───────────────────────── */
  const startEdit = (userId: string, key: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setEditCell({ userId, key });
    setEditValue(getCellValue(user, key));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditCell(null);
    setEditValue('');
  };

  /** Called on Enter/blur — shows confirmation popup instead of saving directly */
  const requestSave = () => {
    if (!editCell) return;
    const { userId, key } = editCell;
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const oldValue = getCellValue(user, key);
    if (editValue === oldValue) { cancelEdit(); return; }

    // show confirmation popup
    setPendingChange({
      userId,
      key,
      userName: user.displayName || user.mail || user.id,
      fieldLabel: COLUMN_LABELS[key] || key,
      oldValue: oldValue || '—',
      newValue: editValue || '—',
    });
  };

  /** Actually save after user confirms */
  const confirmSave = async () => {
    if (!pendingChange) return;
    const { userId, key, oldValue, newValue, userName, fieldLabel } = pendingChange;

    setSaving(true);
    try {
      let updates: Record<string, any> = {};
      if (key === 'phone') {
        updates = { businessPhones: [editValue] };
      } else if (key === 'customAttribute2') {
        updates = {
          onPremisesExtensionAttributes: {
            extensionAttribute2: editValue || null,
          },
        };
      } else {
        updates = { [key]: editValue };
      }

      const res = await fetch('/api/graph/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Fehler beim Speichern');
      }

      // update local state in-place
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (key === 'phone') return { ...u, businessPhones: [editValue] };
          if (key === 'customAttribute2') {
            return {
              ...u,
              onPremisesExtensionAttributes: {
                ...u.onPremisesExtensionAttributes,
                extensionAttribute2: editValue || null,
              },
            };
          }
          return { ...u, [key]: editValue };
        })
      );

      // log to audit trail
      fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changedBy: accounts[0]?.username || 'unknown',
          employeeId: userId,
          employeeName: userName,
          changes: {
            [fieldLabel]: {
              old: oldValue === '—' ? '' : oldValue,
              new: newValue === '—' ? '' : newValue,
            },
          },
          status: 'success',
          editType: 'single',
        }),
      }).catch(() => { /* audit log failure is non-blocking */ });

      cancelEdit();
      setPendingChange(null);
    } catch (err: any) {
      alert(err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const cancelConfirm = () => {
    setPendingChange(null);
    // keep edit cell open so user can adjust
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); requestSave(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const handleBlur = () => {
    // small delay so clicks on confirm button register first
    setTimeout(() => {
      if (!pendingChange) requestSave();
    }, 150);
  };

  /* ── clear all filters ──────────────────────────── */
  const clearFilters = () => {
    setSearch('');
    setFilters({});
  };

  /* ── render ──────────────────────────────────────── */
  return (
    <div className={dirStyles.directorySection}>
      {/* confirmation popup */}
      {pendingChange && (
        <div className={dirStyles.confirmOverlay}>
          <div className={dirStyles.confirmBox}>
            <h3 className={dirStyles.confirmTitle}>Änderung bestätigen</h3>
            <p className={dirStyles.confirmUser}>{pendingChange.userName}</p>

            <div className={dirStyles.confirmDetail}>
              <div className={dirStyles.confirmField}>{pendingChange.fieldLabel}</div>
              <div className={dirStyles.confirmDiff}>
                <span className={dirStyles.confirmOld}>{pendingChange.oldValue}</span>
                <span className={dirStyles.confirmArrow}>→</span>
                <span className={dirStyles.confirmNew}>{pendingChange.newValue}</span>
              </div>
            </div>

            <div className={dirStyles.confirmActions}>
              <button
                className={dirStyles.confirmCancelBtn}
                onClick={cancelConfirm}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                className={dirStyles.confirmSaveBtn}
                onClick={confirmSave}
                disabled={saving}
              >
                {saving ? '⏳ Speichern…' : '✔ Bestätigen & Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className={dirStyles.toolbar}>
        <div className={dirStyles.searchBox}>
          <span className={dirStyles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Suchen (Name, E-Mail, Abteilung …)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={dirStyles.searchInput}
            autoComplete="off"
          />
        </div>

        <div className={dirStyles.filterRow}>
          {FILTER_KEYS.map((fk) => (
            <select
              key={fk}
              value={filters[fk] || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, [fk]: e.target.value }))}
              className={dirStyles.filterSelect}
            >
              <option value="">{FILTER_LABELS[fk]}</option>
              {filterOptions[fk]?.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ))}

          {activeFilterCount > 0 && (
            <button className={dirStyles.clearBtn} onClick={clearFilters} title="Alle Filter löschen">
              ✕ Filter ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className={dirStyles.loadingBar}>Mitarbeiterdaten werden geladen…</div>
      )}
      {error && <div className={dirStyles.errorBar}>{error}</div>}

      {!loading && users.length > 0 && (
        <>
          <div className={dirStyles.tableWrapper}>
            <table className={dirStyles.table}>
              <thead>
                <tr>
                  <th style={{ width: '36px' }}></th>
                  {COLUMNS.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className={dirStyles.row}>
                    <td>
                      <div
                        className={dirStyles.miniAvatar}
                        onClick={() => onEmployeeSelected(user)}
                        title="Profil öffnen"
                      >
                        {photos[user.id] ? (
                          <img src={photos[user.id]} alt="" />
                        ) : (
                          user.displayName?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                    </td>

                    {COLUMNS.map((col) => {
                      const isEditing = editCell?.userId === user.id && editCell?.key === col.key;
                      const value = getCellValue(user, col.key);

                      if (isEditing) {
                        return (
                          <td key={col.key} className={dirStyles.editingCell}>
                            <input
                              ref={inputRef}
                              className={dirStyles.cellInput}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={handleBlur}
                              disabled={saving}
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className={col.editable ? dirStyles.editableCell : undefined}
                          onClick={() => col.editable ? startEdit(user.id, col.key) : undefined}
                          title={col.editable ? 'Klicken zum Bearbeiten' : undefined}
                        >
                          {value || <span className={dirStyles.empty}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className={dirStyles.noResults}>
                      Keine Mitarbeiter gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={dirStyles.rowCount}>
            {filtered.length} von {users.length} Mitarbeitern
          </div>
        </>
      )}
    </div>
  );
}
