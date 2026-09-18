// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: ENTITY ALIASES DICTIONARY
// Standard canonical mappings for clubs and competitions across diverse datasets.
// ─────────────────────────────────────────────────────────────────────────────

export const CLUB_ALIASES: Record<string, string> = {
  // England
  'manchester city': 'manchester city',
  'man city': 'manchester city',
  'man. city': 'manchester city',
  mancity: 'manchester city',
  'manchester united': 'manchester united',
  'man utd': 'manchester united',
  'man. united': 'manchester united',
  manunited: 'manchester united',
  arsenal: 'arsenal',
  'arsenal fc': 'arsenal',
  liverpool: 'liverpool',
  'liverpool fc': 'liverpool',
  chelsea: 'chelsea',
  'chelsea fc': 'chelsea',
  'tottenham hotspur': 'tottenham hotspur',
  tottenham: 'tottenham hotspur',
  spurs: 'tottenham hotspur',
  'newcastle united': 'newcastle united',
  newcastle: 'newcastle united',
  'aston villa': 'aston villa',
  villa: 'aston villa',
  'brighton & hove albion': 'brighton',
  'brighton and hove albion': 'brighton',
  brighton: 'brighton',
  'west ham united': 'west ham united',
  'west ham': 'west ham united',

  // Spain
  'real madrid': 'real madrid',
  'real madrid cf': 'real madrid',
  'fc barcelona': 'barcelona',
  barcelona: 'barcelona',
  barca: 'barcelona',
  'atletico madrid': 'atletico madrid',
  'club atletico de madrid': 'atletico madrid',
  atleti: 'atletico madrid',
  'real sociedad': 'real sociedad',
  'athletic club': 'athletic bilbao',
  'athletic bilbao': 'athletic bilbao',
  'sevilla fc': 'sevilla',
  sevilla: 'sevilla',

  // Germany
  'fc bayern munchen': 'bayern munich',
  'bayern munchen': 'bayern munich',
  'bayern munich': 'bayern munich',
  'fc bayern': 'bayern munich',
  'borussia dortmund': 'borussia dortmund',
  bvb: 'borussia dortmund',
  'bayer 04 leverkusen': 'bayer leverkusen',
  'bayer leverkusen': 'bayer leverkusen',
  'rb leipzig': 'rb leipzig',
  leipzig: 'rb leipzig',
  'vfb stuttgart': 'vfb stuttgart',
  stuttgart: 'vfb stuttgart',

  // Italy
  'fc internazionale milano': 'inter milan',
  'inter milan': 'inter milan',
  internazionale: 'inter milan',
  inter: 'inter milan',
  'ac milan': 'ac milan',
  milan: 'ac milan',
  'juventus fc': 'juventus',
  juventus: 'juventus',
  juve: 'juventus',
  'ssc napoli': 'napoli',
  napoli: 'napoli',
  'as roma': 'as roma',
  roma: 'as roma',

  // France
  'paris saint-germain': 'paris saint-germain',
  'paris saint germain': 'paris saint-germain',
  psg: 'paris saint-germain',
  'as monaco': 'as monaco',
  monaco: 'as monaco',
  'olympique de marseille': 'marseille',
  marseille: 'marseille',
  om: 'marseille',
};

export const COMPETITION_ALIASES: Record<string, string> = {
  // Premier League
  'premier league': 'EPL',
  'english premier league': 'EPL',
  epl: 'EPL',
  pl: 'EPL',
  'premier-league': 'EPL',

  // La Liga
  'la liga': 'LALIGA',
  laliga: 'LALIGA',
  'primera division': 'LALIGA',
  'la liga ea sports': 'LALIGA',

  // Bundesliga
  bundesliga: 'BL1',
  '1. bundesliga': 'BL1',
  'german bundesliga': 'BL1',

  // Serie A
  'serie a': 'SERIEA',
  'serie a enilive': 'SERIEA',
  'italian serie a': 'SERIEA',

  // Ligue 1
  'ligue 1': 'FL1',
  'ligue 1 mcdonalds': 'FL1',
  'french ligue 1': 'FL1',

  // UEFA Champions League
  'champions league': 'UCL',
  'uefa champions league': 'UCL',
  ucl: 'UCL',
};
