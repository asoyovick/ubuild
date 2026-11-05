import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = path.resolve(root, "../backend");
const roles = [
  "OWNER",
  "COORDINATOR",
  "ARCHITECT",
  "ENGINEER",
  "QUANTITY_SURVEYOR",
  "SITE_SUPERVISOR",
  "CONTRACTOR",
  "SUPPLIER",
];
const labels = {
  OWNER: "Owner",
  COORDINATOR: "Coordinator",
  ARCHITECT: "Architect",
  ENGINEER: "Engineer",
  QUANTITY_SURVEYOR: "Quantity Surveyor",
  SITE_SUPERVISOR: "Site Supervisor",
  CONTRACTOR: "Contractor",
  SUPPLIER: "Supplier",
};

let testRoot;
let testProjectDir;
let baseUrl;
let apiBaseUrl;
let server;
let apiServer;
let serverError = "";
let apiServerError = "";

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before starting. ${serverError}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.status === 200) return;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Next.js. ${serverError}`);
}

async function waitForAPI() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (apiServer.exitCode !== null) throw new Error(`Go API exited before starting. ${apiServerError}`);
    try {
      const response = await fetch(`${apiBaseUrl}/healthz`);
      if (response.status === 200) return;
    } catch {
      // The Go API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Go API. ${apiServerError}`);
}

before(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), "ubuild-registration-"));
  testProjectDir = path.join(testRoot, "project");
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const apiPort = await availablePort();
  apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  const apiBinary = path.join(testRoot, "ubuild-api");
  execFileSync("go", ["build", "-o", apiBinary, "./cmd/api"], { cwd: backendRoot });
  apiServer = spawn(apiBinary, [], {
    cwd: backendRoot,
    env: {
      ...process.env,
      UBUILD_API_ADDR: `127.0.0.1:${apiPort}`,
      DATABASE_URL: path.join(testRoot, "backend", "test.db"),
      UBUILD_ALLOWED_ORIGIN: baseUrl,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  apiServer.stderr.setEncoding("utf8");
  apiServer.stderr.on("data", (chunk) => { apiServerError = `${apiServerError}${chunk}`.slice(-5000); });
  await waitForAPI();
  await cp(root, testProjectDir, {
    recursive: true,
    filter: (source) => !/(^|\/)(?:\.git|\.next|node_modules|data)(?:\/|$)/.test(source.slice(root.length)),
  });
  await symlink(path.join(root, "node_modules"), path.join(testProjectDir, "node_modules"));
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: testProjectDir,
      env: {
        ...process.env,
        UBUILD_DATA_DIR: path.join(testRoot, "legacy-data"),
        UBUILD_API_URL: apiBaseUrl,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", (chunk) => {
    serverError = `${serverError}${chunk}`.slice(-5000);
  });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  if (apiServer && apiServer.exitCode === null) {
    apiServer.kill("SIGTERM");
    await new Promise((resolve) => apiServer.once("exit", resolve));
  }
  if (testRoot) await rm(testRoot, { recursive: true, force: true });
});

