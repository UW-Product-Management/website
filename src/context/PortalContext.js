import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const defaultState = {
  account: { fullName: '', email: '' },
  application: {
    program: '',
    yearOfStudy: '',
    answers: { productIdea: '', greatTeam: '' },
    consent: { mediaConsent: false, dietaryRestrictions: '', specify: '' },
  },
  submittedAt: null,
};

export const PortalContext = createContext(null);

export function PortalProvider({ children, value: customValue }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setSession(null);
        } else {
          setSession(data?.session ?? null);
        }
        setStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setStatus('ready');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setStatus('ready');
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const updateAccount = (fields) => {
    setState((prev) => ({
      ...prev,
      account: { ...prev.account, ...fields },
    }));
  };

  const updateApplication = (fields) => {
    setState((prev) => ({
      ...prev,
      application: { ...prev.application, ...fields },
    }));
  };

  const submitApplication = () => {
    setState((prev) => ({
      ...prev,
      submittedAt: new Date().toISOString(),
    }));
  };

  const logOut = async () => {
    setState(defaultState);
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;

  const contextValue = customValue || {
    session,
    user,
    status,
    state,
    updateAccount,
    updateApplication,
    submitApplication,
    logOut,
  };

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}
