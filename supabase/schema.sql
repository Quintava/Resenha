create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabelas de dados
-- ---------------------------------------------------------------------------

-- Mantida para que instalações antigas possam ser migradas automaticamente.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Uma conta pode administrar várias resenhas, turmas ou equipes isoladas.
create table if not exists public.user_groups (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 60),
  management_mode text not null default 'amateur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.user_groups
  add column if not exists management_mode text not null default 'amateur';
alter table public.user_groups drop constraint if exists user_groups_management_mode_check;
alter table public.user_groups add constraint user_groups_management_mode_check
  check (management_mode in ('amateur', 'academy'));

-- Preferências, jogadores, treinos e demais dados pequenos da conta.
create table if not exists public.user_core (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

-- Existe no máximo uma partida ativa por conta.
create table if not exists public.user_active_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

-- Uma linha para cada partida encerrada permite carregar o histórico por páginas.
create table if not exists public.user_matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  id text not null,
  payload jsonb not null,
  finished_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id, id)
);

-- Cada lance possui sua própria linha. Um evento novo não reenvia todo o histórico.
create table if not exists public.user_match_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  match_id text not null,
  id text not null,
  event_type text not null,
  player_id text,
  player_name text,
  assist_player_id text,
  assist_player_name text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id, match_id, id)
);

-- Atualiza instalações antigas para aceitar também as penalidades individuais.
alter table public.user_match_events
  drop constraint if exists user_match_events_event_type_check;

alter table public.user_match_events
  add constraint user_match_events_event_type_check
  check (event_type in (
    'goal', 'sub', 'own_goal', 'missed_penalty', 'goalkeeper_change',
    'goalkeeper_save', 'goalkeeper_difficult_save', 'goalkeeper_penalty_save', 'goalkeeper_error',
    'match_highlight'
  ));

-- Configuração do Mural da Resenha compartilhado.
create table if not exists public.public_pages (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  slug text not null unique
    default lower(substr(encode(gen_random_bytes(12), 'hex'), 1, 12)),
  enabled boolean not null default false,
  title text not null default 'Resenha',
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

-- Próximas partidas exibidas no Mural.
create table if not exists public.upcoming_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'default',
  title text not null check (char_length(title) between 1 and 80),
  sport text not null default 'Futebol de Salão',
  scheduled_at timestamptz not null,
  location text not null default '' check (char_length(location) <= 120),
  created_at timestamptz not null default now()
);

-- Migração idempotente das instalações anteriores: tudo existente vai para o grupo padrão.
alter table public.user_core add column if not exists group_id text not null default 'default';
alter table public.user_active_matches add column if not exists group_id text not null default 'default';
alter table public.user_matches add column if not exists group_id text not null default 'default';
alter table public.user_match_events add column if not exists group_id text not null default 'default';
alter table public.public_pages add column if not exists group_id text not null default 'default';
alter table public.upcoming_games add column if not exists group_id text not null default 'default';

alter table public.user_core drop constraint if exists user_core_pkey;
alter table public.user_core add primary key (user_id, group_id);
alter table public.user_active_matches drop constraint if exists user_active_matches_pkey;
alter table public.user_active_matches add primary key (user_id, group_id);
alter table public.user_matches drop constraint if exists user_matches_pkey;
alter table public.user_matches add primary key (user_id, group_id, id);
alter table public.user_match_events drop constraint if exists user_match_events_pkey;
alter table public.user_match_events add primary key (user_id, group_id, match_id, id);
alter table public.public_pages drop constraint if exists public_pages_pkey;
alter table public.public_pages add primary key (user_id, group_id);

insert into public.user_groups (user_id, id, name)
select distinct user_id, group_id,
  case when group_id = 'default' then 'Grupo principal' else 'Grupo migrado' end
from (
  select user_id, group_id from public.user_core
  union select user_id, group_id from public.user_active_matches
  union select user_id, group_id from public.user_matches
  union select user_id, group_id from public.user_match_events
  union select user_id, group_id from public.public_pages
  union select user_id, group_id from public.upcoming_games
  union select user_id, 'default' from public.app_state
) owners
on conflict (user_id, id) do nothing;

update public.user_groups
set name = 'Grupo principal', updated_at = now()
where id = 'default' and name = 'Resenha da semana';

alter table public.user_groups drop constraint if exists user_groups_id_format;
alter table public.user_groups add constraint user_groups_id_format
  check (id ~ '^[a-zA-Z0-9-]{1,128}$');

