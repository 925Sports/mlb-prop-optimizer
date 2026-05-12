const fs = require('fs');

(async () => {
  console.log('🚀 DIAGNOSTIC RUN - MLB Props');

  const API_KEY = process.env.ODDS_API_KEY;
  console.log('API Key ends with:', API_KEY ? API_KEY.slice(-8) : 'MISSING');

  const REGIONS = ['us,us2', 'us_dfs', 'us_ex'];
  const MARKETS = 'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts,pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles,batter_triples,batter_hits,player_fantasy_points';

  let rows = [];
  rows.push('id,commence_time,bookmaker,last_update,home_team,away_team,market,label,description,price,point');

  let totalAdded = 0;

  for (const region of REGIONS) {
    console.log(`\n📡 Trying region: ${region}`);
    const base = `https://api.the-odds-api.com/v4/sports/baseball_mlb`;
    const params = `apiKey=${API_KEY}&regions=${region}&markets=${MARKETS}&oddsFormat=american&dateFormat=iso`;

    try {
      const eventsRes = await fetch(`${base}/odds?${params}&markets=h2h`);
      console.log(`  Events status: ${eventsRes.status}`);

      if (!eventsRes.ok) {
        console.log(`  ❌ Events failed: ${await eventsRes.text()}`);
        continue;
      }

      const events = await eventsRes.json();
      console.log(`  ✅ Found ${events.length} games`);

      for (const event of events.slice(0, 8)) {
        try {
          const res = await fetch(`${base}/events/${event.id}/odds?${params}`);
          console.log(`    Event ${event.id} → ${res.status}`);

          if (!res.ok) continue;

          const data = await res.json();
          let added = 0;

          for (const book of data.bookmakers || []) {
            for (const market of book.markets || []) {
              for (const outcome of market.outcomes || []) {
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
                  outcome.point !== null && outcome.point !== undefined ? outcome.point : ''
                ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');

                rows.push(row);
                added++;
                totalAdded++;
              }
            }
          }
          console.log(`    → Added ${added} props`);
        } catch (e) {
          console.log(`    ⚠️ Event skipped`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      console.log(`❌ Critical error in ${region}:`, e.message);
    }
  }

  console.log(`\n🎯 TOTAL PROPS ADDED: ${totalAdded}`);

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/props.csv', rows.join('\n'));
  console.log('✅ Saved data/props.csv');
})();
