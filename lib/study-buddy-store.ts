import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { GetStudyBuddiesResponse, StudyBuddy } from './study-buddy';

type Scope = {
  userId: string;
  courseId: string;
  institutionId: string;
  instanceId: string;
};

type StudyBuddyRow = StudyBuddy & RowDataPacket;

let pool: mysql.Pool | undefined;
let changeTableReady: Promise<void> | undefined;

function legacyCourseId(scope: Pick<Scope, 'courseId' | 'instanceId'>) {
  return `${scope.courseId}||${scope.instanceId}`;
}

function getPool() {
  if (pool) return pool;

  const required = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (!process.env.MYSQL_DATABASE && !process.env.MYSQL_COMMENTS_DATABASE) {
    missing.push('MYSQL_DATABASE or MYSQL_COMMENTS_DATABASE');
  }
  if (missing.length) {
    throw new Error(`Missing database environment variables: ${missing.join(', ')}`);
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE ?? process.env.MYSQL_COMMENTS_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
  });
  return pool;
}

function ensureChangeTable() {
  if (!changeTableReady) {
    changeTableReady = getPool()
      .execute(
        `CREATE TABLE IF NOT EXISTS StudyBuddyChanges (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          courseId VARCHAR(255) NOT NULL,
          instanceId VARCHAR(255) NOT NULL,
          institutionId VARCHAR(255) NOT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_study_buddy_changes_scope (courseId, instanceId, institutionId, id)
        )`,
      )
      .then(() => undefined);
  }
  return changeTableReady;
}

export async function recordStudyBuddyChange(
  scope: Pick<Scope, 'courseId' | 'institutionId' | 'instanceId'>,
) {
  await ensureChangeTable();
  await getPool().execute(
    'INSERT INTO StudyBuddyChanges (courseId, instanceId, institutionId) VALUES (?, ?, ?)',
    [scope.courseId, scope.instanceId, scope.institutionId],
  );
}

export async function getLatestStudyBuddyChange(
  scope: Pick<Scope, 'courseId' | 'institutionId' | 'instanceId'>,
) {
  await ensureChangeTable();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id FROM StudyBuddyChanges
     WHERE courseId=? AND instanceId=? AND institutionId=?
     ORDER BY id DESC LIMIT 1`,
    [scope.courseId, scope.instanceId, scope.institutionId],
  );
  return rows[0] ? Number(rows[0].id) : 0;
}

export async function getUser(scope: Scope) {
  const [rows] = await getPool().query<StudyBuddyRow[]>(
    'SELECT * FROM StudyBuddyUsers WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [scope.userId, scope.courseId, scope.instanceId, scope.institutionId],
  );
  return rows[0];
}

export async function saveUser(scope: Scope, profile: StudyBuddy) {
  await getPool().execute(
    `INSERT INTO StudyBuddyUsers
      (userId, courseId, instanceId, institutionId, sbCourseId, active, email, userName, intro,
       studyProgram, semester, meetType, languages, dayPreference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       active=VALUES(active), email=VALUES(email), userName=VALUES(userName),
       intro=VALUES(intro), studyProgram=VALUES(studyProgram), semester=VALUES(semester),
       meetType=VALUES(meetType), languages=VALUES(languages), dayPreference=VALUES(dayPreference)`,
    [
      scope.userId,
      scope.courseId,
      scope.instanceId,
      scope.institutionId,
      legacyCourseId(scope),
      profile.active,
      profile.email,
      profile.userName,
      profile.intro,
      profile.studyProgram,
      profile.semester,
      profile.meetType,
      profile.languages,
      profile.dayPreference,
    ],
  );
}

export async function setUserActive(scope: Scope, active: boolean) {
  const [result] = await getPool().execute(
    'UPDATE StudyBuddyUsers SET active=? WHERE userId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [active, scope.userId, scope.courseId, scope.instanceId, scope.institutionId],
  );
  return (result as mysql.ResultSetHeader).affectedRows > 0;
}

export async function addRequest(scope: Scope, receiverId: string) {
  await getPool().execute(
    `INSERT INTO StudyBuddyConnections
      (senderId, receiverId, sbCourseId, courseId, instanceId, institutionId)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE timeOfIssue=CURRENT_TIMESTAMP`,
    [
      scope.userId,
      receiverId,
      legacyCourseId(scope),
      scope.courseId,
      scope.instanceId,
      scope.institutionId,
    ],
  );
}

export async function removeRequest(scope: Scope, receiverId: string) {
  await getPool().execute(
    'DELETE FROM StudyBuddyConnections WHERE senderId=? AND receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [scope.userId, receiverId, scope.courseId, scope.instanceId, scope.institutionId],
  );
}

export async function removeConnection(scope: Scope, receiverId: string) {
  await getPool().execute(
    `DELETE FROM StudyBuddyConnections
     WHERE courseId=? AND instanceId=? AND institutionId=?
       AND ((senderId=? AND receiverId=?) OR (senderId=? AND receiverId=?))`,
    [
      scope.courseId,
      scope.instanceId,
      scope.institutionId,
      scope.userId,
      receiverId,
      receiverId,
      scope.userId,
    ],
  );
}

export async function getList(scope: Scope): Promise<GetStudyBuddiesResponse> {
  const [received] = await getPool().query<RowDataPacket[]>(
    'SELECT senderId FROM StudyBuddyConnections WHERE receiverId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [scope.userId, scope.courseId, scope.instanceId, scope.institutionId],
  );
  const [sent] = await getPool().query<RowDataPacket[]>(
    'SELECT receiverId FROM StudyBuddyConnections WHERE senderId=? AND courseId=? AND instanceId=? AND institutionId=?',
    [scope.userId, scope.courseId, scope.instanceId, scope.institutionId],
  );
  const [buddies] = await getPool().query<StudyBuddyRow[]>(
    'SELECT * FROM StudyBuddyUsers WHERE userId<>? AND courseId=? AND instanceId=? AND institutionId=? AND active=?',
    [scope.userId, scope.courseId, scope.instanceId, scope.institutionId, true],
  );

  const receivedIds = new Set(received.map((row) => String(row.senderId)));
  const sentIds = new Set(sent.map((row) => String(row.receiverId)));
  const connected: StudyBuddy[] = [];
  const requestSent: StudyBuddy[] = [];
  const requestReceived: StudyBuddy[] = [];
  const other: StudyBuddy[] = [];

  for (const buddy of buddies) {
    const sentToBuddy = sentIds.has(buddy.userId);
    const receivedFromBuddy = receivedIds.has(buddy.userId);
    if (sentToBuddy && receivedFromBuddy) connected.push(buddy);
    else if (receivedFromBuddy) requestReceived.push({ ...buddy, email: '' });
    else if (sentToBuddy) requestSent.push({ ...buddy, email: '' });
    else other.push({ ...buddy, email: '' });
  }

  return { connected, requestSent, requestReceived, other };
}
