const fs = require('fs');

(async () => {
  console.log('🚀 Starting full MLB props update (game lines + alternates + player props)...');

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    console.error('❌ ODDS_API_KEY secret is missing!');
    process.exit(1);
  }

  // Full list of markets you requested
  const MARKETS = [
    // Game lines
    'h2h,h2h_q1,h2h_q2,h2h_q3,h2h_q4,h2h_h1,h2h_h2',
    'h2h_p1,h2h_p2,h2h_p3',                    // hockey periods
    'h2h_1st_1_innings,h2h_1st_3_innings,h2h_1st_5_innings,h2h_1st_7_innings', // baseball innings
    'spreads,spreads_q1,spreads_q2,spreads_q3,spreads_q4,spreads_h1,spreads_h2',
    'spreads_p1,spreads_p2,spreads_p3',
    'spreads_1st_1_innings,spreads_1st_3_innings,spreads_1st_5_innings,spreads_1st_7_innings',
    'totals,totals_q1,totals_q2,totals_q3,totals_q4,totals_h1,totals_h2',
    'totals_p1,totals_p2,totals_p3',
    'totals_1st_1_innings,totals_1st_3_innings,totals_1st_5_innings,totals_1st_7_innings',
    // Alternate lines
    'alternate_spreads_q1,alternate_spreads_q2,alternate_spreads_q3,alternate_spreads_q4',
    'alternate_spreads_h1,alternate_spreads_h2',
    'alternate_totals_q1,alternate_totals_q2,alternate_totals_q3,alternate_totals_q4',
    'alternate_totals_h1,alternate_totals_h2',
    'team_totals_h1,team_totals_h2,team_totals_q1,team_totals_q2,team_totals_q3,team_totals_q4',
    // Player props
    'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts',
    'pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks',
    'pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored',
    'batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles',
    'batter_triples,batter_hits',
    // Alternate player props
    'batter_total_bases_alternate,batter_home_runs_alternate,batter_hits_alternate',
    'batter_rbis_alternate,batter_walks_alternate,batter_strikeouts_alternate',
    'batter_runs_scored_alternate,batter_hits_runs_rbis_alternate',
    'batter_singles_alternate,batter_doubles_alternate,batter_triples_alternate',
    'batter_fantasy_score_alternate'
  ].join(',');

  let rows = [];
  rows.push('id,commence_time,bookmaker,last_update,home_team,away_team,market,label,description,price,point');

  const eventsUrl = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds?apiKey=${API_KEY}&regions=us,us2,us_dfs,us_ex&markets=h2h&oddsFormat=american&dateFormat=iso`;
  const eventsRes = await fetch(eventsUrl);
  const events = await eventsRes.json();

  console.log(`✅ Found ${events.length} games`);

  for (const event of events.slice(0, 12)) {
    try {
      const propsUrl = `https://api.the-odds-api.com/v4/sports/baseball_mlb/events/${event.id}/odds?apiKey=${API_KEY}&regions=us,us2,us_dfs,us_ex&markets=${MARKETS}&oddsFormat=american&dateFormat=iso`;
      const res = await fetch(propsUrl);
      if (!res.ok) continue;

      const data = await res.json();

      for (const book of data.bookmakers || []) {
        for (const market of book.markets || []) {
          for (const outcome of market.outcomes || []) {
            let pointValue = outcome.point;
            if (market.key === 'pitcher_record_a_win') pointValue = 0.5;

            const row = [
              data.id,
              data.commence_time,
              book.key,
              market.last_update || '',
              data.home_team,
              data.away_team,
              market.key,
              outcome.name,
              outcome.description || outcome.name,
              outcome.price,
              pointValue !== null && pointValue !== undefined ? pointValue : ''
            ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');

            rows.push(row);
          }
        }
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  const csvContent = rows.join('\n');
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/props.csv', csvContent);

  console.log(`🎉 Saved ${rows.length - 1} props to data/props.csv`);
})();
