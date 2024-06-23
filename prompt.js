function prmt()  {}

prmt.conversationHistory = "";
prmt.promptFormatLAMA = function(systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = "";
    let embedding = `${context ? `\n Context: '${context}'` : ""}`;
    if (isFirstMessage) {
    formattedPrompt =`
    <|begin_of_text|><|start_header_id|>system<|end_header_id|>
    ${systemPrompt}<|eot_id|>
    <|start_header_id|>user<|end_header_id|>
    ${userPrompt}  ${embedding} <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    `;
    this.conversationHistory = formattedPrompt;
    } else {
    formattedPrompt =`
    <|begin_of_text|><|start_header_id|>user<|end_header_id|>
    ${userPrompt} ${embedding} <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    `;
    this.conversationHistory += formattedPrompt;
    }
    return formattedPrompt;
}

prmt.promptFormatCML = function (systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = "";
    let embedding = `${this.context ? `\n Context: '${this.context}'` : ""}`;
    if (isFirstMessage) {
    formattedPrompt = `
    <|im_start|>system
    ${systemPrompt}<|im_end|>
    <|im_start|>user
    ${userPrompt}  ${embedding} <|im_end|>
    <|im_start|>assistant
    `;

    this.conversationHistory = formattedPrompt;
    } else {
        formattedPrompt = `
        <|im_start|>user
        ${userPrompt} ${embedding} <|im_end|>
        <|im_start|>assistant
        `;
    this.conversationHistory += formattedPrompt;
    }
    return formattedPrompt;
}

  
  try {
    module.exports = exports = prmt;
  } catch (e) {}
  