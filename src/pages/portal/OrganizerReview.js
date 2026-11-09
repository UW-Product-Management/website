import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ManageAdminsPanel from '../../components/portal/ManageAdminsPanel';
import PortalHeader from '../../components/portal/PortalHeader';
import ReleaseResultsPanel from '../../components/portal/ReleaseResultsPanel';
import ReviewTable from '../../components/portal/ReviewTable';
import { usePortal } from '../../context/PortalContext';
import {
  STATUS_LABELS,
  isConfirmedAttendee,
} from '../../portal/applicationStatus';
import { applicationsToCsv } from '../../portal/applicationsCsv';
import {
  listApplicationsForReview,
  listReviewHistory,
  reviewApplication,
} from '../../services/portalApi';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalReview.css';

export default function OrganizerReview() {
  const { event, status } = usePortal();
  const eventId = event?.id;
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    const { data, error } = await listApplicationsForReview(eventId);
    if (error) setErrorMessage(error.message);
    setApplications(data || []);
    setIsLoading(false);
  }, [eventId]);

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

  const confirmedApplications = useMemo(
    () => applications.filter(isConfirmedAttendee),
    [applications],
  );

  const filters = useMemo(() => {
    const countOf = (status) =>
      applications.filter((a) => a.status === status).length;
    return [
      { key: 'all', label: 'All Applications', count: applications.length },
      { key: 'rejected', label: 'Not Selected', count: countOf('rejected') },
      { key: 'waitlisted', label: 'Waitlisted', count: countOf('waitlisted') },
      {
        key: 'accepted',
        label: 'Accepted Participants',
        count: countOf('accepted'),
      },
      {
        key: 'confirmed',
        label: 'Confirmed Attending',
        count: confirmedApplications.length,
      },
    ];
  }, [applications, confirmedApplications]);

  const visibleApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    if (statusFilter === 'confirmed') return confirmedApplications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, confirmedApplications, statusFilter]);

  const handleDecide = useCallback(async (applicationId, decision, note) => {
    setPendingId(applicationId);
    setErrorMessage('');
    const { data, error } = await reviewApplication(
      applicationId,
      decision,
      note,
    );
    if (error) {
      setErrorMessage(error.message);
      setPendingId(null);
      return false;
    }
    const { data: reviews } = await listReviewHistory(applicationId);
    setApplications((current) =>
      current.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: data.status,
              reviewedAt: data.reviewedAt,
              reviewedBy: data.reviewedBy,
              reviews,
            }
          : a,
      ),
    );
    setPendingId(null);
    return true;
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

        {eventId && (
          <ReleaseResultsPanel event={event} onReleased={loadApplications} />
        )}

        <ManageAdminsPanel />

        <div className="portal-review__actions">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`portal-button ${
                statusFilter === filter.key
                  ? 'portal-button--primary'
                  : 'portal-button--outline'
              }`}
              aria-pressed={statusFilter === filter.key}
              onClick={() => {
                setStatusFilter(filter.key);
                setSelectedId(null);
              }}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        <div className="portal-review__toolbar">
          <label htmlFor="review-status-filter">
            Status
            <select
              id="review-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed attending</option>
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
            selectedId={selectedId}
            onSelect={setSelectedId}
            pendingId={pendingId}
            onDecide={handleDecide}
            onCloseDetail={() => setSelectedId(null)}
          />
        )}
      </section>
    </main>
  );
}
