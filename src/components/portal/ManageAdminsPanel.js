import React, { useCallback, useEffect, useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import {
  addOrganizer,
  listOrganizers,
  removeOrganizer,
} from '../../services/portalApi';

export default function ManageAdminsPanel() {
  const { user } = usePortal();
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await listOrganizers();
    if (error) setErrorMessage(error.message);
    else setAdmins(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');
    const { error } = await addOrganizer(email);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setNotice(`${email.trim()} is now an admin.`);
      setEmail('');
      await refresh();
    }
    setIsBusy(false);
  };

  const handleRemove = async (admin) => {
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');
    const { error } = await removeOrganizer(admin.userId);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setNotice(`${admin.email} is no longer an admin.`);
      await refresh();
    }
    setIsBusy(false);
  };

  return (
    <section className="portal-admins" aria-labelledby="admins-heading">
      <h2 id="admins-heading">Admins</h2>
      <p className="portal-review__muted">
        Admins can review applications and send results. Someone must already
        have a portal account before you can make them an admin.
      </p>

      <form className="portal-admins__form" onSubmit={handleAdd}>
        <label htmlFor="admin-email">
          Email
          <input
            id="admin-email"
            type="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="portal-button portal-button--primary"
          disabled={isBusy || email.trim() === ''}
        >
          Add admin
        </button>
      </form>

      <ul className="portal-admins__list">
        {admins.map((admin) => (
          <li key={admin.userId} className="portal-admins__item">
            <span>
              {admin.fullName && <strong>{admin.fullName} </strong>}
              {admin.email}
            </span>
            {admin.userId !== user?.id && (
              <button
                type="button"
                className="portal-button portal-button--outline"
                disabled={isBusy}
                onClick={() => handleRemove(admin)}
                aria-label={`Remove ${admin.email}`}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {notice && <p role="status">{notice}</p>}
      {errorMessage && (
        <p role="alert" className="portal-apply__error">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
