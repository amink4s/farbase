import AdminAirdrop from '../../../components/AdminAirdrop';

export const metadata = {
  title: 'Admin — Airdrop',
};

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Admin: Airdrop Export</h1>
      <p style={{ marginTop: 0 }}>Export user point totals for airdrop allocation (requires admin access).</p>
      <AdminAirdrop />
    </main>
  );
}
