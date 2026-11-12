import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { demoCopilot } from "./inbox";
const A = "30000000-0000-4000-8000-000000000001",
  B = "30000000-0000-4000-8000-000000000002";
let db: PGlite,
  orgA: string,
  orgB: string,
  leadA: string,
  leadB: string,
  convA: string,
  convB: string;
async function user<T>(id: string, run: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await run();
  } finally {
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false)",
    );
  }
}
async function id(sql: string, args: unknown[] = []) {
  return (await db.query<{ id: string }>(sql, args)).rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role authenticated nologin;create role anon nologin;create schema auth;create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;`,
  );
  await db.exec(
    await readFile("supabase/migrations/202611120001_initial.sql", "utf8"),
  );
  await db.query(
    "insert into auth.users(id,email) values($1,'first@example.com'),($2,'second@example.com')",
    [A, B],
  );
  orgA = await user(A, () =>
    id("select public.create_organization('Original tenant') id"),
  );
  orgB = await user(B, () =>
    id("select public.create_organization('Other tenant') id"),
  );
  leadA = await user(A, () =>
    id(
      "insert into public.leads(organization_id,name,notes) values($1,'Existing customer','Preserved original notes') returning id",
      [orgA],
    ),
  );
  leadB = await user(B, () =>
    id(
      "insert into public.leads(organization_id,name) values($1,'Other customer') returning id",
      [orgB],
    ),
  );
  await db.query(
    "insert into public.lead_messages(organization_id,lead_id,content) values($1,$2,'Original customer message before migration')",
    [orgA, leadA],
  );
  await db.exec(
    await readFile(
      "supabase/migrations/202611120002_communication_workspace.sql",
      "utf8",
    ),
  );
  convA = await id("select id from public.conversations where lead_id=$1", [
    leadA,
  ]);
  convB = await id("select id from public.conversations where lead_id=$1", [
    leadB,
  ]);
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("additive communication migration", { concurrent: false }, () => {
  it("preserves existing customer and message data and links conversations", async () => {
    expect(
      (
        await db.query<{ notes: string }>(
          "select notes from public.leads where id=$1",
          [leadA],
        )
      ).rows[0].notes,
    ).toBe("Preserved original notes");
    const m = (
      await db.query<{
        content: string;
        conversation_id: string;
        direction: string;
        state: string;
      }>(
        "select content,conversation_id,direction,state from public.lead_messages where lead_id=$1",
        [leadA],
      )
    ).rows[0];
    expect(m.content).toBe("Original customer message before migration");
    expect(m.conversation_id).toBe(convA);
    expect(m.direction).toBe("inbound");
    expect(m.state).toBe("received");
  });
  it("creates a conversation for new CRM customers", async () => {
    const lead = await user(A, () =>
      id(
        "insert into public.leads(organization_id,name) values($1,'New customer') returning id",
        [orgA],
      ),
    );
    expect(
      (
        await db.query("select id from public.conversations where lead_id=$1", [
          lead,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("isolates conversations and blocks assignment to another tenant's user", async () => {
    await user(A, async () => {
      expect(
        (
          await db.query("select id from public.conversations where id=$1", [
            convB,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            "update public.conversations set unread_count=0 where id=$1 returning id",
            [convB],
          )
        ).rows,
      ).toHaveLength(0);
      await expect(
        db.query("update public.conversations set assignee_id=$1 where id=$2", [
          B,
          convA,
        ]),
      ).rejects.toThrow();
      await db.query(
        "update public.conversations set assignee_id=$1 where id=$2",
        [A, convA],
      );
    });
  });
  it("records approved drafts only, idempotently, without a delivered status", async () => {
    await user(A, async () => {
      const request = "40000000-0000-4000-8000-000000000001";
      await db.query(
        "select public.record_approved_reply($1,$2,'Reviewed internal reply',$3)",
        [orgA, convA, request],
      );
      await db.query(
        "select public.record_approved_reply($1,$2,'Reviewed internal reply',$3)",
        [orgA, convA, request],
      );
      const rows = (
        await db.query<{ state: string }>(
          "select state from public.lead_messages where direction='outbound'",
        )
      ).rows;
      expect(rows).toEqual([{ state: "approved" }]);
      await expect(
        db.query(
          "insert into public.lead_messages(organization_id,lead_id,content,direction,state) values($1,$2,'Forged send','outbound','delivered')",
          [orgA, leadA],
        ),
      ).rejects.toThrow();
    });
  });
  it("denies cross-tenant approval and catalogue writes", async () => {
    await user(B, async () => {
      await expect(
        db.query(
          "select public.record_approved_reply($1,$2,'Cross tenant attempt',gen_random_uuid())",
          [orgA, convA],
        ),
      ).rejects.toThrow();
      await expect(
        db.query(
          "insert into public.properties(organization_id,title,city,district,price,currency,rooms,property_type,listing_type,elevator,floor) values($1,'Wrong tenant listing','Çanakkale','Merkez',100,'TRY','2+1','apartment','sale',true,'middle_floor')",
          [orgA],
        ),
      ).rejects.toThrow();
    });
  });
  it("keeps a catalogue listing visible only to its tenant", async () => {
    await user(A, () =>
      db.query(
        "insert into public.properties(organization_id,title,city,district,price,currency,rooms,property_type,listing_type,elevator,floor) values($1,'Saved listing','Çanakkale','Merkez',2800000,'TRY','2+1','apartment','sale',true,'middle_floor')",
        [orgA],
      ),
    );
    await user(B, async () =>
      expect(
        (await db.query("select id from public.properties")).rows,
      ).toHaveLength(0),
    );
  });
  it("stores only a reserved analysis for the same tenant and message version", async () => {
    await user(A, async () => {
      const run = await id("select public.reserve_ai($1,$2) id", [orgA, leadA]);
      const latest = await id(
        "select id from public.lead_messages where conversation_id=$1 and direction='inbound' order by created_at desc,id desc limit 1",
        [convA],
      );
      const analysis = JSON.stringify(
        demoCopilot("Çanakkale merkezde 3 milyon TL 2+1 satılık daire", "tr"),
      );
      await expect(
        db.query(
          "select public.save_copilot($1,$2,$3,$4::jsonb,gen_random_uuid())",
          [orgA, convA, run, analysis],
        ),
      ).rejects.toThrow(/conversation_changed/);
      await db.query("select public.save_copilot($1,$2,$3,$4::jsonb,$5)", [
        orgA,
        convA,
        run,
        analysis,
        latest,
      ]);
      await expect(
        db.query("select public.save_copilot($1,$2,$3,$4::jsonb,$5)", [
          orgA,
          convA,
          run,
          analysis,
          latest,
        ]),
      ).rejects.toThrow(/invalid_reservation/);
    });
  });
});
