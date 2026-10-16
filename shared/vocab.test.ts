import { describe, expect, it } from 'vitest';
import {
  assertKnownKeys, CSV_COLUMNS, DB_ENUMS, LAYER0_FIELD_KEYS, LAYER2_FIELD_KEYS, MILESTONES, PROFILE_FIELDS,
  PROFILE_FIELD_KEYS, RULE_FIELD_KEYS, STAGES, valueLabel, VALUE_LABELS, orderOf,
} from './vocab.ts';

describe('assertKnownKeys', () => {
  it('passes for known keys', () => {
    expect(() => assertKnownKeys(['stage', 'sector', 'pitch_deck', 'problem'], 'test')).not.toThrow();
  });
  it('throws on an unknown key and names the caller and key', () => {
    expect(() => assertKnownKeys(['stage', 'stge'], 'intake form')).toThrow(/intake form.*stge/);
  });
  it('checks against an explicit allowed list when given', () => {
    expect(() => assertKnownKeys(['problem'], 'answers', ['problem', 'team'])).not.toThrow();
    expect(() => assertKnownKeys(['stage'], 'answers', ['problem', 'team'])).toThrow(/stage/);
  });
});

describe('vocabulary', () => {
  it('has the spec enumerations exactly', () => {
    expect(STAGES).toEqual(['idea', 'prototype', 'pilot_users', 'revenue']);
    expect(DB_ENUMS.application_status).toEqual(['planning', 'applied', 'won', 'not_selected', 'waiting', 'skipped']);
    expect(DB_ENUMS.verification_status).toEqual(['unverified', 'verified', 'organizer_verified']);
    expect(MILESTONES).toHaveLength(7);
    expect(DB_ENUMS.founder_group).toHaveLength(8);
  });

  it('has the Layer 0 fields from spec section 4', () => {
    expect([...LAYER0_FIELD_KEYS].sort()).toEqual(
      ['city', 'incorporated', 'school', 'sector', 'stage', 'state', 'student_status'].sort(),
    );
  });

  it('has every Layer 2 field from spec section 4, plus majority_us_owned (PLAN Q2)', () => {
    expect([...LAYER2_FIELD_KEYS].sort()).toEqual([
      'equity_ok', 'founded_on', 'funding_deadline', 'funding_needed', 'incorporation_state',
      'majority_us_owned', 'monthly_revenue_range', 'paying_customers', 'team_size', 'university_ip',
      'us_citizen_or_pr',
    ].sort());
  });

  it('gives every field a label, question and why-we-ask note', () => {
    for (const key of PROFILE_FIELD_KEYS) {
      const f = PROFILE_FIELDS[key];
      expect(f.key).toBe(key);
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.question.length).toBeGreaterThan(0);
      expect(f.why.length).toBeGreaterThan(0);
    }
  });

  it('labels every enum value', () => {
    for (const values of Object.values(DB_ENUMS)) {
      for (const v of values) {
        if (/^[A-Z]{2}$/.test(v) || v === 'outside_us') continue; // state codes are their own label
        expect(VALUE_LABELS[v], `label for ${v}`).toBeDefined();
      }
    }
  });

  it('uses context labels where a value key is shared', () => {
    expect(valueLabel('none', 'monthly_revenue_range')).toBe('No revenue yet');
    expect(valueLabel('from_10k_to_50k', 'funding_needed')).toBe('$10,000 to $50,000');
    expect(valueLabel('from_10k_to_50k', 'monthly_revenue_range')).toBe('$10,000 to $50,000 a month');
  });

  it('only orders the fields that have an order', () => {
    expect(orderOf('stage')).toEqual(STAGES);
    expect(orderOf('sector')).toBeUndefined();
  });

  it('lets rules name milestones and profile fields but not founder groups', () => {
    expect(RULE_FIELD_KEYS).toContain('first_pilot');
    expect(RULE_FIELD_KEYS).toContain('incorporation_state');
    expect(RULE_FIELD_KEYS).not.toContain('founder_groups');
  });

  it('has the exact 29 CSV columns from spec section 10', () => {
    expect(CSV_COLUMNS).toHaveLength(29);
    expect(CSV_COLUMNS[0]).toBe('slug');
    expect(CSV_COLUMNS[CSV_COLUMNS.length - 1]).toBe('research_notes');
  });

  it('contains no em dashes or all-caps labels', () => {
    const labels = [
      ...Object.values(VALUE_LABELS),
      ...PROFILE_FIELD_KEYS.flatMap((k) => [PROFILE_FIELDS[k].label, PROFILE_FIELDS[k].question, PROFILE_FIELDS[k].why]),
    ];
    for (const l of labels) {
      expect(l).not.toContain('—');
      expect(/^[A-Z ]{4,}$/.test(l), l).toBe(false);
    }
  });
});
