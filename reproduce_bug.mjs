import axios from 'axios';

async function reproduce() {
    const baseURL = 'http://localhost:3000/api'; // Adjust based on your setup
    
    // 1. Login to get token
    console.log('Logging in...');
    try {
        const loginRes = await axios.post(`${baseURL}/v1/auth/login`, {
            username: 'testuser',
            password: 'password123'
        });
        const token = loginRes.data.data.accessToken;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Create a note
        console.log('Creating a note...');
        const createRes = await axios.post(`${baseURL}/v1/notes`, {
            title: 'Repro Note',
            color: 'blue'
        }, config);
        const noteId = createRes.data.data.id;
        console.log(`Created note with ID: ${noteId}`);

        // 3. Start the note (draft -> in_progress)
        console.log('Starting note...');
        await axios.patch(`${baseURL}/v1/notes/${noteId}/status`, { status: 'in_progress' }, config);
        
        // 4. Complete the note (in_progress -> completed)
        console.log('Completing note...');
        const completeRes = await axios.patch(`${baseURL}/v1/notes/${noteId}/status`, { status: 'completed' }, config);
        
        console.log('Result:', completeRes.data);
        if (completeRes.data.data.status === 'completed') {
            console.log('SUCCESS: Note status is completed');
        } else {
            console.log('FAILURE: Note status is NOT completed');
        }

    } catch (error) {
        console.error('Error during reproduction:', error.response?.data || error.message);
    }
}

reproduce();