async function register(values) {
  const response = await fetch(`${baseUrl}/api/backend/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  return {
    response,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";", 1)[0],
  };
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/backend/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return {
    response,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";", 1)[0],
  };
}

function validDetails(overrides = {}) {
  return {
    name: "Amina Njoroge",
    email: "amina@example.test",
    role: "ARCHITECT",
    password: "Secure-pass-123",
    confirmPassword: "Secure-pass-123",
    ...overrides,
  };
}

test("registration validates required fields, email, role and password confirmation", async () => {
  const missing = await register({});
  assert.equal(missing.response.status, 422);
  for (const field of ["name", "email", "role", "password", "confirmPassword"]) {
    assert.ok(missing.body.errors[field], `missing ${field} validation`);
  }

  const invalidEmail = await register(validDetails({ email: "not-an-email" }));
  assert.equal(invalidEmail.response.status, 422);
  assert.ok(invalidEmail.body.errors.email);

  const mismatched = await register(validDetails({ confirmPassword: "Different-pass-123" }));
  assert.equal(mismatched.response.status, 422);
  assert.ok(mismatched.body.errors.confirmPassword);

  const weakPassword = await register(validDetails({ password: "short", confirmPassword: "short" }));
  assert.equal(weakPassword.response.status, 422);
  assert.ok(weakPassword.body.errors.password);

  const invalidRole = await register(validDetails({ role: "ADMIN" }));
  assert.equal(invalidRole.response.status, 422);
  assert.ok(invalidRole.body.errors.role);
});

test("each existing project role persists as profile data and works with login", async () => {
  for (const [index, role] of roles.entries()) {
    const email = `role-${index}@example.test`;
    const details = validDetails({
      name: `Test ${labels[role]}`,
      email: `  ${email.toUpperCase()}  `,
      role,
    });
    const created = await register(details);

    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.user.name, details.name);
    assert.equal(created.body.user.email, email);
    assert.equal(created.body.user.profileRole, role);
    assert.equal(Object.hasOwn(created.body.user, "passwordHash"), false);
    assert.equal(Object.hasOwn(created.body.user, "confirmPassword"), false);
    assert.ok(created.cookie, "registration establishes a session");

    const sessionResponse = await fetch(`${baseUrl}/api/backend/auth/me`, {
      headers: { cookie: created.cookie },
    });
    assert.equal(sessionResponse.status, 200);
    const sessionUser = (await sessionResponse.json()).user;
    assert.equal(typeof sessionUser.id, "string");
    assert.equal(sessionUser.name, details.name);
    assert.equal(sessionUser.email, email);
    assert.equal(sessionUser.profileRole, role);

    const signedIn = await login(email, details.password);
    assert.equal(signedIn.response.status, 200);
    assert.equal(signedIn.body.user.profileRole, role);
    assert.ok(signedIn.cookie, "login establishes a session");

    const dashboard = await fetch(`${baseUrl}/dashboard`, {
      headers: { cookie: signedIn.cookie },
    });
    assert.equal(dashboard.status, 200);
    const dashboardMarkup = await dashboard.text();
    assert.ok(dashboardMarkup.includes(details.name));
    assert.ok(dashboardMarkup.includes(`${labels[role]} workspace`));

    const settings = await fetch(`${baseUrl}/dashboard/settings`, {
      headers: { cookie: signedIn.cookie },
    });
    const settingsMarkup = await settings.text();
    assert.ok(settingsMarkup.includes(details.name));
    assert.ok(settingsMarkup.includes(email));
    assert.ok(settingsMarkup.includes(labels[role]));
  }

});

test("email uniqueness is case-insensitive", async () => {
  const first = await register(validDetails({ email: "Duplicate@example.test" }));
  assert.equal(first.response.status, 201);

  const duplicate = await register(validDetails({ email: " duplicate@EXAMPLE.test " }));
  assert.equal(duplicate.response.status, 409);
  assert.ok(duplicate.body.errors.email);

  const signedIn = await login("DUPLICATE@example.test", "Secure-pass-123");
  assert.equal(signedIn.response.status, 200);
  assert.equal(signedIn.body.user.profileRole, "ARCHITECT");
  const dashboard = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie: signedIn.cookie },
  });
  assert.equal(dashboard.status, 200);
  assert.ok((await dashboard.text()).includes("Overview"));
});

test("profile role does not grant access to a project without membership", async () => {
  const owner = await register(validDetails({ email: "project-owner@example.test", role: "OWNER" }));
  assert.equal(owner.response.status, 201);
  const projectResponse = await fetch(`${baseUrl}/api/backend/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ name: "Authorized project", location: "Nairobi", type: "New build" }),
  });
  assert.equal(projectResponse.status, 201);
  const { project } = await projectResponse.json();
  const dashboardProjects = await fetch(`${baseUrl}/dashboard/projects`, {
    headers: { cookie: owner.cookie },
  });
  assert.equal(dashboardProjects.status, 200);
  assert.ok((await dashboardProjects.text()).includes("Authorized project"));
  const projectActivity = await fetch(`${baseUrl}/dashboard/projects/${project.id}/activity`, {
    headers: { cookie: owner.cookie },
  });
  assert.equal(projectActivity.status, 200);
  assert.ok((await projectActivity.text()).includes("project created"));

  const architect = await register(validDetails({ email: "architect@example.test", role: "ARCHITECT" }));
  assert.equal(architect.response.status, 201);
  const denied = await fetch(`${baseUrl}/api/backend/projects/${project.id}`, {
    headers: { cookie: architect.cookie },
  });
  const deniedBody = await denied.text();
  assert.ok(!deniedBody.includes("Authorized project"), "non-member cannot retrieve project data");

  const allowed = await fetch(`${baseUrl}/api/backend/projects/${project.id}`, {
    headers: { cookie: owner.cookie },
  });
  assert.equal(allowed.status, 200);
  const access = await allowed.json();
  assert.equal(access.membership.role, "OWNER");
});
