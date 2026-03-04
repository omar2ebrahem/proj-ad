import { useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/dashboard.module.css';

export default function Home() {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Use MSAL's built-in status to determine if we are currently loading/interacting
  const isLoading = inProgress !== InteractionStatus.None;

  useEffect(() => {
    // Only redirect if authenticated and MSAL has finished all interactions
    if (isAuthenticated && inProgress === InteractionStatus.None) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, inProgress, router]);

  const handleLogin = () => {
    setError(null);
    instance.loginRedirect({
      scopes: ['User.Read', 'profile', 'openid', 'email'],
    });
  };

  return (
    <>
      <Head>
        <title>Employee Admin Dashboard — Microsoft Entra ID</title>
        <meta name="description" content="Manage employee profiles in Microsoft Entra ID using Microsoft Graph API." />
      </Head>

      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>
            <div className={styles.loginLogoIcon}>🏢</div>
            <h1 className={styles.loginTitle}>AzureAdmin</h1>
          </div>

          <p className={styles.loginSubtitle}>
            HR & IT administration portal for Microsoft Entra ID employee profile management.
          </p>

          <div className={styles.loginFeatures}>
            <div className={styles.loginFeature}>
              <span>👤</span>
              <span>Manage personal & work information</span>
            </div>
            <div className={styles.loginFeature}>
              <span>🏗️</span>
              <span>Update manager relationships in real-time</span>
            </div>
            <div className={styles.loginFeature}>
              <span>📋</span>
              <span>Full audit trail of all changes</span>
            </div>
            <div className={styles.loginFeature}>
              <span>🔐</span>
              <span>Security group access control</span>
            </div>
          </div>

          {error && <div className={styles.loginError}>{error}</div>}

          <button
            className={styles.loginButton}
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>⏳ Signing in...</>
            ) : (
              <>🔐 Sign in with Microsoft</>
            )}
          </button>

          <p className={styles.loginFooter}>
            Secured by Microsoft Entra ID · HR &amp; IT access only
          </p>
        </div>
      </div>
    </>
  );
}