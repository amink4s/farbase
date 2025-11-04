import AdminAccounts from "../../../components/AdminAccounts";

export const metadata = {
  title: "Admin — Accounts",
};

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Admin: Accounts</h1>
      <p style={{ marginTop: 0 }}>Manage admin accounts (promote / demote).</p>
      <AdminAccounts />
    </main>
  );
}
