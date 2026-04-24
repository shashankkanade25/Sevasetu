const fs = require('fs');
const http = require('http');

// Create a test CSV in the backend folder itself
const testCSV = `title,location,priority,affected_people,category
Drought Relief Support,Solapur,High,400,Water Crisis
Flood Rescue Operations,Pune,Urgent,1200,Disaster Relief
Medical Camp Required,Nashik,High,300,Healthcare
Food Distribution Drive,Mumbai,Urgent,800,Food Crisis
School Infrastructure Repair,Aurangabad,Medium,200,Education
`;

const tmpCsvPath = __dirname + '/tmp_test.csv';
fs.writeFileSync(tmpCsvPath, testCSV);

function uploadFile(filePath, filename, label) {
  return new Promise((resolve) => {
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary7MA4YWxkTrZu0gW';
    const ext = filename.split('.').pop().toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf' : 'text/csv';

    const pre = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n' +
      'Content-Type: ' + mimeType + '\r\n\r\n'
    );
    const post = Buffer.from('\r\n--' + boundary + '--\r\n');
    const body = Buffer.concat([pre, fileData, post]);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/upload-issues',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        console.log('\n=== ' + label + ' (HTTP ' + res.statusCode + ') ===');
        try {
          console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch (_) {
          console.log(data);
        }
        resolve();
      });
    });
    req.on('error', (e) => { console.error(label + ' request error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  // Test CSV
  await uploadFile(tmpCsvPath, 'test_issues.csv', 'CSV UPLOAD');
  try { fs.unlinkSync(tmpCsvPath); } catch (_) {}

  // Test PDF if available
  const pdfPath = 'C:/Users/shash/Downloads/sevasetu_issues_sample.pdf';
  if (fs.existsSync(pdfPath)) {
    await uploadFile(pdfPath, 'sevasetu_issues_sample.pdf', 'PDF UPLOAD');
  } else {
    console.log('\n[PDF] File not found at', pdfPath, '- skipping PDF test');
  }

  console.log('\nDone.');
  process.exit(0);
})();
