// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: APPROVED DATA SOURCES REGISTRY
// Strict documentation of all legitimate, free, public-domain, and open data sources.
// Every registered source reflects verified legal terms, licenses, and access methods.
// ─────────────────────────────────────────────────────────────────────────────

import { DataSourceDefinition } from '../types/data-foundation.types';

export const APPROVED_DATA_SOURCES: Record<string, DataSourceDefinition> = {
  OPENFOOTBALL: {
    code: 'OPENFOOTBALL',
    name: 'OpenFootball (football.db & football.json)',
    officialUrl: 'https://openfootball.github.io',
    datasetUrl: 'https://github.com/openfootball/football.json',
    license: 'CC0 1.0 Universal (Public Domain Dedication)',
    licenseVersion: '1.0',
    attributionRequired: false,
    commercialUse: true,
    redistribution: true,
    mlUse: 'Unrestricted. Public domain dedication permits model training, weight derivation, and feature extraction without constraints.',
    supportedEntities: ['COUNTRY', 'COMPETITION', 'CLUB', 'PLAYER', 'SEASON', 'FIXTURE', 'MATCH'],
    coverage: 'Historical and active fixtures, clubs, rounds, and match scores across top European leagues (EPL, La Liga, Bundesliga, Serie A) 2010–2025.',
    limitations: [
      'Focuses primarily on match fixtures, rounds, and scores; does not provide player-level event telemetry (tackles, passes).',
      'Player roster depth in openfootball/players varies by nation and is maintained asynchronously.',
    ],
    retrievalMethod: 'Downloadable JSON via GitHub raw endpoint or Git clone',
    format: 'JSON / Plaintext',
    versionOrDate: '2024.1 (football.json active master)',
    description: 'Community-maintained public-domain football database providing match schedules, scores, clubs, and competition hierarchies.',
  },

  FPL_OPEN_DATA: {
    code: 'FPL_OPEN_DATA',
    name: 'Fantasy Premier League Open Research Dataset (vaastav)',
    officialUrl: 'https://fantasy.premierleague.com',
    datasetUrl: 'https://github.com/vaastav/Fantasy-Premier-League',
    license: 'MIT License / Public Data',
    licenseVersion: 'MIT',
    attributionRequired: true,
    attributionText: 'Data collected and structured by vaastav/Fantasy-Premier-League open project.',
    commercialUse: true,
    redistribution: true,
    mlUse: 'Permitted for research, feature engineering, and statistical modeling.',
    supportedEntities: ['PLAYER', 'CLUB', 'SEASON', 'PLAYER_STATS'],
    coverage: 'Comprehensive Premier League player performance data across 2016–2025 (appearances, minutes, goals, assists, clean sheets, saves, xG, xA).',
    limitations: [
      'Limited to English Premier League participants.',
      'Event-level spatial coordinates are not included in aggregated player tables.',
    ],
    retrievalMethod: 'Downloadable CSV via GitHub raw repository endpoints',
    format: 'CSV',
    versionOrDate: 'v2024-25.1 (Active master branch)',
    description: 'Detailed player performance statistics for all Premier League players per season, including official squad numbers, minutes, and expected metrics.',
  },

  LALIGA_OPEN_DATA: {
    code: 'LALIGA_OPEN_DATA',
    name: 'La Liga Open Historical Dataset (sdelquin)',
    officialUrl: 'https://www.laliga.com',
    datasetUrl: 'https://github.com/sdelquin/laliga-data',
    license: 'MIT License',
    licenseVersion: 'MIT',
    attributionRequired: true,
    attributionText: 'Data curated by Sergio Delgado (sdelquin/laliga-data).',
    commercialUse: true,
    redistribution: true,
    mlUse: 'Permitted for analysis, sports analytics, and machine learning models under MIT License.',
    supportedEntities: ['PLAYER', 'CLUB', 'SEASON', 'PLAYER_STATS'],
    coverage: 'Spanish Primera División player statistics (2021/22 and 2023/24), including exact DOB, height, weight, passes, tackles, duels, and dribbles.',
    limitations: [
      'Limited to Spanish La Liga.',
      'Season 2022/23 contains player demographic metadata but lacks complete granular in-match action counters.',
    ],
    retrievalMethod: 'Downloadable CSV via GitHub raw endpoint',
    format: 'CSV',
    versionOrDate: 'S2324 / S2122 releases',
    description: 'Comprehensive player demographic and statistical database for Spanish La Liga, covering granular defensive, passing, and physical duel metrics.',
  },

  DATAHUB: {
    code: 'DATAHUB',
    name: 'DataHub.io Football Datasets (Football-Data.co.uk)',
    officialUrl: 'https://www.football-data.co.uk',
    datasetUrl: 'https://github.com/datasets/football-datasets',
    license: 'Public Domain Dedication and License (PDDL) v1.0 / CC0',
    licenseVersion: 'PDDL 1.0',
    attributionRequired: false,
    commercialUse: true,
    redistribution: true,
    mlUse: 'Unrestricted public domain access for statistical analysis and match modeling.',
    supportedEntities: ['COMPETITION', 'CLUB', 'SEASON', 'FIXTURE', 'MATCH'],
    coverage: 'Historical match results, half-time scores, shots, shots on target, corners, and fouls for major European divisions.',
    limitations: [
      'Match-level team statistics only; lacks individual player action logs.',
    ],
    retrievalMethod: 'Direct downloadable CSV from football-data.co.uk and GitHub mirror',
    format: 'CSV',
    versionOrDate: '2023/24 & 2022/23 seasons',
    description: 'Curated historical match statistics and divisional results covering Premier League, La Liga, Serie A, and Bundesliga.',
  },

  WIKIDATA: {
    code: 'WIKIDATA',
    name: 'Wikidata Football Knowledge Graph',
    officialUrl: 'https://www.wikidata.org',
    datasetUrl: 'https://query.wikidata.org',
    license: 'Creative Commons CC0 1.0 Universal Public Domain Dedication',
    licenseVersion: 'CC0 1.0',
    attributionRequired: false,
    commercialUse: true,
    redistribution: true,
    mlUse: 'Full public domain authorization for entity linking, feature enrichment, and knowledge graph embeddings.',
    supportedEntities: ['COUNTRY', 'COMPETITION', 'CLUB', 'PLAYER'],
    coverage: 'Global persistent entity identifiers (Q-IDs), player birth dates, national representation, physical metrics, and club foundations.',
    limitations: [
      'Static biographical and institutional data; does not record match schedules or player statistical logs.',
    ],
    retrievalMethod: 'SPARQL Endpoint / Linked Open Data JSON API',
    format: 'JSON / RDF / SPARQL',
    versionOrDate: 'Live Wikidata Knowledge Base',
    description: 'Global open knowledge base providing persistent entity identifiers (Q-IDs), player birth dates, nationalities, physical height, and preferred foot.',
  },

  STATSBOMB_OPEN: {
    code: 'STATSBOMB_OPEN',
    name: 'StatsBomb Open Data',
    officialUrl: 'https://statsbomb.com',
    datasetUrl: 'https://github.com/statsbomb/open-data',
    license: 'StatsBomb Open Data User Agreement (Free with Attribution)',
    licenseVersion: 'Custom Open License',
    attributionRequired: true,
    attributionText: 'Data provided by StatsBomb (https://statsbomb.com).',
    commercialUse: false,
    redistribution: false,
    mlUse: 'Restricted to non-commercial academic research and demonstration. Proprietary/commercial deployment prohibited.',
    supportedEntities: ['MATCH', 'PLAYER', 'PLAYER_STATS'],
    coverage: 'Selected tournament matches (World Cup, selected league seasons e.g. Bundesliga 2023/24) with event-level coordinates and xG.',
    limitations: [
      'Strict non-commercial limitation; cannot be redistributed in commercial Touchline distributions without commercial agreement.',
      'Selective match coverage rather than full global league history.',
    ],
    retrievalMethod: 'Git clone or GitHub raw JSON endpoints',
    format: 'JSON',
    versionOrDate: 'hudl/open-data (2024 update)',
    description: 'High-density event stream data including spatial coordinates, pass trajectories, and advanced event xG for selected matches.',
  },
};

/**
 * Returns the source definition for a given source code. Throws on unapproved code.
 */
export function getDataSource(code: string): DataSourceDefinition {
  const source = APPROVED_DATA_SOURCES[code];
  if (!source) {
    throw new Error(`Data source with code '${code}' is not an approved Touchline source.`);
  }
  return source;
}
