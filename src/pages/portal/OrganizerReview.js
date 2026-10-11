import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import ReviewTable from '../../components/portal/ReviewTable';
import { usePortal } from '../../context/PortalContext';
import { STATUS_LABELS } from '../../portal/applicationStatus';
import { applicationsToCsv } from '../../portal/applicationsCsv';
import {
  listApplicationsForReview,
  reviewApplication,
} from '../../services/portalApi';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalReview.css';

export default function OrganizerReview() {
  const { event, status } = usePortal();
  const eventId = event?.id;
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingId, setPendingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      if (status === 'ready') {
        setIsLoading(false);
      }
      return undefined;
    }
    let mounted = true;
    listApplicationsForReview(eventId).then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErrorMessage(error.message);
      setApplications(data || []);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [eventId, status]);

  const visibleApplications = useMemo(
    () =>
      statusFilter === 'all'
        ? applications
        : applications.filter((a) => a.status === statusFilter),
    [applications, statusFilter],
  );

  const handleDecide = useCallback(async (applicationId, decision) => {
    setPendingId(applicationId);
    setErrorMessage('');
    const { data, error } = await reviewApplication(applicationId, decision);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setApplications((current) =>
        current.map((a) =>
          a.id === applicationId
            ? { ...a, status: data.status, reviewedAt: data.reviewedAt }
            : a,
        ),
      );
    }
    setPendingId(null);
  }, []);

  const handleExport = () => {
    const blob = new Blob([applicationsToCsv(visibleApplications)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event?.slug || 'applications'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="portal-page portal-review">
      <PortalHeader />
      <section className="portal-review__content">
        <h1>Review applications</h1>
        <p>
          <Link to="/portal/dashboard">Back to dashboard</Link>
        </p>

        {errorMessage && (
          <div className="portal-apply__error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="portal-review__toolbar">
          <label htmlFor="review-status-filter">
            Status
            <select
              id="review-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              {Object.entries(STATUS_LABELS)
                .filter(([key]) => key !== 'draft')
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="portal-button portal-button--primary"
            onClick={handleExport}
            disabled={visibleApplications.length === 0}
          >
            Export CSV
          </button>
        </div>

        {isLoading ? (
          <p role="status">Loading applications...</p>
        ) : !eventId ? (
          <p role="alert">
            Unable to load event details. Please verify the configured event
            slug.
          </p>
        ) : visibleApplications.length === 0 ? (
          <p>No applications to show.</p>
        ) : (
          <ReviewTable
            applications={visibleApplications}
            pendingId={pendingId}
            onDecide={handleDecide}
          />
        )}
      </section>
    </main>
  );
}
