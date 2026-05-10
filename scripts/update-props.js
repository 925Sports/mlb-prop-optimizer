const fs = require('fs');

const API_KEY = process.env.ODDS_API_KEY;
const REGIONS = ['us,us2', 'us_dfs', 'us_ex'];
const MARKETS = 'batter_hits_runs_rbis,batter_singles,batter_walks,batter_strikeouts,pitcher_strikeouts,pitcher_record_a_win,pitcher_hits_allowed,pitcher_walks,pitcher_earned_runs,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,pitcher_outs,batter_home_runs,batter_doubles,batter_triples,batter_hits,player_fantasy_points';

let allProps = [];

async function fetchRegion(region) {
  const base = `https://api.the-odds-api.com/v4/sports/baseball_mlb`;
  const params = `apiKey=${API_KEY}&regions=${region}&markets=${MARKETS}&oddsFormat=american&dateFormat=iso`;

  // Get list of games
  const eventsRes = await fetch(`${base}/odds?${params}&markets=h2h`);
  const events = await eventsRes.json();

  for (const event of events.slice(0, 12)) {   // limit to avoid rate limits
    try {
      const res = await fetch(`${base}/events/${event.id}/odds?${params}`);
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
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
}

for (const r of REGIONS) {
  await fetchRegion(r);
}

// Save the data
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/props.json', JSON.stringify(allProps, null, 2));

console.log(`✅ Successfully saved ${allProps.length} MLB props to data/props.json`);
