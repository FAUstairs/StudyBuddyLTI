import type { GetStudyBuddiesResponse, StudyBuddy } from './study-buddy';

type Scope = { userId: string; courseId: string; institutionId: string; instanceId: string };
type Key = Pick<Scope, 'courseId' | 'institutionId' | 'instanceId'>;

const profiles = new Map<string, StudyBuddy>();
const requests = new Set<string>();

function profileKey(scope: Scope, userId = scope.userId) {
  return `${scope.institutionId}:${scope.instanceId}:${scope.courseId}:${userId}`;
}

function requestKey(scope: Scope, receiverId: string) {
  return `${profileKey(scope)}:${receiverId}`;
}

export function getUser(scope: Scope) {
  return profiles.get(profileKey(scope));
}

export function saveUser(scope: Scope, profile: StudyBuddy) {
  profiles.set(profileKey(scope), { ...profile, userId: scope.userId, courseId: scope.courseId });
}

export function setUserActive(scope: Scope, active: boolean) {
  const profile = getUser(scope);
  if (profile) profiles.set(profileKey(scope), { ...profile, active });
}

export function addRequest(scope: Scope, receiverId: string) {
  requests.add(requestKey(scope, receiverId));
}

export function removeRequest(scope: Scope, receiverId: string) {
  requests.delete(requestKey(scope, receiverId));
}

export function getList(scope: Scope): GetStudyBuddiesResponse {
  const courseProfiles = [...profiles.entries()]
    .filter(([key, profile]) => key.endsWith(`:${scope.courseId}:${profile.userId}`) && profile.active);
  const connected: StudyBuddy[] = [];
  const requestReceived: StudyBuddy[] = [];
  const requestSent: StudyBuddy[] = [];
  const other: StudyBuddy[] = [];

  for (const [, profile] of courseProfiles) {
    if (profile.userId === scope.userId) continue;
    const sent = requests.has(requestKey(scope, profile.userId));
    const received = requests.has(requestKey({ ...scope, userId: profile.userId }, scope.userId));
    if (sent && received) connected.push(profile);
    else if (received) requestReceived.push(profile);
    else if (sent) requestSent.push(profile);
    else other.push(profile);
  }
  return { connected, requestReceived, requestSent, other };
}

export type { Key };
