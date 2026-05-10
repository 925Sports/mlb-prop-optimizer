const fs = require('fs');

(async () => {
  console.log('🚀 Starting MLB Prop fetch...');

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    console.error('❌ ERROR: ODDS_API_KEY secret is missing or empty!');
    process.exit(1);
  }

  const REGIONS = ['us,us2', 'us_dfs', 'us_ex'];
  const MARKETS = 'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts,pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles,batter_triples,batter_hits,player_fantasy_points';

  let allProps = [];

  async function fetchRegion(region) {
    console.log(`📡 Fetching region: ${region}`);
    const base = `https://api.the-odds-api.com/v4/sports/baseball_mlb`;
    const params = `apiKey=${API_KEY}&regions=${region}&markets=${MARKETS}&oddsFormat=american&dateFormat=iso`;

    try {
      const eventsRes = await fetch(`${base}/odds?${params}&markets=h2h`);
      if (!eventsRes.ok) {
        console.error(`❌ Events API error (${region}): ${eventsRes.status}`);
        return;
      }
      const events = await eventsRes.json();
      console.log(`✅ Got ${events.length} events for ${region}`);

      for (const event of events.slice(0, 12)) {
        try {
          const res = await fetch(`${base}/events/${event.id}/odds?${params}`);
          if (!res.ok) {
            console.warn(`⚠️ Event ${event.id} skipped: ${res.status}`);
            continue;
          }
          const data = await res.json();

          for (const book of data.bookmakers || []) {
            for (const market of book.markets || []) {
              for (const outcome of market.outcomes || []) {
                allProps.push({
                  game: `${data.away_team} @ ${data.home_team}`,
                  time: data.commence_time,
                  player: outcome.description || outcome.name,
                  prop: market.key.replace(/_/g, ' ').toUpperCase(),
                  line: outcome.point || null,
                  side: outcome.name,
                  bookmaker: book.title,
                  odds: outcome.price,
                  type: region.includes('dfs') ? 'dfs' : region.includes('ex') ? 'exchanges' : 'traditional'
                });
              }
            }
          }
        } catch (e) {
          console.warn(`⚠️ Skipped event ${event.id}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      console.error(`❌ Critical error in ${region}:`, e.message);
    }
  }

  for (const r of REGIONS) {
    await fetchRegion(r);
  }

  console.log(`✅ Finished! Total props collected: ${allProps.length}`);

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/props.json', JSON.stringify(allProps, null, 2));

  console.log('🎉 data/props.json saved successfully');
})();