-- Integridade e limpeza automática: excluir um grupo remove somente os dados daquele espaço.
alter table public.user_core drop constraint if exists user_core_group_fk;
alter table public.user_core add constraint user_core_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;
alter table public.user_active_matches drop constraint if exists user_active_matches_group_fk;
alter table public.user_active_matches add constraint user_active_matches_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;
alter table public.user_matches drop constraint if exists user_matches_group_fk;
alter table public.user_matches add constraint user_matches_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;
alter table public.user_match_events drop constraint if exists user_match_events_group_fk;
alter table public.user_match_events add constraint user_match_events_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;
alter table public.public_pages drop constraint if exists public_pages_group_fk;
alter table public.public_pages add constraint public_pages_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;
alter table public.upcoming_games drop constraint if exists upcoming_games_group_fk;
alter table public.upcoming_games add constraint upcoming_games_group_fk foreign key (user_id, group_id)
  references public.user_groups(user_id, id) on delete cascade;

create index if not exists user_matches_group_date_idx
  on public.user_matches(user_id, group_id, finished_at desc);
create index if not exists user_match_events_group_match_idx
  on public.user_match_events(user_id, group_id, match_id);
create index if not exists upcoming_games_group_date_idx
  on public.upcoming_games(user_id, group_id, scheduled_at);

-- Limites de integridade evitam payloads acidentalmente gigantes ou abuso de armazenamento.
alter table public.app_state drop constraint if exists app_state_payload_size;
alter table public.app_state add constraint app_state_payload_size
  check (octet_length(data::text) <= 8388608);

alter table public.user_core drop constraint if exists user_core_payload_size;
alter table public.user_core add constraint user_core_payload_size
  check (octet_length(data::text) <= 2097152);

alter table public.user_active_matches drop constraint if exists active_match_payload_size;
alter table public.user_active_matches add constraint active_match_payload_size
  check (octet_length(payload::text) <= 1048576);

alter table public.user_matches drop constraint if exists user_match_id_size;
alter table public.user_matches add constraint user_match_id_size
  check (char_length(id) between 1 and 128);
alter table public.user_matches drop constraint if exists user_match_payload_size;
alter table public.user_matches add constraint user_match_payload_size
  check (octet_length(payload::text) <= 1048576);

alter table public.user_match_events drop constraint if exists match_event_ids_size;
alter table public.user_match_events add constraint match_event_ids_size
  check (char_length(match_id) between 1 and 128 and char_length(id) between 1 and 128);
alter table public.user_match_events drop constraint if exists match_event_payload_size;
alter table public.user_match_events add constraint match_event_payload_size
  check (octet_length(payload::text) <= 65536);

alter table public.public_pages alter column slug
  set default lower(substr(encode(gen_random_bytes(16), 'hex'), 1, 24));
alter table public.public_pages drop constraint if exists public_page_slug_format;
alter table public.public_pages add constraint public_page_slug_format
  check (slug ~ '^[a-f0-9]{12,32}$');
alter table public.public_pages drop constraint if exists public_page_title_size;
alter table public.public_pages add constraint public_page_title_size
  check (char_length(title) between 1 and 80);

-- ---------------------------------------------------------------------------
-- Segurança por linha (RLS)
-- ---------------------------------------------------------------------------

alter table public.app_state enable row level security;
alter table public.user_groups enable row level security;
alter table public.user_core enable row level security;
alter table public.user_active_matches enable row level security;
alter table public.user_matches enable row level security;
alter table public.user_match_events enable row level security;
alter table public.public_pages enable row level security;
alter table public.upcoming_games enable row level security;

-- Visitantes não recebem acesso direto a nenhuma tabela.
revoke all on
  public.app_state,
  public.user_groups,
  public.user_core,
  public.user_active_matches,
  public.user_matches,
  public.user_match_events,
  public.public_pages,
  public.upcoming_games
from anon;

-- Usuários autenticados usam as tabelas, mas as políticas abaixo limitam o user_id.
grant select, insert, update, delete on
  public.app_state,
  public.user_groups,
  public.user_core,
  public.user_active_matches,
  public.user_matches,
  public.user_match_events,
  public.public_pages,
  public.upcoming_games
to authenticated;

drop policy if exists "grupos proprios" on public.user_groups;
create policy "grupos proprios"
  on public.user_groups for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "app_state proprio" on public.app_state;
