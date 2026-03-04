import { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import Head from 'next/head';
import EmployeeSearch from '../components/EmployeeSearch';
import EmployeeForm from '../components/EmployeeForm';
import Layout from '../components/Layout';
import { Employee } from '../lib/types';
import styles from '../styles/dashboard.module.css';

export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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
        setAccessError('You are not a member of the required security group to access this dashboard.');
      }
    } catch {
      setAccessError('Failed to verify your access permissions. Please try signing in again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Verifying your access...</p>
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
            <h2>Access Denied</h2>
            <p>{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard — AzureAdmin</title>
        <meta name="description" content="Manage employee profiles in Microsoft Entra ID." />
      </Head>
      <Layout>
        <div className={styles.dashboardHeader}>
          <h1>Employee Directory</h1>
          <p>Search for an employee and update their profile in Microsoft Entra ID</p>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            <EmployeeSearch onEmployeeSelected={setSelectedEmployee} />
          </div>
          <div className={styles.main}>
            {selectedEmployee ? (
              <EmployeeForm
                key={selectedEmployee.id}
                employee={selectedEmployee}
              />
            ) : (
              <div className={styles.placeholder}>
                <div className={styles.placeholderIcon}>👈</div>
                <h3>No Employee Selected</h3>
                <p>Use the search panel to find an employee and manage their profile.</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}