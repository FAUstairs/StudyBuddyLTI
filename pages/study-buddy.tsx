import CancelIcon from '@mui/icons-material/Cancel';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  connectionRequest,
  type GetStudyBuddiesResponse,
  disconnectStudyBuddy,
  getStudyBuddyEventsUrl,
  getStudyBuddyList,
  getStudyBuddyUserInfo,
  Languages,
  MeetType,
  removeConnectionRequest,
  setActive,
  type StudyBuddy,
  updateStudyBuddyInfo,
} from '../lib/study-buddy';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getLtiLaunchSession, type LtiLaunchSession } from '../lib/lti-session';

type StudyBuddyLabels = Record<string, string>;

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fauEmailPattern = /^[^\s@]+@fau\.de$/i;

type UiText = {
  labels: StudyBuddyLabels;
  matchProperties: Record<MatchProperty, string>;
  days: Record<string, string>;
  meetTypes: Record<MeetType, string>;
  languages: Record<Languages, string>;
  text: Record<string, string>;
  errors: Record<string, string>;
};

type MatchProperty = 'studyProgram' | 'semester' | 'meetType' | 'preferredDays' | 'languages';
const matchProperties: MatchProperty[] = ['studyProgram', 'semester', 'meetType', 'preferredDays', 'languages'];

function matchesProperty(user: StudyBuddy, buddy: StudyBuddy, property: MatchProperty) {
  if (property === 'studyProgram') return user.studyProgram === buddy.studyProgram;
  if (property === 'semester') return user.semester === buddy.semester;
  if (property === 'meetType') {
    return user.meetType === buddy.meetType || user.meetType === MeetType.Both || buddy.meetType === MeetType.Both;
  }

  const userValues = new Set(user[property === 'preferredDays' ? 'dayPreference' : property].split(',').filter(Boolean));
  const buddyValues = new Set(buddy[property === 'preferredDays' ? 'dayPreference' : property].split(',').filter(Boolean));
  return [...userValues].some((value) => buddyValues.has(value));
}

function getMatchPercentage(user: StudyBuddy, buddy: StudyBuddy) {
  const exactMatches = [
    user.studyProgram === buddy.studyProgram,
    user.semester === buddy.semester,
    user.meetType === buddy.meetType || user.meetType === MeetType.Both || buddy.meetType === MeetType.Both,
  ].filter(Boolean).length;
  const overlapScore = (left: string, right: string) => {
    const leftValues = new Set(left.split(',').map((value) => value.trim()).filter(Boolean));
    const rightValues = new Set(right.split(',').map((value) => value.trim()).filter(Boolean));
    if (!leftValues.size || !rightValues.size) return 0;
    return [...leftValues].some((value) => rightValues.has(value)) ? 1 : 0;
  };

  return Math.round(((exactMatches + overlapScore(user.dayPreference, buddy.dayPreference) + overlapScore(user.languages, buddy.languages)) / 5) * 100);
}

