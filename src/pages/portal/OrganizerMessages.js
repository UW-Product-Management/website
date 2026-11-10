import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmailComposer from '../../components/portal/EmailComposer';
import EmailSendControls from '../../components/portal/EmailSendControls';
import PortalHeader from '../../components/portal/PortalHeader';
import RecipientFilters from '../../components/portal/RecipientFilters';
import RecipientPreview from '../../components/portal/RecipientPreview';
import { usePortal } from '../../context/PortalContext';
import { countByGroup, filterAudience } from '../../portal/emailRecipients';
import { templateForGroup } from '../../portal/emailTemplates';
import { listEmailAudience } from '../../services/portalApi';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalTheme.css';
import '../../styles/portal/PortalMessages.css';

export default function OrganizerMessages() {
  const { event, status } = usePortal();
  const eventId = event?.id;
  const confirmBy = event?.confirm_by ?? null;
  const [audience, setAudience] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!eventId) {
      if (status === 'ready') setIsLoading(false);
      return undefined;
    }
    let mounted = true;
    listEmailAudience(eventId, { confirmBy }).then(({ data, error }) => {
      if (!mounted) return;
      if (error) setErrorMessage(error.message);
      setAudience(data);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [eventId, confirmBy, status]);

  const counts = useMemo(() => countByGroup(audience), [audience]);
  const recipients = useMemo(
    () => filterAudience(audience, [selectedGroup]),
    [audience, selectedGroup],
  );

  // A suggested message only fills an empty composer, so switching groups
  // never throws away something the organizer has started writing.
  const handleGroupChange = (group) => {
    setSelectedGroup(group);
    const template = templateForGroup(group, event);
    if (template && !subject.trim() && !body.trim()) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSent = () => {
    setSubject('');
    setBody('');
  };

  return (
    <main className="portal-page portal-messages">
      <PortalHeader />
      <section className="portal-messages__content">
        <Link to="/portal/admin" className="portal-messages__back">
          ← Back to review
        </Link>
        <h1 className="portal-messages__title">Email applicants</h1>
        <p className="portal-messages__intro">
          Pick a group, write your message, and send yourself a test before it
          goes out.
        </p>

        {errorMessage && (
          <div className="portal-apply__error" role="alert">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p role="status">Loading recipients...</p>
        ) : !eventId ? (
          <p role="alert">
            Unable to load event details. Please verify the configured event
            slug.
          </p>
        ) : (
          <div className="portal-messages__layout">
            <section
              className="portal-messages__card"
              aria-labelledby="recipients-heading"
            >
              <h2 id="recipients-heading">Recipients</h2>
              <RecipientFilters
                counts={counts}
                selectedGroup={selectedGroup}
                onChange={handleGroupChange}
                disabled={isSending}
              />
              <RecipientPreview recipients={recipients} />
            </section>
            <section
              className="portal-messages__card"
              aria-labelledby="compose-heading"
            >
              <h2 id="compose-heading">Compose</h2>
              <EmailComposer
                subject={subject}
                body={body}
                onSubjectChange={setSubject}
                onBodyChange={setBody}
                disabled={isSending}
              />
              <EmailSendControls
                eventId={eventId}
                recipients={recipients}
                subject={subject}
                body={body}
                onSent={handleSent}
                onBusyChange={setIsSending}
              />
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