create policy "app_state proprio"
  on public.app_state
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "core proprio" on public.user_core;
create policy "core proprio"
  on public.user_core
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "partida ativa propria" on public.user_active_matches;
create policy "partida ativa propria"
  on public.user_active_matches
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "partidas proprias" on public.user_matches;
create policy "partidas proprias"
  on public.user_matches
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "eventos proprios" on public.user_match_events;
create policy "eventos proprios"
  on public.user_match_events
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pagina publica propria" on public.public_pages;
create policy "pagina publica propria"
  on public.public_pages
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "agenda propria" on public.upcoming_games;
create policy "agenda propria"
  on public.upcoming_games
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Funções protegidas
-- ---------------------------------------------------------------------------

-- Cria ou atualiza o endereço compartilhável do usuário autenticado.
drop function if exists public.ensure_public_page(text);
drop function if exists public.ensure_public_page(text, text);
create function public.ensure_public_page(
  page_title text default 'Resenha',
  target_group_id text default 'default'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  page_row public.public_pages;
begin
  if auth.uid() is null then
    raise exception 'Login necessário';
  end if;
  if target_group_id !~ '^[a-zA-Z0-9-]{1,128}$' or not exists (
    select 1 from user_groups where user_id = auth.uid() and id = target_group_id
  ) then
    raise exception 'Grupo inválido';
  end if;

  insert into public_pages (user_id, group_id, title)
  values (
    auth.uid(),
    target_group_id,
    left(coalesce(nullif(trim(page_title), ''), 'Resenha'), 80)
  )
  on conflict (user_id, group_id)
  do update
    set title = excluded.title,
        updated_at = now()
  returning * into page_row;

  return to_jsonb(page_row);
end
$$;

-- A assinatura antiga precisa ser removida antes de criar a versão com filtro.
drop function if exists public.get_public_resenha(text, integer, integer);
drop function if exists public.get_public_resenha(text, integer, integer, text);
drop function if exists public.get_public_resenha(text, integer, integer, text, text, text);

-- Consolida apenas os dados permitidos no Mural: ranking, agenda e resultados.
create function public.get_public_resenha(
  target_slug text,
  result_offset integer default 0,
  result_limit integer default 10,
  target_sport text default 'Futebol de Salão',
  target_month text default null,
  target_match_id text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout = '8s'
as $$
with page as (
  select *
  from public_pages
  where slug = target_slug
    and enabled = true
    and target_slug ~ '^[a-f0-9]{12,32}$'
    and target_sport in (
      'Futebol', 'Futebol Society', 'Futebol de Salão', 'Vôlei', 'Basquete'
    )
    and (target_month is null or target_month = '' or target_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
    and (target_match_id is null or target_match_id = '' or char_length(target_match_id) <= 128)
  limit 1
),
eligible_players as (
  select player ->> 'id' as id
  from user_core as core
  join page on page.user_id = core.user_id and page.group_id = core.group_id
  cross join lateral jsonb_array_elements(coalesce(core.data -> 'players', '[]'::jsonb)) as player
  where coalesce((player ->> 'suspended')::boolean, false) = false
),
matches as (
  select m.*
  from user_matches as m
  join page on page.user_id = m.user_id and page.group_id = m.group_id
  where (
    case
      when m.payload ->> 'sport' = 'Futsal' then 'Futebol de Salão'
      else coalesce(m.payload ->> 'sport', '')
    end
  ) = target_sport
),
selected_month as (
  select coalesce(
    nullif(target_month, ''),
    (
      select to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM')
      from matches
      order by finished_at desc
      limit 1
    ),
    to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
  ) as month_key
),
roster as (
  select
    m.id as match_id,
    m.finished_at,
    m.payload,
    player ->> 'id' as id,
    max(player ->> 'name') as name,
    (team_position - 1)::int as team_index
  from matches as m
  cross join lateral jsonb_array_elements(
    coalesce(m.payload -> 'teams', '[]'::jsonb)
    || coalesce(m.payload -> 'reserveTeams', '[]'::jsonb)
  ) with ordinality as team_data(team, team_position)
  cross join lateral jsonb_array_elements(
    coalesce(team -> 'starters', '[]'::jsonb)
    || coalesce(team -> 'bench', '[]'::jsonb)
  ) as player
  where player ->> 'id' in (select id from eligible_players)
  group by
    m.id,
    m.finished_at,
    m.payload,
    player ->> 'id',
    team_position
),
performance as (
  select
    roster.match_id,
    roster.finished_at,
    roster.id,
    roster.name,
    count(event.id) filter (
      where event.event_type = 'goal'
        and event.player_id = roster.id
    )::int as goals,
    count(event.id) filter (
      where event.event_type = 'goal'
        and event.assist_player_id = roster.id
    )::int as assists,
    count(event.id) filter (
      where event.event_type in ('goalkeeper_save', 'goalkeeper_difficult_save', 'goalkeeper_penalty_save')
        and event.player_id = roster.id
    )::int as saves,
    greatest(
      3,
      least(
        10,
        6
        + least(
            2.0,
            count(event.id) filter (
              where event.event_type = 'goal'
                and event.player_id = roster.id
            ) * 0.55
            + count(event.id) filter (
                where event.event_type = 'goal'
                  and event.assist_player_id = roster.id
              ) * case
                when target_sport in ('Futebol', 'Futebol Society', 'Futebol de Salão') then 0.30
                else 0
              end
          )
        - count(event.id) filter (
            where event.event_type = 'own_goal'
              and event.player_id = roster.id
          ) * 0.40
        - count(event.id) filter (
            where event.event_type = 'missed_penalty'
              and event.player_id = roster.id
          ) * 0.3
        + count(event.id) filter (
            where event.event_type = 'goalkeeper_save'
              and event.player_id = roster.id
          ) * 0.12
        + count(event.id) filter (
            where event.event_type = 'goalkeeper_difficult_save'
              and event.player_id = roster.id
          ) * 0.30
        + count(event.id) filter (
            where event.event_type = 'goalkeeper_penalty_save'
              and event.player_id = roster.id
          ) * 0.70
        - count(event.id) filter (
            where event.event_type = 'goalkeeper_error'
              and event.player_id = roster.id
          ) * 0.45
        - least(
            0.4,
            count(event.id) filter (
              where event.event_type in ('goal', 'own_goal')
                and event.payload ->> 'goalkeeperId' = roster.id
            ) * 0.08
          )
        + count(event.id) filter (
            where event.event_type = 'match_highlight'
              and event.player_id = roster.id
          ) * 0.30
        + case
            when roster.team_index not in (0, 1) then 0
            when coalesce(
              (roster.payload -> 'score' ->> roster.team_index)::numeric,
              0
            ) > coalesce(
              (roster.payload -> 'score' ->> (1 - roster.team_index))::numeric,
              0
            ) then 0.35
            when coalesce(
              (roster.payload -> 'score' ->> roster.team_index)::numeric,
              0
            ) = coalesce(
              (roster.payload -> 'score' ->> (1 - roster.team_index))::numeric,
              0
            ) then 0.15
            else -0.15
          end
      )
    )::numeric as score
  from roster
  left join user_match_events as event
    on event.match_id = roster.match_id
   and event.user_id = (select user_id from page)
   and event.group_id = (select group_id from page)
  group by
    roster.match_id,
    roster.finished_at,
    roster.id,
    roster.name,
    roster.payload,
    roster.team_index
),
ranking as (
  select
    id,
    max(name) as name,
    sum(goals)::int as goals,
    sum(assists)::int as assists,
    sum(saves)::int as saves,
    count(*)::int as games,
    round(sum(goals)::numeric / nullif(count(*), 0), 2) as average,
    round(sum(saves)::numeric / nullif(count(*), 0), 2) as save_average,
    round(avg(score), 1) as evaluation
  from performance
  group by id
),
monthly_ranking as (
  select
    id,
    max(name) as name,
    sum(goals)::int as goals,
    sum(assists)::int as assists,
    sum(saves)::int as saves,
    count(*)::int as games,
    round(sum(goals)::numeric / nullif(count(*), 0), 2) as average,
    round(sum(saves)::numeric / nullif(count(*), 0), 2) as save_average,
    round(avg(score), 1) as evaluation
  from performance
  where to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM') =
    (select month_key from selected_month)
  group by id
),
selected_match as (
  select coalesce(
    nullif(target_match_id, ''),
    (select id from matches order by finished_at desc limit 1)
  ) as id
),
match_ranking as (
  select
    id,
    max(name) as name,
    sum(goals)::int as goals,
    sum(assists)::int as assists,
    sum(saves)::int as saves,
    count(*)::int as games,
    round(sum(goals)::numeric / nullif(count(*), 0), 2) as average,
    round(sum(saves)::numeric / nullif(count(*), 0), 2) as save_average,
    round(avg(score), 1) as evaluation
  from performance
  where match_id = (select id from selected_match)
  group by id
)
select
  case
    when not exists (select 1 from page) then null
    else jsonb_build_object(
      'page',
      (
        select jsonb_build_object(
          'title', title,
          'slug', slug
        )
        from page
      ),
      'sport',
      target_sport,
      'ranking',
      coalesce(
        (
          select jsonb_agg(
            to_jsonb(ranked)
            order by
              ranked.evaluation desc,
              ranked.goals desc,
              ranked.assists desc,
              ranked.name
          )
          from ranking as ranked
        ),
        '[]'::jsonb
      ),
      'monthly_ranking',
      coalesce(
        (
          select jsonb_agg(
            to_jsonb(ranked)
            order by
              ranked.evaluation desc,
              ranked.goals desc,
              ranked.assists desc,
              ranked.name
          )
          from monthly_ranking as ranked
        ),
        '[]'::jsonb
      ),
      'match_ranking',
      coalesce(
        (
          select jsonb_agg(
            to_jsonb(ranked)
            order by
              ranked.evaluation desc,
              ranked.goals desc,
              ranked.assists desc,
              ranked.name
          )
          from match_ranking as ranked
        ),
        '[]'::jsonb
      ),
      'ranking_months',
      coalesce(
        (
          select jsonb_agg(month_key order by month_key desc)
          from (
            select distinct
              to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM') as month_key
            from matches
          ) as available_months
        ),
        '[]'::jsonb
      ),
      'ranking_matches',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', listed_match.id,
              'finished_at', listed_match.finished_at,
              'team_a', listed_match.payload -> 'teams' -> 0 ->> 'short',
              'team_b', listed_match.payload -> 'teams' -> 1 ->> 'short',
              'score_a', coalesce((listed_match.payload -> 'score' ->> 0)::int, 0),
              'score_b', coalesce((listed_match.payload -> 'score' ->> 1)::int, 0)
            )
            order by listed_match.finished_at desc
          )
          from (
            select * from matches order by finished_at desc limit 100
          ) as listed_match
        ),
        '[]'::jsonb
      ),
      'selected_month',
      (select month_key from selected_month),
      'selected_match_id',
      (select id from selected_match),
      'upcoming',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', game.id,
              'title', game.title,
              'sport', game.sport,
              'scheduled_at', game.scheduled_at,
              'location', game.location
            )
            order by game.scheduled_at
          )
          from (
            select upcoming_games.*
            from upcoming_games
            join page on page.user_id = upcoming_games.user_id
              and page.group_id = upcoming_games.group_id
            where upcoming_games.scheduled_at >= now()
            order by upcoming_games.scheduled_at
            limit 20
          ) as game
        ),
        '[]'::jsonb
      ),
      'results',
      coalesce(
        (
          select jsonb_agg(result.payload order by result.finished_at desc)
          from (
            select
              jsonb_build_object(
                'id', m.id,
                'sport', m.payload ->> 'sport',
                'finishedAt', coalesce(m.payload -> 'finishedAt', to_jsonb(m.finished_at)),
                'date', coalesce(m.payload -> 'date', to_jsonb(m.finished_at)),
                'roundNumber', m.payload -> 'roundNumber',
                'score', coalesce(m.payload -> 'score', '[0, 0]'::jsonb),
                'teams', jsonb_build_array(
                  jsonb_build_object('short', m.payload -> 'teams' -> 0 ->> 'short'),
                  jsonb_build_object('short', m.payload -> 'teams' -> 1 ->> 'short')
                ),
                'events', coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', event.id,
                        'type', event.event_type,
                        'minute', event.payload -> 'minute',
                        'playerName', event.player_name,
                        'assistPlayerName', event.assist_player_name,
                        'playerIn', event.payload ->> 'playerIn',
                        'playerOut', event.payload ->> 'playerOut'
                      )
                      order by event.created_at, event.id
                    )
                    from user_match_events as event
                    where event.user_id = (select user_id from page)
                      and event.group_id = (select group_id from page)
                      and event.match_id = m.id
                  ),
                  '[]'::jsonb
                )
              ) as payload,
              m.finished_at
            from matches as m
            order by m.finished_at desc
            offset least(greatest(result_offset, 0), 10000)
            limit least(greatest(result_limit, 1), 20)
          ) as result
        ),
        '[]'::jsonb
      ),
      'has_more',
      (
        select count(*) >
          least(greatest(result_offset, 0), 10000)
          + least(greatest(result_limit, 1), 20)
        from matches
      )
    )
  end
$$;

-- A função administrativa exige login.
revoke execute on function public.ensure_public_page(text, text) from public, anon;
grant execute on function public.ensure_public_page(text, text) to authenticated;

-- O visitante acessa somente o resultado consolidado da função, nunca as tabelas.
revoke execute on function public.get_public_resenha(
  text,
  integer,
  integer,
  text,
  text,
  text
) from public;

grant execute on function public.get_public_resenha(
  text,
  integer,
  integer,
  text,
  text,
  text
) to anon, authenticated;
