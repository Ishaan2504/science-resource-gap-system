import { FormEvent, useState } from 'react';
import { api, apiMode } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import type { AdminUser, Role } from '../types';
import {
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovField,
  GovPageHeader,
  GovPagination,
  GovTable,
  inputCls,
  CardHeader,
  CardBody,
} from '../components/GovUI';

export function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const users = useAsync(() => api.admin.users({ page, page_size: 10, search }), [page, search]);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('FIELD_COORDINATOR');

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.admin.createUser({ email, full_name: fullName, password, role });
      setMsg(`Account created successfully for ${email}.`);
      setShowForm(false);
      setEmail('');
      setFullName('');
      setPassword('');
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The account could not be created.');
    }
  }

  async function toggle(row: AdminUser) {
    setError('');
    setMsg('');
    try {
      await api.admin.updateUser(row.user_id, { is_active: !row.is_active });
      setMsg(`Account ${row.email} was ${row.is_active ? 'deactivated' : 'activated'}.`);
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The account status could not be updated.');
    }
  }

  return (
    <>
      <GovPageHeader
        title="User & Access Management"
        description="Provision and administer authorised administrator and field coordinator portal accounts."
        actions={
          <GovButton
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => setShowForm((o) => !o)}
          >
            {showForm ? 'Close form' : '+ Create account'}
          </GovButton>
        }
      />

      {apiMode === 'live' && (
        <GovAlert tone="info" className="mb-4">
          School official and organisation accounts are enrolled via public role registration. This console manages internal administration and field verification personnel.
        </GovAlert>
      )}

      {msg && <GovAlert tone="success" className="mb-4">{msg}</GovAlert>}
      {error && <GovAlert tone="error" className="mb-4">{error}</GovAlert>}

      {/* Account Creation Panel */}
      {showForm && (
        <GovCard className="mb-5" as="div">
          <CardHeader
            title="Create Institutional Account"
            subtitle="Credentials are issued under Ministry IT security and audit governance"
          />
          <CardBody>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GovField label="Full Name" htmlFor="user-name" required>
                  <input
                    id="user-name"
                    required
                    className={inputCls}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                  />
                </GovField>
                <GovField label="Official Email Address" htmlFor="user-email" required>
                  <input
                    id="user-email"
                    type="email"
                    required
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. officer@gov.in"
                  />
                </GovField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GovField
                  label="Initial Password"
                  htmlFor="user-password"
                  hint="Must be at least 10 characters, with uppercase, lowercase, and numbers."
                  required
                >
                  <input
                    id="user-password"
                    type="password"
                    minLength={10}
                    required
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </GovField>
                <GovField label="Assigned System Role" htmlFor="user-role" required>
                  <select
                    id="user-role"
                    className={inputCls}
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                  >
                    <option value="SCHOOL">School Administrator</option>
                    <option value="NGO">NGO / CSR Partner</option>
                    <option value="FIELD_COORDINATOR">Field Coordinator (District Inspections)</option>
                    <option value="ADMIN">System Administrator (Full Oversight)</option>
                  </select>
                </GovField>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e7eb]">
                <GovButton variant="secondary" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </GovButton>
                <GovButton variant="primary" type="submit">
                  Issue Credentials & Create Account
                </GovButton>
              </div>
            </form>
          </CardBody>
        </GovCard>
      )}

      {/* Account Search */}
      <GovCard className="mb-5" as="div">
        <CardBody>
          <GovField label="Search Accounts by Name or Email" htmlFor="user-search">
            <input
              id="user-search"
              className={inputCls}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Enter name or email address..."
            />
          </GovField>
        </CardBody>
      </GovCard>

      {/* Accounts Table */}
      {users.error && <GovAlert tone="error" className="mb-4">{users.error}</GovAlert>}
      <GovCard>
        <GovTable<AdminUser>
          rows={users.data?.data ?? []}
          rowKey={(r) => r.user_id}
          columns={[
            { key: 'full_name', label: 'User Name' },
            { key: 'email', label: 'Email Address' },
            {
              key: 'role',
              label: 'Role',
              render: (r) => (
                <span className="text-xs font-semibold uppercase text-[#1e3a5f]">
                  {r.role.replace(/_/g, ' ')}
                </span>
              ),
            },
            {
              key: 'is_active',
              label: 'Account Status',
              render: (r) => (
                <GovBadge value={r.is_active ? 'VERIFIED' : 'REJECTED'} />
              ),
            },
            {
              key: 'action',
              label: 'Actions',
              render: (r) => (
                <GovButton
                  size="sm"
                  variant={r.is_active ? 'danger' : 'secondary'}
                  onClick={() => toggle(r)}
                >
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </GovButton>
              ),
            },
          ]}
          emptyText="No user accounts match your search criteria."
        />
        <GovPagination
          page={page}
          pageSize={10}
          total={users.data?.total_count ?? 0}
          onChange={setPage}
        />
      </GovCard>
    </>
  );
}
