# Kodigo: project context for Claude Code

Read this file at the start of every session. It holds the plan and decisions made during planning and design, so you do not need to ask the user to repeat them. Reply in English.

## 1. What we are building

**Kodigo** is a learning management system (LMS) for Java trainees, modeled on Zuitt's "Boodle" student interface. The user is building it as a MEVN (MongoDB, Express, Vue, Node) portfolio project, and it is meant to be used for real at Joysis, a training company.

Core idea: every class **session** has a Java **activity**. The trainee submits a **GitHub repo URL**. Kodigo **auto-checks** the code (JUnit tests) and shows **Pass or Fail** in the session row. A trainer can also grade manually (Pass or Fail) if the auto-checker has a problem.

This repo is the **backend** (`lms-server`). The Vue frontend comes later.

## 2. Links and access

- **GitHub repo:** https://github.com/sirjareth/lms-server
- **Trello board:** https://trello.com/b/Sv39uuuT/kodigo-lms. The current work is the list **"Sprint 1: Core API (User, Batch, Enrollment)"**. Trello is the source of truth for tasks.
- **Figma file:** https://www.figma.com/design/47RwF4bwiTsx5ufY1JzWwE (file key `47RwF4bwiTsx5ufY1JzWwE`). The **navy and blue** screens are current. Ignore the green/teal frames and anything marked v1 or v2, which are old.

### Ask for access at the start of the first session

Do not assume you can reach Trello or Figma. Check with `/mcp`. If either is missing, **ask the user to connect it** before starting work:

