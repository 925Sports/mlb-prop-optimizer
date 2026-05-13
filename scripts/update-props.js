const fs = require('fs');

(async () => {
  console.log('🚀 Starting MLB props.csv update (with pitcher win fix)...');

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    console.error('❌ ODDS_API_KEY secret is missing!');
    process.exit(1);
  }

  const MARKETS = 'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts,pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles,batter_triples,batter_hits,player_fantasy_points';

  let rows = [];
  rows.push('id,commence_time,bookmaker,last_update,home_team,away_team,market,label,description,price,point');

  // Step 1: Get list of games
  const eventsUrl = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds?apiKey=${API_KEY}&regions=us,us2,us_dfs,us_ex&markets=h2h&oddsFormat=american&dateFormat=iso`;
  const eventsRes = await fetch(eventsUrl);
  if (!eventsRes.ok) {
    console.error('Failed to get events:', await eventsRes.text());
    return;
  }

  const events = await eventsRes.json();
  console.log(`✅ Found ${events.length} games`);

  // Step 2: Fetch props for each game
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

            // FIX: pitcher_record_a_win should always be 0.5
            if (market.key === 'pitcher_record_a_win') {
              pointValue = 0.5;
            }

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
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

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
