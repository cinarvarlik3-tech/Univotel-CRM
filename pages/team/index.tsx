/**
 * Team page — read-only salespeople list.
 */
import { AppShell } from '@/components/layout/AppShell';
import { useSalespeople } from '@/hooks/useSalespeople';

/**
 * Renders read-only team member table.
 * @returns Team page wrapped in AppShell.
 */
export default function TeamPage() {
  const { data, error, isLoading } = useSalespeople();

  return (
    <AppShell>
      <h1>Team</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p className="error">Failed to load team</p>}

      {data && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sp) => (
              <tr key={sp.id}>
                <td>{sp.full_name}</td>
                <td>{sp.email}</td>
                <td>{sp.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
