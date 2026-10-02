import { supabase } from '../lib/supabaseClient';

function getOrigin() {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
  ) {
    return window.location.origin;
  }
  return '';
}

export const SUBMISSION_ERRORS = {
  application_incomplete:
    'Please complete all required fields before submitting.',
  application_already_submitted: 'This application has already been submitted.',
  applications_closed: 'Applications for this event are now closed.',
  application_not_found: 'Application could not be found.',
};

export function mapProfileFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApplicationFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    program: row.program || '',
    yearOfStudy: row.year_of_study || '',
    productIdea: row.product_idea || '',
    greatTeam: row.great_team || '',
    mediaConsent: Boolean(row.media_consent),
    dietaryRestriction: row.dietary_restriction || '',
    dietaryRestrictions: row.dietary_restriction || '',
    dietaryDetails: row.dietary_details || '',
    specify: row.dietary_details || '',
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: {
      productIdea: row.product_idea || '',
      greatTeam: row.great_team || '',
    },
    consent: {
      mediaConsent: Boolean(row.media_consent),
      dietaryRestrictions: row.dietary_restriction || '',
      specify: row.dietary_details || '',
    },
  };
}

export function mapApplicationFormToRow(fields = {}) {
  const row = {};

  if ('program' in fields) {
    row.program = fields.program === '' ? null : fields.program;
  }

  if ('yearOfStudy' in fields) {
    row.year_of_study = fields.yearOfStudy === '' ? null : fields.yearOfStudy;
  } else if ('year_of_study' in fields) {
    row.year_of_study =
      fields.year_of_study === '' ? null : fields.year_of_study;
  }

  if ('productIdea' in fields) {
    row.product_idea = fields.productIdea;
  } else if (fields.answers && 'productIdea' in fields.answers) {
    row.product_idea = fields.answers.productIdea;
  } else if ('product_idea' in fields) {
    row.product_idea = fields.product_idea;
  }

  if ('greatTeam' in fields) {
    row.great_team = fields.greatTeam;
  } else if (fields.answers && 'greatTeam' in fields.answers) {
    row.great_team = fields.answers.greatTeam;
  } else if ('great_team' in fields) {
    row.great_team = fields.great_team;
  }

  if ('mediaConsent' in fields) {
    row.media_consent = Boolean(fields.mediaConsent);
  } else if (fields.consent && 'mediaConsent' in fields.consent) {
    row.media_consent = Boolean(fields.consent.mediaConsent);
  } else if ('media_consent' in fields) {
    row.media_consent = Boolean(fields.media_consent);
  }

  if ('dietaryRestriction' in fields) {
    row.dietary_restriction =
      fields.dietaryRestriction === '' ? null : fields.dietaryRestriction;
  } else if ('dietaryRestrictions' in fields) {
    row.dietary_restriction =
      fields.dietaryRestrictions === '' ? null : fields.dietaryRestrictions;
  } else if (fields.consent && 'dietaryRestrictions' in fields.consent) {
    row.dietary_restriction =
      fields.consent.dietaryRestrictions === ''
        ? null
        : fields.consent.dietaryRestrictions;
  } else if (fields.consent && 'dietaryRestriction' in fields.consent) {
    row.dietary_restriction =
      fields.consent.dietaryRestriction === ''
        ? null
        : fields.consent.dietaryRestriction;
  } else if ('dietary_restriction' in fields) {
    row.dietary_restriction =
      fields.dietary_restriction === '' ? null : fields.dietary_restriction;
  }

  if ('dietaryDetails' in fields) {
    row.dietary_details =
      fields.dietaryDetails === '' ? null : fields.dietaryDetails;
  } else if ('specify' in fields) {
    row.dietary_details = fields.specify === '' ? null : fields.specify;
  } else if (fields.consent && 'specify' in fields.consent) {
    row.dietary_details =
      fields.consent.specify === '' ? null : fields.consent.specify;
  } else if (fields.consent && 'dietaryDetails' in fields.consent) {
    row.dietary_details =
      fields.consent.dietaryDetails === ''
        ? null
        : fields.consent.dietaryDetails;
  } else if ('dietary_details' in fields) {
    row.dietary_details =
      fields.dietary_details === '' ? null : fields.dietary_details;
  }

  return row;
}

export async function signUp({ fullName, email, password }, options = {}) {
  const origin = getOrigin();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/portal/apply/register`,
      ...options,
      data: {
        full_name: fullName,
        ...(options.data || {}),
      },
    },
  });
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resendConfirmation(email, options = {}) {
  const origin = getOrigin();
  return supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/portal/apply/register`,
      ...options,
    },
  });
}

export async function requestPasswordReset(email, options = {}) {
  const origin = getOrigin();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/portal/update-password`,
    ...options,
  });
}

export async function updatePassword(password) {
  return supabase.auth.updateUser({
    password,
  });
}

export async function getEvent(slug) {
  return supabase
    .from('events')
    .select('id, slug, name, applications_open_at, applications_close_at')
    .eq('slug', slug)
    .maybeSingle();
}

export async function getProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, created_at, updated_at')
    .maybeSingle();

  if (error) return { data: null, error };
  return {
    data: data ? mapProfileFromRow(data) : null,
    error: null,
  };
}

export async function updateProfile({ fullName }) {
  let userId;
  const { data: sessionData } = await supabase.auth.getSession();
  userId = sessionData?.session?.user?.id;
  if (!userId) {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id;
  }

  let query = supabase.from('profiles').update({ full_name: fullName });
  if (userId) {
    query = query.eq('id', userId);
  }
  const { data, error } = await query.select().single();

  if (error) return { data: null, error };
  return {
    data: data ? mapProfileFromRow(data) : null,
    error: null,
  };
}

export async function getMyApplication(eventId) {
  let query = supabase.from('applications').select('*');
  if (eventId) {
    query = query.eq('event_id', eventId);
  }
  const { data, error } = await query.maybeSingle();

  if (error) return { data: null, error };
  return {
    data: data ? mapApplicationFromRow(data) : null,
    error: null,
  };
}

export async function saveApplicationDraft({ applicationId, eventId, fields }) {
  const rowFields = mapApplicationFormToRow(fields);

  if (applicationId) {
    const { data, error } = await supabase
      .from('applications')
      .update(rowFields)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) return { data: null, error };
    return {
      data: data ? mapApplicationFromRow(data) : null,
      error: null,
    };
  }

  const insertPayload = {
    ...rowFields,
    event_id: eventId,
  };
  const { data, error } = await supabase
    .from('applications')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return { data: null, error };
  return {
    data: data ? mapApplicationFromRow(data) : null,
    error: null,
  };
}

export async function submitApplication(applicationId) {
  const { data, error } = await supabase.rpc('submit_application', {
    target_application_id: applicationId,
  });

  if (error) {
    const userMessage = SUBMISSION_ERRORS[error.message] || error.message;
    return {
      data: null,
      error: {
        ...error,
        code: error.message,
        message: userMessage,
      },
    };
  }

  return {
    data: data ? mapApplicationFromRow(data) : null,
    error: null,
  };
}

export async function sendApplicationReceivedEmail() {
  return supabase.functions.invoke('send-application-received');
}
