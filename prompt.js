function prmt()  {}

prmt.conversationHistory = "";

prmt.promptFormatCML = function (systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = "";
    let embedding = `${context ? `\n Context: '${context}'` : ""}`;
    formattedPrompt = `
    <|im_start|>system
    ${systemPrompt}<|im_end|>
    <|im_start|>user
    ${userPrompt}  ${embedding} <|im_end|>
    <|im_start|>assistant
    `;
    this.conversationHistory = formattedPrompt;
    return formattedPrompt;
}


prmt.promptFormatLAMA3 = function (systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = "";
    let embedding = `${context ? `\n Context: '${context}'` : ""}`;
    formattedPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userPrompt}  ${embedding}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
    this.conversationHistory += formattedPrompt;
    return formattedPrompt;
}

prmt.promptFormatNONE= function (systemPrompt, userPrompt, context, isFirstMessage = false) {
    let formattedPrompt = "";
    let embedding = `${context ? `\n Context: '${context}'` : ""}`;
    formattedPrompt = `
    ${systemPrompt}
    ${userPrompt}  ${embedding}`;
    this.conversationHistory = formattedPrompt;
    return formattedPrompt;
}

  try {
    module.exports = exports = prmt;
  } catch (e) {}
  