```
claude mcp add --transport http trello https://mcp.trello.com/v1
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Tell the user to sign in when prompted (use `/mcp` to check the status). Never ask the user to paste tokens or passwords into chat or into any file in this repo. Note that the user's Figma plan (Starter) limits how many Figma calls can be made, so avoid unnecessary Figma calls.

## 3. Stack and structure

Express + Mongoose + JWT. Follow this layout:

```
controllers/   request handlers (userController.js, batchController.js, enrollmentController.js)
models/        Mongoose schemas (User.js, Batch.js, Enrollment.js)
routes/        Express routers (userRoutes.js, batchRoutes.js, enrollmentRoutes.js)
auth.js        createAccessToken, verify middleware, role guards
index.js       app setup, DB connection, route mounting (app.use("/users", userRoutes), etc.)
passport.js    Google OAuth strategy (NOT part of Sprint 1)
.env           PORT, MONGODB_URI, JWT_SECRET (never commit)
```

Keep one controller and one router per entity. Mount routers in `index.js`.

## 4. Roles and permissions

Roles: `admin`, `trainer`, `trainee`.

| Action | Admin | Trainer | Trainee |
|---|---|---|---|
| Register (always creates a trainee) | yes | yes | yes |
| Change a user's role, deactivate users | yes | no | no |
| Create, update, archive batches | yes | yes | no |
| View batches | yes | yes | own batches only |
| Enroll users, view a batch roster | yes | yes | no |
| View enrollments | all | all | own only |

Rules: registration never lets the caller choose a role. Only an admin can make someone a trainer or admin. A deactivated user cannot log in. Missing or invalid token returns **401**; wrong role returns **403**.

## 5. Entities

Build Sprint 1 first (User, Batch, Enrollment). The rest are planned.

- **User:** name, email (unique), password (hashed with bcrypt), role (default `trainee`), isActive
- **Batch:** name (e.g. "Batch 12"), **programTitle (fixed value "Java": enum `["Java"]`, default `"Java"`)**, mode (e.g. "Day Class | Online"), startDate, endDate, trainers[], meetLink, isArchived
- **Enrollment:** user, batch, status (`active`, `dropped`, `completed`); unique index on user + batch
- **Module:** batch, code (e.g. `JV-MOD1`), title, order
- **Session:** module, batch, code (e.g. `JV-1.03`), title, order, scheduledAt, discussedAt, recordingUrl, meetEventId
- **Activity:** session, title, **type (`activity`, `capstone`, `exam`)**, instructions (a .md file), dueAt, passThreshold, maxAttempts, reference to the hidden JUnit test suite
- **Submission:** activity, trainee, githubUrl, commitSha, attemptNo, status (`queued`, `checking`, `passed`, `failed`, `error`), **gradedBy** (a user, or the auto-checker), **gradedAt**, **gradeSource** (`auto` or `manual`), submittedAt
- **CheckResult:** submission, testsTotal, testsPassed, per-test results, output log, durationMs, checkedAt. Kept separate so re-runs keep history and the original auto result survives a trainer override.
- **Attendance:** trainee, date, joinSegments[{start, end}], totalMinutes, status (**`present`, `excused`, `unexcused`**), source (`meet` or `manual`), overriddenBy, note
- **SessionFeedback:** session, trainee, rating (1 to 5), remarks
- **Grade:** not a collection at first. Compute it from CheckResult and Attendance.

## 6. Product decisions already made

- **No pop-ups on submit.** Submitting or resubmitting just updates the activity row to Pass or Fail. Resubmit is inline.
- **Trainers only mark Pass or Fail.** There is no written feedback from trainers on activities.
- **"Graded by" line** under each activity: "Graded by: <name or Kodigo auto-checker> @ <date and time>".
- **Manual grading** is a fallback for when the auto-checker has a problem. Keep the original auto result when a trainer overrides it.
- **Test results page:** "X of Y tests passed", one row per test with a pass/fail icon, and a Details line (JUnit message) under each failure. A compile error needs its own state (no tests ran).
- **Session feedback pop-up** (rating plus remarks) opens from "How was the session?".
- **Grades are pass/fail counts, not points.** Categories: Attendance, Capstones, Activities, Mock Technical Exam. The overall percentage comes from those counts. There is a Current Standing (so far) vs Final Grade toggle. The category weights are not decided yet.
- **Attendance** comes from Google Meet participant sessions: sum the join and leave segments per day, round the minutes, match trainees by email, merge overlapping segments. The rule for what counts as "present" (minimum minutes) is not decided yet and should be configurable.
- **Trainer view** has a "Select a Class" dropdown listing all batches.

## 7. Sprint 1 plan (build in this order)

Each Trello card has a Steps checklist. Follow it.

1. Project setup and folder structure: `GET /` returns 200 and the server connects to MongoDB.
2. User model and `POST /users/register`.
3. `POST /users/login` and JWT in `auth.js`.
4. Authorization middleware and role guards; `GET /users/details`.
5. User management (admin): `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/deactivate`, plus an admin seed script.
6. Batch model and CRUD.
7. Enrollment model and endpoints.
8. Postman collection and a role-access test matrix.

Sprint goal: all three entities have working APIs and every route enforces the right access.

**Not yet (do not build unless asked):** the Java auto-checker and its queue and sandbox, Google Meet attendance, grades, recordings, Google login (`passport.js`), and the Vue frontend.

## 8. Security rules

- Never commit `.env` or `oauth-cred.txt`. Keep both in `.gitignore`. Check this before the first push.
- Hash passwords with bcrypt. Never return password hashes in responses.
- Validate all input in controllers.
- Student code is untrusted. When the auto-checker is built later, it must run in an isolated sandbox with time limits and never inside the web server process.

## 9. How to work with the user

- The user is learning and building this for a portfolio and interviews. **Explain your choices briefly** so they can talk about the code themselves.
- Work on **one Trello card at a time** and follow its checklist.
- Show what you will change before making large edits, and keep commits small with clear messages.
- The user tests endpoints in Postman. After each step, say exactly what to test and what the expected result is.
- When a checklist item is done and the user confirms it works, tick it on the Trello card. When all items are done, move the card to **Done**.
- Do not invent features that are not in this file or on the board. Ask when something is unclear or undecided.
- Ask before adding a new dependency that is not listed in Sprint 1 setup.

## 10. Current status

Update this section after each finished card.

- Sprint 1: Core API (User, Batch, Enrollment) backend models, controllers, and routes fully implemented and mounted.
  - User API: register, login, getProfile (`GET /users/details`), getAllUsers (`GET /users`), updateRole (`PATCH /users/:id/role`), deactivateUser (`PATCH /users/:id/deactivate`).
  - Batch API: CRUD (`POST /batches`, `GET /batches`, `GET /batches/:id`, `PATCH /batches/:id`, `PATCH /batches/:id/archive`).
  - Enrollment API: enrollUser (`POST /enrollments`), getAllEnrollments (`GET /enrollments`), getUserEnrollments (`GET /enrollments/my-enrollments`), getBatchRoster (`GET /enrollments/batch/:batchId`), updateEnrollmentStatus (`PATCH /enrollments/:id/status`).
