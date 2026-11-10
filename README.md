# StudyBuddyLTI

<img width="911" height="899" alt="Screenshot from 2026-11-10 08-45-47" src="https://github.com/user-attachments/assets/7686e35f-8659-44ee-b476-7099d631b875" />

Standalone Next.js application for the Study Buddy LTI tool.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:4200.

For LTI configuration, copy `.env.example` to `.env.local` and set a secret:

```env
LTI_PLATFORM_ISSUER=http://localhost
LTI_CLIENT_ID=your-client-id
LTI_DEPLOYMENT_ID=1
LTI_PLATFORM_JWKS_URL=http://localhost/Modules/LTIConsumer/lticerts.php
LTI_PLATFORM_AUTHORIZATION_ENDPOINT=http://localhost/Modules/LTIConsumer/ltiauth.php
LTI_REDIRECT_URI=http://localhost:4200/api/lti/launch
LTI_TOOL_PUBLIC_KEY_PATH=keys/lti-public.pem
LTI_TOOL_KEY_ID=main
FLASK_SECRET_KEY=use-a-random-local-secret
LTI_TEXT=Welcome to the LTI external tool.
HOST=localhost
PORT=4200
LTI_TOOL_BASE_URL=http://localhost:4200
```

## Datenbank einrichten

Study-Buddy-Daten werden in MariaDB/MySQL gespeichert. Kopiere zunächst die
Konfiguration und trage ein Datenbankpasswort ein:

```bash
cp .env.example .env.local
```

Passe danach in `.env.local` mindestens diese Werte an:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=studybuddy
MYSQL_PASSWORD="dein-datenbankpasswort"
MYSQL_COMMENTS_DATABASE=studybuddy
```

Falls Datenbank und Benutzer noch nicht existieren, lege sie als
MySQL/MariaDB-Administrator an:

```bash
sudo mysql
```

```sql
CREATE DATABASE IF NOT EXISTS studybuddy;
CREATE USER IF NOT EXISTS 'studybuddy'@'localhost'
  IDENTIFIED BY 'dein-datenbankpasswort';
CREATE USER IF NOT EXISTS 'studybuddy'@'127.0.0.1'
  IDENTIFIED BY 'dein-datenbankpasswort';
GRANT ALL PRIVILEGES ON studybuddy.* TO 'studybuddy'@'localhost';
GRANT ALL PRIVILEGES ON studybuddy.* TO 'studybuddy'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

Das Passwort in den `CREATE USER`-Befehlen muss mit `MYSQL_PASSWORD` in
`.env.local` übereinstimmen. Lade die Variablen in die Shell:

```bash
set -a
. .env.local
set +a
```

Erzeuge anschließend die Tabellen:

```bash
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" \
  -p"$MYSQL_PASSWORD" \
  "$MYSQL_COMMENTS_DATABASE" < database/study-buddy.sql
```

Die Verbindung kann vorher getestet werden:

```bash
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" \
  -p"$MYSQL_PASSWORD" "$MYSQL_COMMENTS_DATABASE" -e "SELECT 1;"
```

Das Schema ist mit den Tabellen `StudyBuddyUsers` und
`StudyBuddyConnections` aus der Originalimplementierung in
`ALeA/packages/lti-application` kompatibel.


## Serverbetrieb
In index.tsx change `http://localhost:4200/StudyBuddy` to `https://studon-staging.kwarc.info/StudyBuddy` 
