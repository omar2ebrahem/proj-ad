import React, { useState, useEffect, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import Head from 'next/head';
import { useRouter } from 'next/router';
import EmployeeSearch from '../components/EmployeeSearch';
import BulkUpdateSelected from '../components/BulkUpdateSelected';
import EmployeeForm from '../components/EmployeeForm';
import Layout from '../components/Layout';
import { Employee } from '../lib/types';
import styles from '../styles/dashboard.module.css';

export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts, inProgress } = useMsal();
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && inProgress === InteractionStatus.None) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, inProgress]);

  const checkAccess = async () => {
    try {
      const account = accounts[0];
      if (!account) return;

      const response = await instance.acquireTokenSilent({
        scopes: ['User.Read'],
        account,
      });

      const accessCheckResponse = await fetch('/api/auth/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: response.accessToken }),
      });

      const accessData = await accessCheckResponse.json();
      setHasAccess(accessData.hasAccess);
      if (!accessData.hasAccess) {
        setAccessError('Sie sind kein Mitglied der erforderlichen Sicherheitsgruppe für den Zugriff auf dieses Dashboard.');
      }
    } catch {
      setAccessError('Überprüfung Ihrer Zugriffsrechte fehlgeschlagen. Bitte melden Sie sich erneut an.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Callback from EmployeeForm when user data is refreshed after a save.
   * Keeps dashboard state in sync with the latest server data.
   */
  const handleEmployeeRefreshed = useCallback((refreshed: Employee) => {
    setSelectedEmployee(refreshed);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Ihre Zugangsberechtigungen werden überprüft...</p>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <div className={styles.accessDenied}>
            <div className={styles.accessDeniedIcon}>🚫</div>
            <h2>Zugriff verweigert</h2>
            <p>{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard — Mitarbeiter-Portal</title>
        <meta name="description" content="Verwalten Sie Mitarbeiterprofile in Microsoft Entra ID." />
      </Head>
      <Layout>
        <div className={styles.dashboardHeader}>
          <h1>Mitarbeiterverzeichnis</h1>
          <p>Suchen Sie nach einem Mitarbeiter und aktualisieren Sie sein Profil in Microsoft Entra ID</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            <EmployeeSearch onEmployeeSelected={setSelectedEmployee} />
            <BulkUpdateSelected />
          </div>
          <div className={styles.main}>
            {selectedEmployee ? (
              <EmployeeForm
                key={selectedEmployee.id}
                employee={selectedEmployee}
                onEmployeeRefreshed={handleEmployeeRefreshed}
              />
            ) : (
              <div className={styles.placeholder}>
                <i className={styles.placeholderIcon}>👥</i>
                <h3>Mitarbeiter auswählen</h3>
                <p>Suchen Sie links nach einem Mitarbeiter, um dessen Profil anzuzeigen und zu bearbeiten.</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}