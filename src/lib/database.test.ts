import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const C = "10000000-0000-4000-8000-000000000003";
let db: PGlite;
let orgA: string;
let orgB: string;
let leadA: string;
let leadB: string;
async function asUser<T>(user: string | null, run: () => Promise<T>) {
  await db.exec(`set role authenticated`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user || "",
  ]);
  try {
    return await run();
  } finally {
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false)",
    );
  }
}
async function rpcId(sql: string, args: unknown[] = []) {
  const r = await db.query<{ id: string }>(sql, args);
  return r.rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role authenticated nologin; create role anon nologin; create schema auth;
    create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  await db.exec(
    await readFile("supabase/migrations/202611120001_initial.sql", "utf8"),
  );
  await db.query(
    "insert into auth.users(id,email) values($1,'a@example.com'),($2,'b@example.com'),($3,'c@example.com')",
    [A, B, C],
  );
  orgA = await asUser(A, () =>
    rpcId("select public.create_organization('Tenant A') id"),
  );
  orgB = await asUser(B, () =>
    rpcId("select public.create_organization('Tenant B') id"),
  );
  leadA = await asUser(A, () =>
    rpcId(
      "insert into public.leads(organization_id,name) values($1,'Lead A') returning id",
      [orgA],
    ),
  );
  leadB = await asUser(B, () =>
    rpcId(
      "insert into public.leads(organization_id,name) values($1,'Lead B') returning id",
      [orgB],
    ),
  );
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL migration and tenant isolation", { concurrent: false }, () => {
  it("enables RLS on every application table", async () => {
    const r = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename,rowsecurity from pg_tables where schemaname='public'",
    );
    expect(r.rows.length).toBe(10);
    expect(r.rows.every((t) => t.rowsecurity)).toBe(true);
  });
  it("returns only the authenticated tenant's records", async () => {
    await asUser(A, async () => {
      expect((await db.query("select id from public.leads")).rows).toEqual([
        { id: leadA },
      ]);
      expect(
        (await db.query("select id from public.organizations")).rows,
      ).toEqual([{ id: orgA }]);
      expect((await db.query("select id from public.profiles")).rows).toEqual([
        { id: A },
      ]);
    });
    await asUser(B, async () =>
      expect((await db.query("select id from public.leads")).rows).toEqual([
        { id: leadB },
      ]),
    );
  });
  it("blocks cross-tenant insert, update, delete, and organization moves", async () => {
    await asUser(A, async () => {
      await expect(
        db.query(
          "insert into public.leads(organization_id,name) values($1,'attack')",
          [orgB],
        ),
      ).rejects.toThrow();
      expect(
        (
          await db.query(
            "update public.leads set name='attack' where id=$1 returning id",
            [leadB],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query("delete from public.leads where id=$1 returning id", [
            leadB,
          ])
        ).rows,
      ).toEqual([]);
      await expect(
        db.query("update public.leads set organization_id=$1 where id=$2", [
          orgB,
          leadA,
        ]),
      ).rejects.toThrow();
    });
  });
  it("rejects cross-tenant foreign keys", async () => {
    await asUser(A, async () => {
      await expect(
        db.query(
          "insert into public.tasks(organization_id,lead_id,title,due_at) values($1,$2,'attack',now())",
          [orgA, leadB],
        ),
      ).rejects.toThrow();
    });
  });
  it("does not expose audit or AI records from other tenants", async () => {
    await asUser(A, async () => {
      expect(
        (
          await db.query(
            "select id from public.audit_logs where organization_id=$1",
            [orgB],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            "select id from public.ai_suggestions where organization_id=$1",
            [orgB],
          )
        ).rows,
      ).toEqual([]);
    });
  });
  it("prevents membership forgery and protects the owner", async () => {
    await asUser(B, async () => {
      await expect(
        db.query(
          "insert into public.memberships(organization_id,user_id,role) values($1,$2,'owner')",
          [orgA, B],
        ),
      ).rejects.toThrow();
      await expect(
        db.query("select public.set_member($1,'b@example.com','admin')", [
          orgA,
        ]),
      ).rejects.toThrow();
    });
    await asUser(A, async () => {
      await expect(
        db.query("select public.remove_member($1,$2)", [orgA, A]),
      ).rejects.toThrow();
      await db.query("select public.set_member($1,'c@example.com','member')", [
        orgA,
      ]);
    });
    await asUser(C, async () => {
      await expect(
        db.query(
          "update public.memberships set role='owner' where organization_id=$1 and user_id=$2",
          [orgA, C],
        ),
      ).rejects.toThrow();
      expect(
        (
          await db.query(
            "update public.organizations set name='attack' where id=$1 returning id",
            [orgA],
          )
        ).rows,
      ).toEqual([]);
      await expect(
        db.query("select public.set_member($1,'b@example.com','member')", [
          orgA,
        ]),
      ).rejects.toThrow();
    });
  });
  it("returns team contact details only to managers", async () => {
    await asUser(C, async () => {
      const rows = await db.query<{ email: string | null }>(
        "select * from public.list_members($1)",
        [orgA],
      );
      expect(rows.rows.length).toBe(2);
      expect(rows.rows.every((row) => row.email === null)).toBe(true);
    });
    await asUser(A, async () => {
      const rows = await db.query<{ email: string | null }>(
        "select * from public.list_members($1)",
        [orgA],
      );
      expect(rows.rows.map((row) => row.email)).toContain("c@example.com");
    });
    await asUser(B, async () => {
      await expect(
        db.query("select * from public.list_members($1)", [orgA]),
      ).rejects.toThrow();
    });
  });
  it("bootstraps an existing user's workspace idempotently", async () => {
    await asUser(A, async () => {
      expect(await rpcId("select public.ensure_workspace() id")).toBe(orgA);
      expect(await rpcId("select public.ensure_workspace() id")).toBe(orgA);
    });
  });
  it("limits writes atomically and does not accept user-selected limits", async () => {
    await asUser(C, async () => {
      for (let i = 0; i < 60; i++)
        expect(
          (
            await db.query<{ ok: boolean }>(
              "select public.take_rate_limit('write') ok",
            )
          ).rows[0].ok,
        ).toBe(true);
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select public.take_rate_limit('write') ok",
          )
        ).rows[0].ok,
      ).toBe(false);
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select public.take_rate_limit('unknown') ok",
          )
        ).rows[0].ok,
      ).toBe(false);
      await expect(
        db.query("delete from public.request_counters"),
      ).rejects.toThrow();
    });
  });
  it("reserves AI quota and approves a suggestion only once", async () => {
    const analysis = {
      summary: "A home enquiry",
      intent: "Buying",
      budget: null,
      location: null,
      property_type: null,
      missing_information: ["Budget"],
      follow_up: "Ask the customer about their budget",
      reply: "Hello, could you share your budget and preferred location?",
    };
    let suggestion = "";
    await asUser(A, async () => {
      const run = await rpcId("select public.reserve_ai($1,$2) id", [
        orgA,
        leadA,
      ]);
      suggestion = await rpcId(
        "select public.store_ai_analysis($1,$2,$3,$4,$5::jsonb) id",
        [orgA, run, leadA, "I am looking for a home", JSON.stringify(analysis)],
      );
      await expect(
        db.query("select public.store_ai_analysis($1,$2,$3,$4,$5::jsonb)", [
          orgA,
          run,
          leadA,
          "I am looking for a home",
          JSON.stringify(analysis),
        ]),
      ).rejects.toThrow();
      await db.query(
        "select public.approve_suggestion($1,$2,'Hello, please share your preferences.',true)",
        [orgA, suggestion],
      );
      await db.query(
        "select public.approve_suggestion($1,$2,'Hello, please share your preferences.',true)",
        [orgA, suggestion],
      );
      expect(
        (
          await db.query("select id from public.tasks where lead_id=$1", [
            leadA,
          ])
        ).rows,
      ).toHaveLength(1);
    });
    await asUser(B, async () => {
      expect(
        (
          await db.query("select id from public.ai_suggestions where id=$1", [
            suggestion,
          ])
        ).rows,
      ).toEqual([]);
      await expect(
        db.query(
          "select public.approve_suggestion($1,$2,'Hello, please share your preferences.',true)",
          [orgA, suggestion],
        ),
      ).rejects.toThrow();
      await expect(
        db.query("select public.reserve_ai($1,$2)", [orgB, leadA]),
      ).rejects.toThrow();
    });
  });
  it("enforces organization daily AI budget", async () => {
    await asUser(B, async () => {
      for (let i = 0; i < 20; i++)
        await db.query("select public.reserve_ai($1,$2)", [orgB, leadB]);
      await expect(
        db.query("select public.reserve_ai($1,$2)", [orgB, leadB]),
      ).rejects.toThrow(/ai_quota_exceeded/);
    });
  });
  it("validates structured AI data at the database boundary", async () => {
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.valid_analysis('{}'::jsonb) ok",
        )
      ).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.valid_analysis('null'::jsonb) ok",
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("does not record PII in audit records", async () => {
    const r = await db.query("select * from public.audit_logs");
    const json = JSON.stringify(r.rows);
    expect(json).not.toContain("example.com");
    expect(json).not.toContain("Lead A");
    expect(json).not.toContain("preferences");
  });
  it("denies unauthenticated access", async () => {
    await asUser(null, async () => {
      expect((await db.query("select id from public.leads")).rows).toEqual([]);
      await expect(
        db.query("select public.create_organization('Attack')"),
      ).rejects.toThrow();
    });
  });
  it("cascades personal data deletion and prevents a member from purging", async () => {
    await asUser(C, async () => {
      await expect(
        db.query("select public.purge_expired($1)", [orgA]),
      ).rejects.toThrow();
    });
    await asUser(A, async () => {
      await db.query("delete from public.leads where id=$1", [leadA]);
      expect(
        (
          await db.query("select id from public.tasks where lead_id=$1", [
            leadA,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            "select id from public.ai_suggestions where lead_id=$1",
            [leadA],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            "select id from public.lead_messages where lead_id=$1",
            [leadA],
          )
        ).rows,
      ).toEqual([]);
    });
  });
  it("preserves consumed quota after lead deletion", async () => {
    expect(
      (
        await db.query("select id from public.ai_runs where lead_id=$1", [
          leadA,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("allows operator organization deletion to cascade without recreating audit rows", async () => {
    const org = await asUser(A, () =>
      rpcId("select public.create_organization('Temporary workspace') id"),
    );
    await db.query("delete from public.organizations where id=$1", [org]);
    expect(
      (
        await db.query(
          "select id from public.audit_logs where organization_id=$1",
          [org],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await db.query(
          "select user_id from public.memberships where organization_id=$1",
          [org],
        )
      ).rows,
    ).toEqual([]);
  });
});
