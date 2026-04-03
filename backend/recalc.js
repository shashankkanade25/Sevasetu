fetch('http://localhost:3000/recalculate-priorities', {method: 'POST'}).then(r=>r.json()).then(console.log)
