
import http from 'http';

const API_BASE = process.env.API_URL || 'http://localhost:5000';
const ENDPOINTS = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/user', method: 'GET', auth: true },
    { path: '/api/patients', method: 'GET', auth: true },
    { path: '/api/appointments', method: 'GET', auth: true },
    { path: '/api/login', method: 'POST', body: { username: 'test', password: 'test' } },
];

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = `${API_BASE}${endpoint.path}`;
        console.log(`Testing ${endpoint.method} ${url}...`);

        const options = {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`  Response: ${res.statusCode}`);
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    console.log(`  ✅ Success`);
                } else if (res.statusCode === 401 && endpoint.auth) {
                    console.log(`  ✅ Expected 401 (Auth Required)`);
                } else {
                    console.log(`  ❌ Failed: ${data.substring(0, 100)}`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`  ❌ Connection Error: ${e.message}`);
            resolve();
        });

        if (endpoint.body) {
            req.write(JSON.stringify(endpoint.body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🚀 Starting API Endpoint Tests...');
    for (const endpoint of ENDPOINTS) {
        await testEndpoint(endpoint);
    }
    console.log('\n🏁 Tests Finished.');
}

runTests();
