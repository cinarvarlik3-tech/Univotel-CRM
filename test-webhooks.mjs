import crypto from 'crypto';

const CHATWOOT_SECRET = 'uvqk2haMGnrbh5funvbwbw6y';
const NETGSM_TOKEN = 'ghNMcGYNpha4tTy2VwwKqeCjWeOqnerQqK45UsAas9kk';

async function sendChatwootWebhook(name, payload) {
  const url = 'http://localhost:3000/api/webhooks/chatwoot';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify(payload);

  // Create HMAC-SHA256
  const hmac = crypto.createHmac('sha256', CHATWOOT_SECRET);
  hmac.update(`${timestamp}.${rawBody}`);
  const signature = `sha256=${hmac.digest('hex')}`;

  console.log(`\n--- Sending Chatwoot Test: ${name} ---`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-chatwoot-signature': signature,
        'x-chatwoot-timestamp': timestamp,
      },
      body: rawBody,
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Response: ${await res.text()}`);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function sendNetGsmWebhook(name, payload) {
  const url = 'http://localhost:3000/api/webhooks/netgsm';
  const rawBody = JSON.stringify(payload);

  console.log(`\n--- Sending NetGSM Test: ${name} ---`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: rawBody,
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Response: ${await res.text()}`);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function main() {
  // 1. Chatwoot Incoming Message
  await sendChatwootWebhook('Incoming Message (Start Conversation)', {
    event: 'message_created',
    id: 10001,
    message_type: 'incoming',
    conversation: {
      id: 999,
    },
    message: {
      id: 5001,
      content: 'Merhaba, yurt fiyatlarınız nedir?',
      created_at: Math.floor(Date.now() / 1000),
      private: false,
      sender: {
        id: 123,
        name: 'Ahmet Öğrenci',
        type: 'contact',
      },
    },
    contact: {
      phone_number: '+905554443322',
      name: 'Ahmet Öğrenci',
    },
  });

  // Wait a moment
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Chatwoot Outgoing Message
  await sendChatwootWebhook('Outgoing Message (Agent Reply)', {
    event: 'message_created',
    id: 10002,
    message_type: 'outgoing',
    conversation: {
      id: 999,
    },
    message: {
      id: 5002,
      content: 'Merhaba Ahmet, fiyat listemiz şöyledir...',
      created_at: Math.floor(Date.now() / 1000),
      private: false,
      sender: {
        id: 1,
        name: 'Agent 1',
        type: 'user',
      },
    },
  });

  // Wait a moment
  await new Promise((r) => setTimeout(r, 1000));

  // 3. NetGSM CDR (Şirket hattını arıyor)
  await sendNetGsmWebhook('NetGSM CDR (Inbound Call to Company)', {
    Scenario: 'CDR',
    token: NETGSM_TOKEN,
    arayan_no: '05554443322', // Az önceki lead'in numarası
    aranan_no: '02129095244', // COMPANY_PHONE_NUMBER
    sure: 125,
    kimlik: `netgsm_test_${Date.now()}`,
  });
}

main();
