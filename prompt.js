const fs = require('fs');
var conversationHistory ="";
function promptFormat(systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = '';
    let embedding = `${context ? `\n Context: '${context}'` : ""}`; 
    if (isFirstMessage) {
        // For the first message, include the system prompt
        formattedPrompt = `
        <|im_start|>system
        ${systemPrompt}<|im_end|>
        <|im_start|>user
        ${userPrompt}  ${embedding} <|im_end|>
        <|im_start|>assistant
        `;
        // Initialize conversation history
        conversationHistory = formattedPrompt;
    } else {
        // For subsequent messages, append to the conversation history
        formattedPrompt = `
        <|im_start|>user
        ${userPrompt} ${embedding} <|im_end|>
        <|im_start|>assistant
        `;
        // Update conversation history
        conversationHistory += formattedPrompt;
    }
    //fs.writeFileSync('conversation_history.txt', conversationHistory, 'utf8');
    console.log(conversationHistory);
    return formattedPrompt;
}

// const systemPrompt = "You are a helpful assistant.";
// const userPrompt = "What is the capital of France?";
// const context = "";
// console.log(promptFormat(systemPrompt, userPrompt, context, true))
try {
    module.exports = exports = promptFormat;
  } catch (e) {}