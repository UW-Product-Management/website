import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  getEvent,
  getProfile,
  updateProfile as apiUpdateProfile,
  getMyApplication,
  saveApplicationDraft as apiSaveApplicationDraft,
  submitApplication as apiSubmitApplication,
  sendApplicationReceivedEmail,
} from '../services/portalApi';

const DEFAULT_EVENT_SLUG =
  process.env.REACT_APP_PORTAL_EVENT_SLUG || 'prodcon-local';

const defaultApplication = {
  id: null,
  program: '',
  yearOfStudy: '',
  productIdea: '',
  greatTeam: '',
  mediaConsent: false,
  dietaryRestriction: '',
  dietaryRestrictions: '',
  dietaryDetails: '',
  specify: '',
  status: 'draft',
  submittedAt: null,
  answers: { productIdea: '', greatTeam: '' },
  consent: { mediaConsent: false, dietaryRestrictions: '', specify: '' },
};

export const PortalContext = createContext(null);

export function PortalProvider({ children, value: customValue }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function initializePortal() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        const currentSession = error ? null : data?.session ?? null;
        setSession(currentSession);

        if (currentSession?.user) {
          let loadedEvent = null;
          const { data: eventData } = await getEvent(DEFAULT_EVENT_SLUG);
          if (mounted && eventData) {
            loadedEvent = eventData;
            setEvent(eventData);
          }

          const { data: profileData } = await getProfile(
            currentSession.user.id,
          );
          if (mounted) {
            setProfile(
              profileData || {
                id: currentSession.user.id,
                fullName: currentSession.user.user_metadata?.full_name || '',
              },
            );
          }

          if (loadedEvent?.id) {
            const { data: appData } = await getMyApplication(
              loadedEvent.id,
              currentSession.user.id,
            );
            if (mounted) {
              setApplication(appData ?? null);
            }
          }
        } else if (mounted) {
          setProfile(null);
          setApplication(null);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setApplication(null);
        }
      } finally {
        if (mounted) {
          setStatus('ready');
        }
      }
    }

    initializePortal();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);

      if (nextSession?.user) {
        (async () => {
          let eventId = event?.id;
          if (!eventId) {
            const { data: eventData } = await getEvent(DEFAULT_EVENT_SLUG);
            if (mounted && eventData) {
              setEvent(eventData);
              eventId = eventData.id;
            }
          }
          const [profileRes, appRes] = await Promise.all([
            getProfile(nextSession.user.id),
            eventId
              ? getMyApplication(eventId, nextSession.user.id)
              : Promise.resolve({ data: null }),
          ]);
          if (!mounted) return;
          if (profileRes?.data) setProfile(profileRes.data);
          if (appRes?.data) setApplication(appRes.data);
          setStatus('ready');
        })().catch(() => {
          if (mounted) setStatus('ready');
        });
      } else {
        setProfile(null);
        setApplication(null);
        setStatus('ready');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const saveDraft = useCallback(
    async (fields) => {
      let currentEvent = event;
      if (!currentEvent?.id) {
        const { data: eventData } = await getEvent(DEFAULT_EVENT_SLUG);
        if (eventData) {
          currentEvent = eventData;
          setEvent(eventData);
        }
      }

      const result = await apiSaveApplicationDraft({
        applicationId: application?.id,
        eventId: currentEvent?.id,
        fields,
      });

      if (!result.error && result.data) {
        setApplication(result.data);
      }
      return result;
    },
    [application?.id, event],
  );

  const handleUpdateProfile = useCallback(async ({ fullName }) => {
    const result = await apiUpdateProfile({ fullName });
    if (!result.error && result.data) {
      setProfile(result.data);
    }
    return result;
  }, []);

  const handleSubmitApplication = useCallback(async () => {
    const appId = application?.id;
    if (!appId) {
      return {
        data: null,
        error: { message: 'No application found to submit' },
      };
    }

    const result = await apiSubmitApplication(appId);
    if (!result.error && result.data) {
      setApplication(result.data);
      // The application is already submitted; a failed email must not undo that.
      sendApplicationReceivedEmail().catch(() => {});
    }
    return result;
  }, [application?.id]);

  const refreshPortalData = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data: profileData } = await getProfile(session.user.id);
      if (profileData) setProfile(profileData);

      let currentEvent = event;
      if (!currentEvent?.id) {
        const { data: eventData } = await getEvent(DEFAULT_EVENT_SLUG);
        if (eventData) {
          currentEvent = eventData;
          setEvent(eventData);
        }
      }

      if (currentEvent?.id) {
        const { data: appData } = await getMyApplication(
          currentEvent.id,
          session.user.id,
        );
        setApplication(appData ?? null);
      }
    } catch {}
  }, [session?.user, event]);

  const logOut = useCallback(async () => {
    setProfile(null);
    setApplication(null);
    await supabase.auth.signOut();
  }, []);

  const updateAccount = useCallback((fields) => {
    if (fields.fullName !== undefined) {
      setProfile((prev) => ({
        ...(prev || {}),
        fullName: fields.fullName,
      }));
    }
  }, []);

  const updateApplication = useCallback((fields) => {
    setApplication((prev) => {
      const current = prev || defaultApplication;
      const merged = { ...current, ...fields };
      if (fields.answers) {
        merged.answers = { ...current.answers, ...fields.answers };
        if (fields.answers.productIdea !== undefined) {
          merged.productIdea = fields.answers.productIdea;
        }
        if (fields.answers.greatTeam !== undefined) {
          merged.greatTeam = fields.answers.greatTeam;
        }
      }
      if (fields.consent) {
        merged.consent = { ...current.consent, ...fields.consent };
        if (fields.consent.mediaConsent !== undefined) {
          merged.mediaConsent = fields.consent.mediaConsent;
        }
        if (fields.consent.dietaryRestrictions !== undefined) {
          merged.dietaryRestrictions = fields.consent.dietaryRestrictions;
          merged.dietaryRestriction = fields.consent.dietaryRestrictions;
        }
        if (fields.consent.specify !== undefined) {
          merged.specify = fields.consent.specify;
          merged.dietaryDetails = fields.consent.specify;
        }
      }
      return merged;
    });
  }, []);

  const appState = application
    ? {
        ...defaultApplication,
        ...application,
        answers: {
          ...defaultApplication.answers,
          ...(application.answers || {}),
          productIdea:
            application.productIdea || application.answers?.productIdea || '',
          greatTeam:
            application.greatTeam || application.answers?.greatTeam || '',
        },
        consent: {
          ...defaultApplication.consent,
          ...(application.consent || {}),
          mediaConsent:
            application.mediaConsent ??
            application.consent?.mediaConsent ??
            false,
          dietaryRestrictions:
            application.dietaryRestrictions ||
            application.dietaryRestriction ||
            application.consent?.dietaryRestrictions ||
            '',
          specify:
            application.specify ||
            application.dietaryDetails ||
            application.consent?.specify ||
            '',
        },
      }
    : defaultApplication;

  const state = {
    account: {
      fullName:
        profile?.fullName || session?.user?.user_metadata?.full_name || '',
      email: session?.user?.email || '',
    },
    application: appState,
    submittedAt: application?.submittedAt || null,
  };

  const user = session?.user ?? null;

  const defaultContextValue = {
    session,
    user,
    status,
    profile,
    application,
    event,
    state,
    saveDraft,
    updateProfile: handleUpdateProfile,
    submitApplication: handleSubmitApplication,
    updateAccount,
    updateApplication,
    refreshPortalData,
    logOut,
  };

  const contextValue = customValue
    ? {
        ...defaultContextValue,
        ...customValue,
        state: customValue.state
          ? {
              ...state,
              ...customValue.state,
              account: {
                ...state.account,
                ...(customValue.state.account || {}),
              },
              application: {
                ...state.application,
                ...(customValue.state.application || {}),
              },
            }
          : defaultContextValue.state,
      }
    : defaultContextValue;

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
