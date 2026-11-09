CREATE TABLE StudyBuddyUsers (
  userId VARCHAR(255) NOT NULL,
  sbCourseId VARCHAR(255) NOT NULL,
  courseId VARCHAR(100) NOT NULL,
  instanceId VARCHAR(50) NOT NULL,
  institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU',
  active BOOLEAN NOT NULL,
  email VARCHAR(255) NOT NULL,
  userName VARCHAR(255),
  intro VARCHAR(1023),
  studyProgram VARCHAR(255),
  semester INT,
  meetType VARCHAR(255),
  languages VARCHAR(255),
  dayPreference VARCHAR(255),
  createdTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (userId, courseId, instanceId, institutionId)
);

CREATE TABLE StudyBuddyConnections (
  senderId VARCHAR(255) NOT NULL,
  receiverId VARCHAR(255) NOT NULL,
  sbCourseId VARCHAR(255) NOT NULL,
  courseId VARCHAR(100) NOT NULL,
  instanceId VARCHAR(50) NOT NULL,
  institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU',
  timeOfIssue TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (senderId, receiverId, courseId, instanceId, institutionId)
);

CREATE TABLE StudyBuddyChanges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  courseId VARCHAR(255) NOT NULL,
  instanceId VARCHAR(255) NOT NULL,
  institutionId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_study_buddy_changes_scope (courseId, instanceId, institutionId, id)
);
