import fetch from 'node-fetch';

const testWP = async () => {
  const url = 'https://mirajnewsnow.com/wp-json/wp/v2/posts?per_page=1';
  const user = 'Abid';
  const pass = 'r1lA tOKt 6MUY JS2J 6Qqy 29ag';
  
  console.log(`Testing Public API: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Public API Status: ${res.status}`);
    const data = await res.json().catch(() => null);
    if (data) console.log(`Public Data snippet:`, JSON.stringify(data).substring(0, 100));
    else console.log('Public Data: No JSON');
  } catch (e: any) {
    console.log(`Public API Error: ${e.message}`);
  }

  console.log(`\nTesting Authenticated API: ${url}`);
  const authHeader = Buffer.from(`${user}:${pass}`).toString('base64');
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });
    console.log(`Auth API Status: ${res.status}`);
    const data = await res.json().catch(() => null);
    if (data) console.log(`Auth Data snippet:`, JSON.stringify(data).substring(0, 100));
    else console.log('Auth Data: No JSON');
  } catch (e: any) {
    console.log(`Auth API Error: ${e.message}`);
  }
};

testWP();