function StudyBuddyForm({
  studyBuddy,
  userName,
  uiText,
  onUpdate,
  onStudyProgramValidityChange,
}: {
  studyBuddy: StudyBuddy;
  userName: string;
  uiText: UiText;
  onUpdate: (value: StudyBuddy) => void;
  onStudyProgramValidityChange: (isValid: boolean) => void;
}) {
  const { labels, days: dayLabels } = uiText;
  const selectedDays = studyBuddy.dayPreference ? studyBuddy.dayPreference.split(',') : [];
  const selectedLanguages = studyBuddy.languages ? studyBuddy.languages.split(',') : [];
  const [studyPrograms, setStudyPrograms] = useState<string[]>([]);

  useEffect(() => {
    fetch('/StudyBuddy/api/study-programs')
      .then(async (response) => {
        if (!response.ok) throw new Error(uiText.errors.loadStudyPrograms);
        return response.json() as Promise<string[]>;
      })
      .then(setStudyPrograms)
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    onStudyProgramValidityChange(studyPrograms.includes(studyBuddy.studyProgram));
  }, [onStudyProgramValidityChange, studyBuddy.studyProgram, studyPrograms]);

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <TextField label={labels.nameLabel} value={userName} disabled />
      <TextField
        label={labels.emailLabel}
        type="email"
        value={studyBuddy.email}
        required
        onChange={(e) => onUpdate({ ...studyBuddy, email: e.target.value })}
        error={studyBuddy.email.length > 0 && !fauEmailPattern.test(studyBuddy.email.trim())}
        helperText={
          studyBuddy.email.length > 0 && !fauEmailPattern.test(studyBuddy.email.trim())
            ? uiText.errors.invalidEmail
            : undefined
        }
      />
      <TextField label={labels.introLabel} value={studyBuddy.intro} multiline onChange={(e) => onUpdate({ ...studyBuddy, intro: e.target.value })} />
      <Autocomplete
        options={studyPrograms}
        value={studyBuddy.studyProgram}
        onChange={(_, value) => onUpdate({ ...studyBuddy, studyProgram: value ?? '' })}
        renderInput={(params) => (
          <TextField
            {...params}
            label={labels.studyProgramLabel}
            error={studyBuddy.studyProgram.length > 0 && !studyPrograms.includes(studyBuddy.studyProgram)}
            helperText={
              studyBuddy.studyProgram.length > 0 && !studyPrograms.includes(studyBuddy.studyProgram)
                ? uiText.errors.invalidStudyProgram
                : undefined
            }
          />
        )}
      />
      <FormControl fullWidth>
        <InputLabel id="semester-label">{labels.semesterLabel}</InputLabel>
        <Select labelId="semester-label" value={studyBuddy.semester} label={labels.semesterLabel} onChange={(e) => onUpdate({ ...studyBuddy, semester: Number(e.target.value) })}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((semester) => (
            <MenuItem key={semester} value={semester}>{semester}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="meet-type-label">{labels.meetTypeLabel}</InputLabel>
        <Select labelId="meet-type-label" value={studyBuddy.meetType} label={labels.meetTypeLabel} onChange={(e) => onUpdate({ ...studyBuddy, meetType: e.target.value as MeetType })}>
          {Object.values(MeetType).map((meetType) => <MenuItem key={meetType} value={meetType}>{uiText.meetTypes[meetType]}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="days-label">{labels.preferredDays}</InputLabel>
        <Select multiple labelId="days-label" value={selectedDays} label={labels.preferredDays} onChange={(e) => onUpdate({ ...studyBuddy, dayPreference: (e.target.value as string[]).join(',') })} renderValue={(selected) => selected.map((day) => dayLabels[day] || day).join(', ')}>
          {days.map((day) => <MenuItem key={day} value={day}><Checkbox checked={selectedDays.includes(day)} /><ListItemText primary={dayLabels[day]} /></MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="languages-label">{labels.languagesLabel}</InputLabel>
        <Select multiple labelId="languages-label" value={selectedLanguages} label={labels.languagesLabel} onChange={(e) => onUpdate({ ...studyBuddy, languages: (e.target.value as string[]).join(',') })} renderValue={(selected) => selected.map((language) => uiText.languages[language as Languages] || language).join(', ')}>
          {Object.values(Languages).map((language) => <MenuItem key={language} value={language}><Checkbox checked={selectedLanguages.includes(language)} /><ListItemText primary={uiText.languages[language]} /></MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  );
}

function StudyBuddyListing({
  studyBuddy,
  labels,
  uiText,
}: {
  studyBuddy: StudyBuddy;
  labels: StudyBuddyLabels;
  uiText: UiText;
}) {
  return (
    <Box sx={{ display: 'grid', gap: 0.75 }}>
      <Typography><strong>{labels.nameLabel}:</strong> {studyBuddy.userName || '—'}</Typography>
      <Typography><strong>{labels.introLabel}:</strong> {studyBuddy.intro || '—'}</Typography>
      <Typography><strong>{labels.studyProgramLabel}:</strong> {studyBuddy.studyProgram || '—'}</Typography>
      <Typography><strong>{labels.semesterLabel}:</strong> {studyBuddy.semester || '—'}</Typography>
      <Typography><strong>{labels.meetTypeLabel}:</strong> {uiText.meetTypes[studyBuddy.meetType] || studyBuddy.meetType || '—'}</Typography>
      <Typography><strong>{labels.preferredDays}:</strong> {studyBuddy.dayPreference ? studyBuddy.dayPreference.split(',').map((day) => uiText.days[day] || day).join(', ') : '—'}</Typography>
      <Typography><strong>{labels.languagesLabel}:</strong> {studyBuddy.languages ? studyBuddy.languages.split(',').map((language) => uiText.languages[language as Languages] || language).join(', ') : '—'}</Typography>
    </Box>
  );
}

function StudyBuddyListingTable({
  studyBuddies,
  header,
  subText,
  currentUser,
  selectedProperties,
  uiText,
  onAction,
  actionContent,
  actionIcon,
  showEmail = false,
  lightBlue = false,
  lightYellow = false,
  lightGreen = false,
  showDetails = false,
}: {
  studyBuddies?: StudyBuddy[];
  header: string;
  subText: string;
  currentUser?: StudyBuddy;
  selectedProperties?: MatchProperty[];
  uiText: UiText;
  labels: StudyBuddyLabels;
  onAction?: (buddy: StudyBuddy) => void;
  actionContent?: (buddy: StudyBuddy) => ReactNode;
  actionIcon?: ReactNode;
  showEmail?: boolean;
  lightBlue?: boolean;
  lightYellow?: boolean;
  lightGreen?: boolean;
  showDetails?: boolean;
}) {
  const visibleBuddies = studyBuddies?.filter((buddy) =>
    currentUser && selectedProperties?.length
      ? selectedProperties.every((property) => matchesProperty(currentUser, buddy, property))
      : true,
  );
  if (!visibleBuddies?.length) return null;
  return (
    <Card
      sx={{
        mt: 2,
        ...(lightBlue && { backgroundColor: '#e3f2fd' }),
        ...(lightYellow && { backgroundColor: '#fff9c4' }),
        ...(lightGreen && { backgroundColor: '#e8f5e9' }),
      }}
    >
      <CardContent>
        <Typography variant="h5">{header}</Typography>
        <Typography variant="body2">{subText}</Typography>
        {visibleBuddies.map((buddy) => (
          <Box
            key={buddy.userId}
            sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}
          >
            <Box>
              <Typography>{buddy.userName}</Typography>
              {currentUser && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                  {uiText.text.match}: {getMatchPercentage(currentUser, buddy)}%
                </Typography>
              )}
              {showDetails && (
                <Typography
                  variant="body2"
                  sx={{ fontStyle: 'italic', fontWeight: 500, mt: 0.5 }}
                >
                  {buddy.intro || '—'}
                </Typography>
              )}
              {showEmail && <Typography variant="body2">{buddy.email}</Typography>}
              {showDetails && (
                <Typography variant="body2" color="text.secondary">
                  {buddy.studyProgram || '—'} · {uiText.labels.semesterLabel} {buddy.semester || '—'} ·{' '}
                  {uiText.meetTypes[buddy.meetType] || buddy.meetType || '—'} ·{' '}
                  {buddy.languages
                    ? buddy.languages.split(',').map((language) => uiText.languages[language as Languages] || language).join(', ')
                    : '—'} ·{' '}
                  {buddy.dayPreference
                    ? buddy.dayPreference.split(',').map((day) => uiText.days[day] || day).join(', ')
                    : '—'}
                </Typography>
              )}
            </Box>
            {actionContent
              ? actionContent(buddy)
              : onAction && (
              <Button onClick={() => onAction(buddy)}>
                {actionIcon || uiText.text.action}
              </Button>
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

const uiText: Record<'de' | 'en', UiText> = {
  en: {
    labels: {
      dayPreference: 'Day Preference',
      emailLabel: 'Email',
      emailWarning: 'Your email is only visible to connected study buddies.',
      introLabel: 'Introduce yourself',
      languages: 'Languages',
      languagesLabel: 'Languages you speak',
      meetPreference: 'Meeting Preference',
      meetTypeLabel: 'Preferred Meeting Type',
      nameLabel: 'Name',
      preferredDays: 'Preferred Days',
      semesterLabel: 'Semester',
      studyProgramLabel: 'Study Program',
    },
    matchProperties: { studyProgram: 'Study Program', semester: 'Semester', meetType: 'Preferred Meeting Type', preferredDays: 'Preferred Days', languages: 'Languages' },
    days: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
    meetTypes: { [MeetType.Online]: 'Virtual', [MeetType.InPerson]: 'Physical', [MeetType.Both]: 'Both' },
    languages: { [Languages.Deutsch]: 'German', [Languages.Englisch]: 'English', [Languages.Arabic]: 'Arabic', [Languages.French]: 'French', [Languages.Spanish]: 'Spanish', [Languages.Others]: 'Other' },
    text: {
      agreementText: 'I agree that my profile is visible to other active study buddies in this course.',
      connected: 'Connected Study Buddies',
      connectedAlert: 'You are now connected with $1.',
      connectedSubtext: 'You can see each other’s email addresses here. Please contact each other to start studying together.',
      connectionRequestCancelled: 'Connection request to $1 was cancelled.',
      connectionRequestSent: 'Connection request sent to $1.',
      confirmRemove: 'Remove connection?',
      cancel: 'Cancel',
      discard: 'Discard', editInfo: 'Edit Info', fillForm: 'Create Your Study Buddy Profile',
      join: 'Join', lookingFor: 'Looking For Study Buddies',
      lookingForSubtext: 'Send a request to someone you would like to study with.',
      myProfile: 'My Profile', notActive: 'Your profile is currently inactive.',
      optOut: 'Opt Out', optOutPrompt: 'Do you want to opt out of Study Buddy for $1?',
      confirmOptOut: 'Opt out of Study Buddy?',
      reJoin: 'Rejoin', requestReceived: 'Requests Received',
      requestReceivedSubtext: 'Accept requests from people who want to study with you.',
      requestSent: 'Requests Sent', requestSentSubtext: 'Cancel requests you no longer want to keep open.',
      disconnect: 'Remove connection', update: 'Update', action: 'Action',
      match: 'Match',
      filter: 'Show only matches by:',
    },
    errors: { invalidEmail: 'Please enter a valid FAU email address ending in @fau.de.', invalidStudyProgram: 'Please select a study program from the list.', loadStudyPrograms: 'Could not load study programs.', statusUpdate: 'Could not update profile status.', saveProfile: 'Could not save your profile.' },
  },
  de: {
    labels: {
      dayPreference: 'Bevorzugte Tage', emailLabel: 'E-Mail',
      emailWarning: 'Deine E-Mail-Adresse ist nur für verbundene Lernpartner sichtbar.',
      introLabel: 'Stelle dich vor', languages: 'Sprachen', languagesLabel: 'Gesprochene Sprachen',
      meetPreference: 'Treffen', meetTypeLabel: 'Bevorzugte Art des Treffens', nameLabel: 'Name',
      preferredDays: 'Bevorzugte Tage', semesterLabel: 'Semester', studyProgramLabel: 'Studienfach',
    },
    matchProperties: { studyProgram: 'Studienfach', semester: 'Semester', meetType: 'Bevorzugte Art des Treffens', preferredDays: 'Bevorzugte Tage', languages: 'Sprachen' },
    days: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' },
    meetTypes: { [MeetType.Online]: 'Online', [MeetType.InPerson]: 'Vor Ort', [MeetType.Both]: 'Beides' },
    languages: { [Languages.Deutsch]: 'Deutsch', [Languages.Englisch]: 'Englisch', [Languages.Arabic]: 'Arabisch', [Languages.French]: 'Französisch', [Languages.Spanish]: 'Spanisch', [Languages.Others]: 'Andere' },
    text: {
      agreementText: 'Ich stimme zu, dass mein Profil für andere aktive Lernpartner in diesem Kurs sichtbar ist.',
      connected: 'Verbundene Lernpartner', connectedAlert: 'Du bist jetzt mit $1 verbunden.',
      connectedSubtext: 'Hier seht ihr die E-Mail-Adressen des jeweils anderen. Kontaktiert euch, um gemeinsam zu lernen.',
      connectionRequestCancelled: 'Die Anfrage an $1 wurde zurückgezogen.',
      connectionRequestSent: 'Anfrage an $1 gesendet.', discard: 'Verwerfen', editInfo: 'Angaben bearbeiten',
      confirmRemove: 'Verbindung entfernen?',
      cancel: 'Abbrechen',
      fillForm: 'Erstelle dein Lernpartner-Profil', join: 'Beitreten',
      lookingFor: 'Suche nach Lernpartnern',
      lookingForSubtext: 'Sende eine Anfrage an jemanden, mit dem du lernen möchtest.',
      myProfile: 'Mein Profil', notActive: 'Dein Profil ist derzeit deaktiviert.',
      optOut: 'Austreten', optOutPrompt: 'Möchtest du Study Buddy für $1 verlassen?',
      confirmOptOut: 'Study Buddy verlassen?',
      reJoin: 'Wieder beitreten', requestReceived: 'Erhaltene Anfragen',
      requestReceivedSubtext: 'Nimm Anfragen von Personen an, die mit dir lernen möchten.',
      requestSent: 'Gesendete Anfragen', requestSentSubtext: 'Ziehe offene Anfragen zurück, die du nicht mehr aufrechterhalten möchtest.',
      disconnect: 'Verbindung entfernen', update: 'Aktualisieren', action: 'Aktion',
      match: 'Übereinstimmung',
      filter: 'Nur Übereinstimmungen anzeigen nach:',
    },
    errors: { invalidEmail: 'Bitte gib eine gültige FAU-E-Mail-Adresse mit der Endung @fau.de ein.', invalidStudyProgram: 'Bitte wähle ein Studienfach aus der Liste aus.', loadStudyPrograms: 'Studienfächer konnten nicht geladen werden.', statusUpdate: 'Der Profilstatus konnte nicht aktualisiert werden.', saveProfile: 'Dein Profil konnte nicht gespeichert werden.' },
  },
};

const descriptions = {
  de: 'Study Buddy ist ein Werkzeug, mit dem du Lernpartner in diesem Kurs finden kannst. Du kannst ein Profil erstellen und dich mit anderen Studierenden verbinden.',
  en: 'Study Buddy is a tool to help you find study partners in this course. You can create a profile and connect with other students who are looking for study buddies.',
} as const;

type Props = {
  session: LtiLaunchSession;
};

export const getServerSideProps = (async ({ req }) => {
  const session = getLtiLaunchSession(req as Parameters<typeof getLtiLaunchSession>[0]);
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}) satisfies GetServerSideProps<Props>;

function OptOutButton({
  studyBuddy,
  courseId,
  institutionId,
  instanceId,
  text,
  errors,
}: {
  studyBuddy: StudyBuddy;
  courseId: string;
  institutionId: string;
  instanceId: string;
  text: UiText['text'];
  errors: UiText['errors'];
}) {
  const [error, setError] = useState<string>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      {studyBuddy.active && isConfirming ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body2">{text.confirmOptOut}</Typography>
          <Button
            size="small"
            variant="contained"
            color="warning"
            disabled={isUpdating}
            onClick={async () => {
              setError(undefined);
              setIsUpdating(true);
              try {
                await setActive(courseId, false, institutionId, instanceId);
                location.reload();
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : errors.statusUpdate);
                setIsUpdating(false);
                setIsConfirming(false);
              }
            }}
          >
            {text.optOut}
          </Button>
          <Button size="small" variant="outlined" onClick={() => setIsConfirming(false)}>
            {text.cancel}
          </Button>
        </Box>
      ) : (
      <Button
        variant="contained"
        disabled={isUpdating}
        onClick={async () => {
          if (studyBuddy.active) {
            setIsConfirming(true);
            return;
          }
          setError(undefined);
          setIsUpdating(true);
          try {
            await setActive(courseId, !studyBuddy.active, institutionId, instanceId);
            location.reload();
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : errors.statusUpdate);
            setIsUpdating(false);
          }
        }}
      >
        {studyBuddy.active ? text.optOut : text.reJoin}
      </Button>
      )}
      {error && <Typography color="error">{error}</Typography>}
    </>
  );
}

export default function StudyBuddyPage({ session }: Props) {
  const courseId = session.courseId;
  const institutionId = session.institutionId;
  const instanceId = session.instanceId;
  const language = session.locale.toLowerCase().startsWith('de') ? 'de' : 'en';
  const localized = uiText[language];
  const text = localized.text;
  const [isLoading, setIsLoading] = useState(true);
  const [fromServer, setFromServer] = useState<StudyBuddy | undefined>(undefined);
  const [allBuddies, setAllBuddies] = useState<GetStudyBuddiesResponse | undefined>(undefined);
  const [userInput, setUserInput] = useState<StudyBuddy>({
    userId: '',
    userName: '',
    intro: '',
    courseId,
    studyProgram: '',
    semester: 1,
    email: '',
    meetType: MeetType.Both,
    dayPreference: '',
    languages: Languages.Deutsch,
    active: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [studyProgramIsValid, setStudyProgramIsValid] = useState(false);
  const [disconnectingBuddyId, setDisconnectingBuddyId] = useState<string>();
  const [selectedMatchProperties, setSelectedMatchProperties] = useState<MatchProperty[]>([]);

  const refetchStudyBuddyLists = useCallback(() => {
    if (!courseId || !fromServer?.active || !institutionId || !instanceId) return;
    getStudyBuddyList(courseId, institutionId, instanceId).then(setAllBuddies);
  }, [courseId, fromServer?.active, institutionId, instanceId]);

  useEffect(() => {
    refetchStudyBuddyLists();
  }, [refetchStudyBuddyLists]);

  useEffect(() => {
    if (!fromServer?.active || typeof EventSource === 'undefined') return;

    const events = new EventSource(getStudyBuddyEventsUrl(courseId, institutionId, instanceId));
    const handleChange = () => refetchStudyBuddyLists();
    events.addEventListener('study-buddy-change', handleChange);

    return () => {
      events.removeEventListener('study-buddy-change', handleChange);
      events.close();
    };
  }, [courseId, fromServer?.active, institutionId, instanceId, refetchStudyBuddyLists]);

  useEffect(() => {
    setIsLoading(true);
    getStudyBuddyUserInfo(courseId, institutionId, instanceId).then((data) => {
      setIsLoading(false);
      setFromServer(data);
    });
  }, [courseId, institutionId, instanceId]);

  const notSignedUp = !fromServer;

  return (
    <>
      <Head>
        <title>{courseId} Study Buddy | ALeA LTI</title>
      </Head>
      <Box
        sx={{ maxWidth: '900px', m: 'auto', p: '24px', display: 'flex', flexDirection: 'column' }}
      >
        <Typography variant="h4">Study Buddy</Typography>
        <Typography variant="subtitle1" sx={{ color: '#555' }}>
          {session.context?.title || session.resourceLink?.title || courseId}
        </Typography>
        <Typography variant="body1" sx={{ mt: '10px' }}>
          {descriptions[language]}
        </Typography>

        {notSignedUp || isEditing ? (
          !isLoading ? (
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <Typography variant="h5">{text.fillForm}</Typography>
                <br />
                <StudyBuddyForm
                  studyBuddy={userInput}
                  userName={session.user.name}
                  uiText={localized}
                  onUpdate={(studyBuddy) => setUserInput(studyBuddy)}
                  onStudyProgramValidityChange={setStudyProgramIsValid}
                />
                <FormControlLabel
                  control={
                    <Checkbox value={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  }
                  label={text.agreementText}
                />
              </CardContent>
              <CardActions>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <Box>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        setSaveError(undefined);
                        try {
                          await updateStudyBuddyInfo(
                            courseId,
                            { ...userInput, active: notSignedUp ? true : userInput.active },
                            institutionId,
                            instanceId,
                          );
                          location.reload();
                        } catch (reason) {
                          setSaveError(
                            reason instanceof Error
                              ? reason.message
                              : localized.errors.saveProfile,
                          );
                        }
                      }}
                      sx={{ mr: '10px' }}
                      disabled={
                        !agreed ||
                        !fauEmailPattern.test(userInput.email.trim()) ||
                        !studyProgramIsValid
                      }
                    >
                      {notSignedUp ? text.join : text.update}
                    </Button>
                    {saveError && <Typography color="error">{saveError}</Typography>}
                    {!notSignedUp && (
                      <Button variant="contained" onClick={() => setIsEditing(false)}>
                        {text.discard}
                      </Button>
                    )}
                  </Box>
                  {fromServer?.active && (
                    <OptOutButton
                      studyBuddy={fromServer}
                      courseId={courseId}
                      institutionId={institutionId}
                      instanceId={instanceId}
                      text={text}
                      errors={localized.errors}
                    />
                  )}
                </Box>
              </CardActions>
            </Card>
          ) : (
            <CircularProgress sx={{ mt: '20px' }} />
          )
        ) : (
          <>
            <Typography variant="h4" mt="24px">
              {text.myProfile}
            </Typography>
            <Card sx={{ mt: '20px' }}>
              <CardContent>
                <StudyBuddyListing studyBuddy={fromServer} labels={localized.labels} uiText={localized} />
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsEditing(true);
                    setUserInput(fromServer);
                  }}
                >
                  {text.editInfo}
                </Button>
                {!fromServer.active && (
                  <OptOutButton
                    studyBuddy={fromServer}
                    courseId={courseId}
                    institutionId={institutionId}
                    instanceId={instanceId}
                    text={text}
                    errors={localized.errors}
                  />
                )}
              </CardActions>
            </Card>
          </>
        )}
        {fromServer && !fromServer.active && (
          <Typography variant="h6" mt="10px">
            {text.notActive}
          </Typography>
        )}
        {fromServer?.active && (
          <Card sx={{ mt: 2, backgroundColor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle1">{text.filter}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {matchProperties.map((property) => (
                  <FormControlLabel
                    key={property}
                    control={
                      <Checkbox
                        checked={selectedMatchProperties.includes(property)}
                        onChange={(event) => {
                          setSelectedMatchProperties((selected) =>
                            event.target.checked
                              ? [...selected, property]
                              : selected.filter((item) => item !== property),
                          );
                        }}
                      />
                    }
                    label={localized.matchProperties[property]}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.connected}
          header={text.connected}
          subText={text.connectedSubtext}
          currentUser={fromServer}
          selectedProperties={selectedMatchProperties}
          labels={localized.labels}
          uiText={localized}
          lightGreen
          showEmail
          showDetails
          actionIcon={<CancelIcon color="warning" />}
          actionContent={(buddy) =>
            disconnectingBuddyId === buddy.userId ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  gap: 0.75,
                  p: 0.75,
                  border: '1px solid',
                  borderColor: 'warning.light',
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                }}
              >
                <Typography variant="body2" sx={{ mr: 0.5 }}>
                  {text.confirmRemove}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => {
                    disconnectStudyBuddy(courseId, buddy.userId, institutionId, instanceId).then(() => {
                      setDisconnectingBuddyId(undefined);
                      refetchStudyBuddyLists();
                    });
                  }}
                >
                  {text.disconnect}
                </Button>
                <Button size="small" variant="outlined" onClick={() => setDisconnectingBuddyId(undefined)}>
                  {text.cancel}
                </Button>
              </Box>
            ) : (
              <Button
                size="small"
                color="warning"
                aria-label={text.disconnect}
                onClick={() => setDisconnectingBuddyId(buddy.userId)}
              >
                <CancelIcon color="warning" />
              </Button>
            )
          }
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestReceived}
          header={text.requestReceived}
          actionIcon={<HandshakeIcon color="primary" />}
          subText={text.requestReceivedSubtext}
          currentUser={fromServer}
          selectedProperties={selectedMatchProperties}
          labels={localized.labels}
          uiText={localized}
          lightYellow
          showDetails
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, instanceId).then(async () => {
              refetchStudyBuddyLists();
            });
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.requestSent}
          header={text.requestSent}
          actionIcon={<CancelIcon color="warning" />}
          subText={text.requestSentSubtext}
          currentUser={fromServer}
          selectedProperties={selectedMatchProperties}
          labels={localized.labels}
          uiText={localized}
          lightYellow
          showDetails
          onAction={(buddy) => {
            removeConnectionRequest(courseId, buddy.userId, institutionId, instanceId).then(
              async () => {
                refetchStudyBuddyLists();
              }
            );
          }}
        />
        <StudyBuddyListingTable
          studyBuddies={allBuddies?.other}
          header={text.lookingFor}
          subText={text.lookingForSubtext}
          currentUser={fromServer}
          selectedProperties={selectedMatchProperties}
          actionIcon={<ThumbUpAltIcon color="primary" />}
          labels={localized.labels}
          uiText={localized}
          lightBlue
          showDetails
          onAction={(buddy) => {
            connectionRequest(courseId, buddy.userId, institutionId, instanceId).then(async () => {
              refetchStudyBuddyLists();
            });
          }}
        />
      </Box>
    </>
  );
}
