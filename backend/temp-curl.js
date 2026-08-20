const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'abdulhameethu.m@gmail.com',
      password: 'password123'
    });
    const token = loginRes.data.data.token || loginRes.data.token;
    
    const orderRes = await axios.get('http://localhost:5000/api/v1/orders/customer/6a85d7cf4029bae6d51c148f', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const order = orderRes.data.data || orderRes.data;
    console.log('API FETCH RETURN ELIGIBLE:', order.returnEligible);
    console.log('API FETCH MSG:', order.returnEligibilityMessage);
  } catch(e) {
    console.log('Error', e.response?.data || e.message);
  }
}
run();
