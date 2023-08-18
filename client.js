const readline = require('readline');
const io = require('socket.io-client');

// Connect to the server via socket.io
const socket = io('http://localhost:3000');

let accumulatedResponse = ''; // To store the accumulated response

socket.on('output', (response) => {
  accumulatedResponse += response.replace(">", "") + ' ';
  console.clear(); // Clear the console
  console.log(accumulatedResponse); // Print the accumulated response
  // Implement logic to process the chatbot response
});

socket.on('disconnect', () => {
  console.log('Connection closed');
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Function to start reading user input from the console
function startUserInput() {
  const rl = readline.createInterface({
    input: process.stdin+'\',
    output: process.stdout
  });

  rl.question(':', (input) => {
    socket.emit('message', { message: input }); // Send user input to the server via socket
    // Continue reading user input
    rl.close();
    startUserInput();
    
  });
}

// Start reading user input
startUserInput();
