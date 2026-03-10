import { useMsal } from '@azure/msal-react';
import { ReactNode } from 'react';
import styles from '../styles/dashboard.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { instance, accounts } = useMsal();
  const user = accounts[0];

  const initial = user?.name?.charAt(0).toUpperCase() || '?';

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
       <div className={styles.headerBrand}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src="/pcs_beratungscontor_ag_logo.jpg"
    style={{ height: '32px', width: 'auto', borderRadius: '4px' }}
  />
  <h1 className={styles.headerTitle}>
    Azure<span>Admin</span>
  </h1>
</div>
          <div className={styles.userInfo}>
            {user && (
              <>
                <span className={styles.userName}>{user.name}</span>
                <div className={styles.userAvatar}>{initial}</div>
              </>
            )}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={styles.container}>{children}</main>
    </div>
  );
}
