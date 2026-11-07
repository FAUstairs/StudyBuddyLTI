export enum MeetType {
  Online = 'Online',
  InPerson = 'In person',
  Both = 'Online or in person',
}

export enum Languages {
  Deutsch = 'German',
  Englisch = 'English',
}

export type StudyBuddy = {
  userId: string;
  userName: string;
  intro: string;
  courseId: string;
  studyProgram: string;
  semester: number;
  email: string;
  meetType: MeetType;
  dayPreference: string;
  languages: Languages;
  active: boolean;
};

export type GetStudyBuddiesResponse = {
  connected: StudyBuddy[];
  requestReceived: StudyBuddy[];
  requestSent: StudyBuddy[];
  other: StudyBuddy[];
};

export async function getStudyBuddyUserInfo(
  courseId: string,
  institutionId: string,
  instanceId: string
) {
  return request<StudyBuddy | undefined>(
    `/api/study-buddy/get-user-info/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`,
    undefined,
    true
  );
}

export async function getStudyBuddyList(courseId: string, institutionId: string, instanceId: string) {
  return request<GetStudyBuddiesResponse>(
    `/api/study-buddy/get-study-buddies/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`
  );
}

export async function updateStudyBuddyInfo(
  courseId: string,
  studyBuddy: StudyBuddy,
  institutionId: string,
  instanceId: string
) {
  return request<void>(`/api/study-buddy/update-info/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    body: JSON.stringify(studyBuddy),
  });
}

export async function setActive(courseId: string, active: boolean, institutionId: string, instanceId: string) {
  return request<void>(`/api/study-buddy/set-active/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  });
}

export async function connectionRequest(courseId: string, receiverId: string, institutionId: string, instanceId: string) {
  return request<void>(`/api/study-buddy/connection-request/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    body: JSON.stringify({ receiverId }),
  });
}

export async function removeConnectionRequest(courseId: string, receiverId: string, institutionId: string, instanceId: string) {
  return request<void>(`/api/study-buddy/remove-connection-request/${encodeURIComponent(courseId)}?institutionId=${encodeURIComponent(institutionId)}&instanceId=${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    body: JSON.stringify({ receiverId }),
  });
}

async function request<T>(url: string, init?: RequestInit, notFoundIsEmpty = false): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
  if (notFoundIsEmpty && response.status === 404) return undefined as T;
  if (!response.ok) throw new Error(await response.text() || `Request failed (${response.status})`);
  return response.status === 204 ? undefined as T : response.json();
}
