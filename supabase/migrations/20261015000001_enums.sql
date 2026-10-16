-- Generated from shared/vocab.ts by scripts/gen-enum-sql.ts. Do not edit by hand.
-- tests/db/enums-match-vocab.test.ts fails if these ever differ from vocab.ts.

create extension if not exists citext with schema extensions;

create type public.stage as enum ('idea', 'prototype', 'pilot_users', 'revenue');
create type public.sector as enum ('software', 'fintech', 'health_biotech', 'medtech', 'deep_tech_hardware', 'energy_climate', 'consumer', 'education', 'social_impact', 'food_ag', 'other');
create type public.school as enum ('unc', 'duke', 'nc_state', 'nccu', 'other', 'none');
create type public.student_status as enum ('undergrad', 'grad', 'recent_alum', 'faculty_staff', 'not_affiliated');
create type public.opportunity_type as enum ('university_grant', 'pitch_competition', 'state_grant', 'federal_grant', 'fellowship', 'accelerator', 'showcase_conference');
create type public.geography_level as enum ('campus', 'triangle', 'north_carolina', 'southeast', 'national');
create type public.material_key as enum ('pitch_deck', 'pitch_video', 'one_pager', 'executive_summary', 'budget', 'faculty_sponsor_letter', 'financials', 'demo', 'team_bios', 'business_plan');
create type public.answer_key as enum ('problem', 'solution', 'customer', 'market', 'competition', 'team', 'traction', 'business_model', 'use_of_funds', 'impact');
create type public.answer_length as enum ('short', 'medium', 'long');
create type public.milestone as enum ('incorporated', 'prototype_built', 'first_pilot', 'first_paying_customer', 'first_revenue', 'won_award', 'graduated');
create type public.founder_group as enum ('woman_founder', 'veteran', 'black_founder', 'hispanic_latino_founder', 'native_american_founder', 'first_generation_college', 'lgbtq_founder', 'founder_with_disability');
create type public.verification_status as enum ('unverified', 'verified', 'organizer_verified');
create type public.application_status as enum ('planning', 'applied', 'won', 'not_selected', 'waiting', 'skipped');
create type public.deadline_type as enum ('fixed', 'rolling', 'recurring');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.email_kind as enum ('digest', 'reminder', 'checkin');
create type public.material_kind as enum ('file', 'link');
create type public.share_mode as enum ('password', 'invite');
create type public.event_name as enum ('intake_started', 'layer0_finished', 'account_created', 'layer2_finished', 'plan_generated', 'application_status_changed', 'outcome_reported', 'share_created', 'share_opened');
create type public.university_ip as enum ('yes', 'no', 'not_sure');
create type public.team_size as enum ('solo', 'two_to_three', 'four_to_ten', 'eleven_plus');
create type public.paying_customers_range as enum ('none', 'one_to_ten', 'eleven_to_hundred', 'over_hundred');
create type public.monthly_revenue_range as enum ('none', 'under_1k', 'from_1k_to_10k', 'from_10k_to_50k', 'over_50k');
create type public.funding_needed_range as enum ('under_10k', 'from_10k_to_50k', 'from_50k_to_250k', 'over_250k');
create type public.us_state as enum ('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'outside_us');
