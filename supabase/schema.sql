-- Samsung GEO Tool Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (synced with Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Product categories (Mobile, Watch, Ring, etc.)
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_ko text,
  icon text,
  sort_order int default 0
);

-- Products (Galaxy S25 Ultra, Galaxy Watch 7, etc.)
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  code_name text,
  created_at timestamptz default now()
);

-- Briefs (ONE per product, with versioning)
create table if not exists public.briefs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  version int default 1,
  usps text[] not null default '{}',
  content text,
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references public.users(id) on delete set null
);

-- Generated content logs
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  brief_id uuid references public.briefs(id) on delete set null,

  -- Input
  video_url text,
  srt_content text not null,
  selected_keywords text[] default '{}',

  -- Output
  description text,
  timestamps text,
  hashtags text[] default '{}',
  faq text,

  -- Status
  status text default 'draft' check (status in ('draft', 'confirmed')),
  campaign_tag text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Grounding results cache
create table if not exists public.grounding_cache (
  id uuid primary key default uuid_generate_v4(),
  product_name text not null,
  keywords jsonb not null default '[]',
  sources jsonb not null default '[]',
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Indexes for performance
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_briefs_product on public.briefs(product_id);
create index if not exists idx_briefs_active on public.briefs(product_id, is_active) where is_active = true;
create index if not exists idx_generations_user on public.generations(user_id);
create index if not exists idx_generations_product on public.generations(product_id);
create index if not exists idx_generations_created on public.generations(created_at desc);
create index if not exists idx_grounding_cache_product on public.grounding_cache(product_name);
create index if not exists idx_grounding_cache_expires on public.grounding_cache(expires_at);

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.briefs enable row level security;
alter table public.generations enable row level security;
alter table public.grounding_cache enable row level security;

-- RLS Policies: All authenticated users can read everything
create policy "Users can view all users" on public.users for select to authenticated using (true);
create policy "Categories are viewable by authenticated users" on public.categories for select to authenticated using (true);
create policy "Products are viewable by authenticated users" on public.products for select to authenticated using (true);
create policy "Briefs are viewable by authenticated users" on public.briefs for select to authenticated using (true);
create policy "Generations are viewable by authenticated users" on public.generations for select to authenticated using (true);
create policy "Grounding cache is viewable by authenticated users" on public.grounding_cache for select to authenticated using (true);

-- RLS Policies: Users can insert their own data
create policy "Users can insert own generations" on public.generations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own generations" on public.generations for update to authenticated using (auth.uid() = user_id);
create policy "Authenticated users can manage briefs" on public.briefs for all to authenticated using (true);
create policy "Authenticated users can manage grounding cache" on public.grounding_cache for all to authenticated using (true);

-- Function to sync auth.users to public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

-- Trigger for new user sync
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for generations updated_at
drop trigger if exists on_generation_updated on public.generations;
create trigger on_generation_updated
  before update on public.generations
  for each row execute procedure public.handle_updated_at();

-- Insert initial categories (Samsung product categories)
insert into public.categories (name, name_ko, icon, sort_order) values
  ('Mobile', '모바일', 'device-mobile', 1),
  ('Watch', '워치', 'watch', 2),
  ('Ring', '링', 'circle', 3),
  ('Buds', '버즈', 'headphones', 4),
  ('Laptop', '노트북', 'laptop', 5),
  ('XR', 'XR', 'vr-headset', 6)
on conflict do nothing;

-- Insert sample products
insert into public.products (category_id, name, code_name)
select c.id, p.name, p.code_name
from public.categories c
cross join lateral (
  values
    ('Mobile', 'Galaxy S25 Ultra', 'dm4'),
    ('Mobile', 'Galaxy S25+', 'dm3'),
    ('Mobile', 'Galaxy S25', 'dm2'),
    ('Mobile', 'Galaxy Z Fold 7', 'q7'),
    ('Mobile', 'Galaxy Z Flip 7', 'b7'),
    ('Watch', 'Galaxy Watch 7', 'fresh'),
    ('Watch', 'Galaxy Watch Ultra', 'bigbang'),
    ('Ring', 'Galaxy Ring 2', 'gaiaring2'),
    ('Buds', 'Galaxy Buds 4', 'berry'),
    ('Buds', 'Galaxy Buds 4 Pro', 'berrybig'),
    ('Laptop', 'Galaxy Book 5 Pro', 'mars'),
    ('XR', 'Galaxy Glasses', 'mango')
) as p(category, name, code_name)
where c.name = p.category
on conflict do nothing;
