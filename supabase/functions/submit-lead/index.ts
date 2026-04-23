/**
 * submit-lead/index.ts — Supabase Edge Function
 * Module 4.2 — Serverless API for Lead Submission
 *
 * Deploy: supabase functions deploy submit-lead
 *
 * Accepts POST with lead data, validates via Zod, verifies reCAPTCHA,
 * checks for duplicates, inserts into leads table, and syncs to Google Sheets.
 */

// @ts-nocheck — Deno runtime types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/* ═══════════════ ENVIRONMENT ═══════════════ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY") ?? "";
const SHEET_WEBHOOK_URL = Deno.env.get("SHEET_WEBHOOK_URL") ?? "";
const PRODUCTION_DOMAIN = Deno.env.get("PRODUCTION_DOMAIN") ?? "https://www.airastudycentre.com";

/* ═══════════════ ZOD SCHEMA ═══════════════ */

const LeadSchema = z.object({
  form_type: z.enum(["demo", "diagnostic"]),
  student_name: z.string().min(2).max(200),
  grade: z.number().int().min(7).max(10),
  subject: z.enum(["Maths", "Science", "Both"]),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  page_url: z.string().url().optional().default(""),
  utm_source: z.string().max(200).optional().default("(direct)"),
  recaptcha_token: z.string().optional().default(""),
  timestamp: z.string().optional(),
});

/* ═══════════════ CORS HEADERS ═══════════════ */

function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin =
    origin && (origin === PRODUCTION_DOMAIN || origin.includes("localhost"))
      ? origin
      : PRODUCTION_DOMAIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/* ═══════════════ reCAPTCHA VERIFICATION ═══════════════ */

async function verifyRecaptcha(token: string): Promise<{ success: boolean; score: number }> {
  if (!token || !RECAPTCHA_SECRET_KEY) {
    return { success: true, score: 1.0 }; // Skip if not configured
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });
    const result = await response.json();
    return {
      success: result.success ?? false,
      score: result.score ?? 0,
    };
  } catch {
    return { success: false, score: 1.0 }; // Fail open on error
  }
}

/* ═══════════════ MAIN HANDLER ═══════════════ */

serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? undefined;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse and validate payload
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const data = parsed.data;

    // ── reCAPTCHA Verification ──
    const captcha = await verifyRecaptcha(data.recaptcha_token);
    const recaptchaScore = captcha.score;

    if (recaptchaScore < 0.5) {
      // Log suspicious but don't block completely — insert with spam status
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("leads").insert({
        form_type: data.form_type,
        student_name: data.student_name,
        grade: data.grade,
        subject: data.subject,
        phone: data.phone,
        page_url: data.page_url,
        utm_source: data.utm_source,
        recaptcha_score: recaptchaScore,
        status: "spam",
      });

      return new Response(
        JSON.stringify({ error: "Submission flagged as suspicious" }),
        { status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    // ── Initialize Supabase client ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Duplicate Check (same phone + form_type within 24h) ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("phone", data.phone)
      .eq("form_type", data.form_type)
      .gte("created_at", twentyFourHoursAgo)
      .neq("status", "duplicate")
      .limit(1);

    if (existing && existing.length > 0) {
      // Mark as duplicate
      await supabase.from("leads").insert({
        form_type: data.form_type,
        student_name: data.student_name,
        grade: data.grade,
        subject: data.subject,
        phone: data.phone,
        page_url: data.page_url,
        utm_source: data.utm_source,
        recaptcha_score: recaptchaScore,
        status: "duplicate",
      });

      return new Response(
        JSON.stringify({ error: "Already submitted", message: "A submission with this phone number was already received in the last 24 hours." }),
        { status: 409, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    // ── Insert Lead ──
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        form_type: data.form_type,
        student_name: data.student_name,
        grade: data.grade,
        subject: data.subject,
        phone: data.phone,
        page_url: data.page_url,
        utm_source: data.utm_source,
        recaptcha_score: recaptchaScore,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      // Handle unique constraint violation (dedup index)
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Already submitted" }),
          { status: 409, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    // ── Sync to Google Sheets (non-blocking) ──
    if (SHEET_WEBHOOK_URL) {
      // Fire and forget — don't block the response
      fetch(SHEET_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: data.form_type,
          student_name: data.student_name,
          grade: data.grade,
          subject: data.subject,
          phone: data.phone,
          page_url: data.page_url,
          utm_source: data.utm_source,
          timestamp: data.timestamp || new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail — Sheet sync is secondary
      });
    }

    // ── Success Response ──
    return new Response(
      JSON.stringify({ success: true, lead_id: lead?.id }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
