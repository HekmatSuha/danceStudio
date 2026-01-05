const axios = require('axios');

async function register() {
  try {
    const res = await axios.post('https://dance.arlidi.dev/api/v1/auth/registration/', {
      email: 'owner@dance.com',
      username: 'owner@dance.com',
      password: 'OwnerPass123!',
      first_name: 'Test',
      last_name: 'Owner',
      role: 'STUDIO_OWNER',
      gender: 'M',
      phone_number: '+1234567890'
    });
    console.log('User created:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

register();