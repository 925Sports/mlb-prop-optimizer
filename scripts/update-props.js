const fs = require('fs');

(async () => {
  console.log('🚀 Starting MLB Prop fetch (matching your original CSV format)...');

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    console.error('❌ ODDS_API_KEY secret is missing!');
    process.exit(1);
  }

  const REGIONS = ['us,us2', 'us_dfs', 'us_ex'];
  const MARKETS = 'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts,pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles,batter_triples,batter_hits,player_fantasy_points';

  let allProps = [];

  for (const region of REGIONS) {
    console.log(`📡 Fetching ${region}...`);
    const base = `https://api.the-odds-api.com/v4/sports/baseball_mlb`;
    const params = `apiKey=${API_KEY}&regions=${region}&markets=${MARKETS}&oddsFormat=american&dateFormat=iso`;

    try {
      const eventsRes = await fetch(`${base}/odds?${params}&markets=h2h`);
      if (!eventsRes.ok) {
        console.error(`❌ Events failed for ${region}: ${eventsRes.status}`);
        continue;
      }
      const events = await eventsRes.json();

      for (const event of events.slice(0, 12)) {
        try {
          const res = await fetch(`${base}/events/${event.id}/odds?${params}`);
          if (!res.ok) continue;

          const data = await res.json();

          for (const book of data.bookmakers || []) {
            for (const market of book.markets || []) {
              for (const outcome of market.outcomes || []) {
                allProps.push({
                  id: data.id,
                  commence_time: data.commence_time,
                  bookmaker: book.key,
                  last_update: market.last_update,
                  home_team: data.home_team,
                  away_team: data.away_team,
                  market: market.key,
                  label: outcome.name,
                  description: outcome.description || outcome.name,
                  price: outcome.price,
                  point: outcome.point || null
                });
              }
            }
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (e) {
      console.error(`❌ Error in ${region}:`, e.message);
    }
  }

  console.log(`✅ TOTAL PROPS COLLECTED: ${allProps.length}`);

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/props.json', JSON.stringify(allProps, null, 2));
  console.log('🎉 Saved data/props.json — ready for your website!');
})();
